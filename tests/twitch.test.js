'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeTestSequence } = require('../twitch');

test('makeTestSequence формирует сообщения, события и удаление для нормализованного канала', () => {
  const sequence = makeTestSequence('  @Some_Channel  ');

  assert.equal(sequence.length, 15);
  assert.equal(sequence[0].delay, 0);
  assert.equal(sequence.at(-1).delay, 2200);

  const messages = sequence.filter((step) => step.msg);
  const notices = messages.filter((step) => step.msg.isNotice);
  const chats = messages.filter((step) => step.msg.id);

  assert.equal(notices.length, 5);
  assert.equal(chats.length, 9);
  assert.ok(notices.every((step) => step.msg.force === true));
  assert.ok(chats.every((step) => step.msg.id.startsWith('test-')));
  assert.ok(chats.every((step) => step.msg.mentionNick === 'some_channel'));

  assert.ok(chats.some((step) => step.msg.isMention));
  assert.ok(chats.some((step) => step.msg.isReward));
  assert.ok(chats.some((step) => step.msg.isAction));
  assert.ok(chats.every((step) => typeof step.msg.rewardIconUrl === 'string'));

  const removal = sequence.at(-1).remove;
  assert.deepEqual(removal, { id: chats.at(-1).msg.id });
});

test('makeTestSequence использует streamer для некорректного имени канала', () => {
  const sequence = makeTestSequence('invalid channel');
  const chat = sequence.find((step) => step.msg && step.msg.id);

  assert.equal(chat.msg.mentionNick, 'streamer');
});



test('connectTwitch разбирает реальные IRC-строки PRIVMSG, USERNOTICE и события удаления'() => {
  const { EventEmitter } = require('node:events');
  const net = require('node:net');
  const tls = require('node:tls');
  const emotes = require('../emotes');

  class FakeSocket extends EventEmitter {
    constructor() { super(); this.destroyed = false; this.writes = []; }
    setTimeout() {}
    setKeepAlive() {}
    setNoDelay() {}
    write(value) { this.writes.push(value); return true; }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.emit('close');
    }
  }

  const originalNetConnect = net.connect;
  const originalTlsConnect = tls.connect;
  const originals = {
    setNetwork: emotes.setNetwork,
    ensureGlobalEmotes: emotes.ensureGlobalEmotes,
    ensureChannelEmotes: emotes.ensureChannelEmotes,
    renderTwitchEmotes: emotes.renderTwitchEmotes,
    imgUrl: emotes.imgUrl
  };
  const rawSocket = new FakeSocket();
  const ircSocket = new FakeSocket();
  const messages = [];
  const removals = [];
  const statuses = [];

  net.connect = (_options, callback) => { setImmediate(callback); return rawSocket; };
  tls.connect = (_options, callback) => { setImmediate(callback); return ircSocket; };
  emotes.setNetwork = () => {};
  emotes.ensureGlobalEmotes = () => {};
  emotes.ensureChannelEmotes = (id) => { statuses.push(['room', id]); };
  emotes.renderTwitchEmotes = (text) => text;
  emotes.imgUrl = (url) => url;

  try {
    const { connectTwitch, disconnectTwitch } = require('../twitch');
    connectTwitch({
      channel: 'MyChannel',
      onMessage: (message) => messages.push(message),
      onRemove: (event) => removals.push(event),
      onError: (error) => { throw new Error(error); },
      onStatus: (status, state) => statuses.push([status, state])
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(ircSocket.writes.includes('JOIN #mychannel\\r\\n'));

    ircSocket.emit('data', Buffer.from(
      '@id=msg-1;user-id=42;display-name=Viewer;color=#123456;badges=moderator/1;custom-reward-id=reward-1 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #mychannel :hello @mychannel'
    ));
    ircSocket.emit('data', Buffer.from('\\r\\n' +
      '@msg-id=resub;display-name=Supporter;msg-param-sub-plan=2000;msg-param-cumulative-months=12 :tmi.twitch.tv USERNOTICE #mychannel :thanks\\r\\n' +
      '@target-msg-id=msg-1 :tmi.twitch.tv CLEARMSG #mychannel :hello\\r\\n' +
      '@target-user-id=42 :tmi.twitch.tv CLEARCHAT #mychannel :viewer\\r\\n' +
      '@room-id=123 :tmi.twitch.tv ROOMSTATE #mychannel\\r\\n'
    ));

    assert.equal(messages.length, 2);
    const chat = messages[0];
    assert.equal(chat.id, 'msg-1');
    assert.equal(chat.login, 'viewer');
    assert.equal(chat.userId, '42');
    assert.equal(chat.user, 'Viewer');
    assert.equal(chat.color, '#123456');
    assert.match(chat.badgesHtml, /chat-badge/);
    assert.equal(chat.html, 'hello @mychannel');
    assert.equal(chat.rawText, 'hello @mychannel');
    assert.equal(chat.isAction, false);
    assert.equal(chat.isReward, true);
    assert.equal(chat.isMention, true);
    assert.equal(chat.mentionNick, 'mychannel');
    assert.equal(chat.rewardIconUrl, 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png');
    assert.equal(messages[1].noticeType, 'resub');
    assert.equal(messages[1].months, 12);
    assert.deepEqual(removals, [{ id: 'msg-1' }, { login: 'viewer', userId: '42' }]);
    assert.deepEqual(statuses.find((entry) => entry[0] === 'room'), ['room', '123']);

    disconnectTwitch();
  } finally {
    net.connect = originalNetConnect;
    tls.connect = originalTlsConnect;
    Object.assign(emotes, originals);
  }
});
