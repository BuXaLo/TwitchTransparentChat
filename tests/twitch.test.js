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
