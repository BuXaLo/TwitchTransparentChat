'use strict';

/**
 * Локализация (en / ru).
 * Используется в main-процессе напрямую (t), а в окно отдаётся через IPC (getStrings).
 */

const STRINGS = {
  en: {
    // --- Interface ---
    'ui.settings': '⚙ Settings',
    'ui.networkStatus': 'Connection status',
    'ui.language': 'Language:',
    'ui.channel': 'Twitch channel:',
    'ui.channelPlaceholder': 'e.g. shroud',
    'ui.useProxy': 'Use SOCKS5 proxy',
    'ui.proxyHost': 'IP / Host',
    'ui.proxyPort': 'Port',
    'ui.proxyUser': 'User (optional)',
    'ui.proxyPass': 'Pass (optional)',
    'ui.font': 'Font:',
    'ui.fontSystem': 'Default (System UI)',
    'ui.fontInter': 'Inter (Clean)',
    'ui.fontMontserrat': 'Montserrat (Gaming)',
    'ui.fontRoboto': 'Roboto',
    'ui.fontImpact': 'Impact (Bold)',
    'ui.align': 'Alignment:',
    'ui.alignLeft': 'Left',
    'ui.alignCenter': 'Center',
    'ui.alignRight': 'Right',
    'ui.fontSize': 'Font size:',
    'ui.bg': 'Message background:',
    'ui.lifetime': 'Hide after (sec, 0 = never):',
    'ui.animation': 'Appear animation:',
    'ui.animSlideLeft': 'Slide Left',
    'ui.animSlideDown': 'Slide Down',
    'ui.animFade': 'Fade',
    'ui.animZoom': 'Zoom',
    'ui.direction': 'Message flow:',
    'ui.dirTop': 'Newest on top',
    'ui.dirBottom': 'Newest at bottom',
    'ui.layout': 'Nickname layout:',
    'ui.layoutInline': 'Single line (Nick: text)',
    'ui.layoutBlock': 'Nick on its own line',
    'ui.hideCommands': 'Hide chat commands (starting with !)',
    'ui.mentionLonger': 'Keep mentions on screen twice as long',
    'ui.bots': 'Ignore list: bots and users (comma separated):',
    'ui.noticeSub': 'Show new subscriptions',
    'ui.noticeResub': 'Show resubscriptions',
    'ui.noticeGift': 'Show gifted subscriptions',
    'ui.noticeRaid': 'Show raids',
    'ui.save': 'Save and connect',
    'ui.test': 'Test messages',
    'ui.pointsAlt': 'Points',
    'ui.hotkeyBusy': 'Hotkey Ctrl+Alt+F9 is already used by another app!',

    // --- Chat events (compact lines) ---
    'notice.sub': '{user} subscribed ({tier})',
    'notice.resub': '{user} resubscribed ({tier}), months: {months}',
    'notice.gift': '{user} gifted a sub to {recipient} ({tier})',
    'notice.giftMass': '{user} gifted subs: {count} ({tier})',
    'notice.raid': '{user} raided, viewers: {viewers}',
    'notice.tier': 'Tier {n}',
    'notice.prime': 'Prime',

    // --- Status line (main process) ---
    'status.hint': 'Ctrl+Alt+F9: click-through mode',
    'status.watchdog': 'Connection stalled, resetting...',
    'status.noChannel': 'No channel set',
    'status.tls': 'TLS handshake...',
    'status.tlsTimeout': 'TLS timeout',
    'status.joining': 'Joining chat...',
    'status.twitchReconnect': 'Reconnecting at Twitch request...',
    'status.online': 'Online: #{channel}{proxy}',
    'status.networkError': 'Network error',
    'status.disconnected': 'Disconnected',
    'status.socks': 'Connecting via SOCKS5...',
    'status.proxyError': 'Proxy error',
    'status.direct': 'Connecting directly...',
    'status.timeout': 'Network timeout',
    'status.reconnect': 'Reconnecting in {sec}s (attempt {n})...',

    // --- Errors ---
    'err.tlsTimeout': 'TLS connection timeout',
    'err.network': 'Network error: {msg}',
    'err.proxy': 'Proxy error: {msg}',
    'err.timeout': 'Connection timeout',
    'err.connection': 'Connection error: {msg}',

    // --- Tray ---
    'tray.tooltip': 'Twitch Transparent Chat',
    'tray.show': 'Show overlay',
    'tray.hide': 'Hide overlay',
    'tray.clickThrough': 'Click-through mode (Ctrl+Alt+F9)',
    'tray.settings': 'Settings…',
    'tray.hideTaskbar': 'Hide from taskbar',
    'tray.quit': 'Quit',

    // --- Misc / test messages ---
    'common.anon': 'Anonymous',
    'test.msg1': 'Hey chat, this is a test message!',
    'test.msg2': 'Checking the font, outline and animation',
    'test.reward': 'Redeemed a reward with a message',
    'test.action': 'waves at everyone',
    'test.long': 'A long message to check how the text wraps inside the overlay window and how it looks next to emotes and badges.',
    'test.user1': 'TestViewer',
    'test.user2': 'TestModerator',
    'test.user3': 'TestSubscriber',
    'test.user4': 'TestRaider',
    'test.user5': 'TestVIP',
    'test.user6': 'TestTroll',
    'test.recipient': 'LuckyViewer',
    'test.mention': 'you were mentioned in chat!',
    'test.reply': 'this is a reply straight to you',
    'test.rewardMention': 'redeemed a reward and tagged you',
    'test.resub': 'Thanks for the great streams!',
    'test.spam': 'Spam that a moderator is about to delete'
  },

  ru: {
    // --- Interface ---
    'ui.settings': '⚙ Настройки',
    'ui.networkStatus': 'Статус сети',
    'ui.language': 'Язык:',
    'ui.channel': 'Канал Twitch:',
    'ui.channelPlaceholder': 'например, shroud',
    'ui.useProxy': 'Использовать SOCKS5 прокси',
    'ui.proxyHost': 'IP / Host',
    'ui.proxyPort': 'Port',
    'ui.proxyUser': 'User (опц.)',
    'ui.proxyPass': 'Pass (опц.)',
    'ui.font': 'Шрифт:',
    'ui.fontSystem': 'Стандартный (System UI)',
    'ui.fontInter': 'Inter (Четкий)',
    'ui.fontMontserrat': 'Montserrat (Игровой)',
    'ui.fontRoboto': 'Roboto',
    'ui.fontImpact': 'Impact (Плотный)',
    'ui.align': 'Выравнивание:',
    'ui.alignLeft': 'По левому краю',
    'ui.alignCenter': 'По центру',
    'ui.alignRight': 'По правому краю',
    'ui.fontSize': 'Размер шрифта:',
    'ui.bg': 'Фон плашки:',
    'ui.lifetime': 'Скрытие (сек, 0=нет):',
    'ui.animation': 'Анимация появления:',
    'ui.animSlideLeft': 'Slide Left (выезд слева)',
    'ui.animSlideDown': 'Slide Down (сверху)',
    'ui.animFade': 'Fade (проявление)',
    'ui.animZoom': 'Zoom (из центра)',
    'ui.direction': 'Поток сообщений:',
    'ui.dirTop': 'Новые сверху',
    'ui.dirBottom': 'Новые снизу',
    'ui.layout': 'Разделитель ника:',
    'ui.layoutInline': 'В одну строку (Ник: текст)',
    'ui.layoutBlock': 'Ник отдельной строкой',
    'ui.hideCommands': 'Скрывать команды чата (начинающиеся с !)',
    'ui.mentionLonger': 'Держать упоминания на экране вдвое дольше',
    'ui.bots': 'Игнор-лист: боты и пользователи (через запятую):',
    'ui.noticeSub': 'Показывать новые подписки',
    'ui.noticeResub': 'Показывать продления подписки',
    'ui.noticeGift': 'Показывать подаренные подписки',
    'ui.noticeRaid': 'Показывать рейды',
    'ui.save': 'Сохранить и подключиться',
    'ui.test': 'Тестовые сообщения',
    'ui.pointsAlt': 'Баллы',
    'ui.hotkeyBusy': 'Хоткей Ctrl+Alt+F9 занят другой программой!',

    // --- Chat events (compact lines) ---
    'notice.sub': '{user}: новая подписка ({tier})',
    'notice.resub': '{user}: продление подписки ({tier}), месяцев: {months}',
    'notice.gift': '{user} дарит подписку: {recipient} ({tier})',
    'notice.giftMass': '{user} дарит подписки: {count} ({tier})',
    'notice.raid': '{user}: рейд, зрителей: {viewers}',
    'notice.tier': 'Уровень {n}',
    'notice.prime': 'Prime',

    // --- Status line (main process) ---
    'status.hint': 'Ctrl+Alt+F9: сквозной режим',
    'status.watchdog': 'Связь зависла, сброс...',
    'status.noChannel': 'Канал не указан',
    'status.tls': 'Шифрование TLS...',
    'status.tlsTimeout': 'Таймаут TLS',
    'status.joining': 'Вход в чат...',
    'status.twitchReconnect': 'Переподключение по запросу Twitch...',
    'status.online': 'В сети: #{channel}{proxy}',
    'status.networkError': 'Ошибка сети',
    'status.disconnected': 'Отключено',
    'status.socks': 'SOCKS5 подключение...',
    'status.proxyError': 'Ошибка прокси',
    'status.direct': 'Прямое подключение...',
    'status.timeout': 'Таймаут сети',
    'status.reconnect': 'Реконнект через {sec}с (попытка {n})...',

    // --- Errors ---
    'err.tlsTimeout': 'Таймаут TLS-соединения',
    'err.network': 'Ошибка сети: {msg}',
    'err.proxy': 'Ошибка прокси: {msg}',
    'err.timeout': 'Таймаут соединения',
    'err.connection': 'Ошибка соединения: {msg}',

    // --- Tray ---
    'tray.tooltip': 'Twitch Transparent Chat',
    'tray.show': 'Показать оверлей',
    'tray.hide': 'Скрыть оверлей',
    'tray.clickThrough': 'Сквозной режим (Ctrl+Alt+F9)',
    'tray.settings': 'Настройки…',
    'tray.hideTaskbar': 'Скрыть с панели задач',
    'tray.quit': 'Выход',

    // --- Misc / test messages ---
    'common.anon': 'Аноним',
    'test.msg1': 'Привет, чат! Это тестовое сообщение!',
    'test.msg2': 'Проверяю шрифт, обводку и анимацию',
    'test.reward': 'Активировал награду с сообщением',
    'test.action': 'машет всем рукой',
    'test.long': 'Длинное сообщение, чтобы проверить, как текст переносится внутри окна оверлея и как он выглядит рядом со смайлами и бейджами.',
    'test.user1': 'ТестЗритель',
    'test.user2': 'ТестМодератор',
    'test.user3': 'ТестСаб',
    'test.user4': 'ТестРейдер',
    'test.user5': 'ТестВИП',
    'test.user6': 'ТестТролль',
    'test.recipient': 'СчастливыйЗритель',
    'test.mention': 'тебя упомянули в чате!',
    'test.reply': 'это ответ прямо тебе',
    'test.rewardMention': 'активировал награду и позвал тебя',
    'test.resub': 'Спасибо за классные стримы!',
    'test.spam': 'Спам, который сейчас удалит модератор'
  }
};

const SUPPORTED = Object.keys(STRINGS);
let current = 'en';

function setLang(lang) {
  if (STRINGS[lang]) current = lang;
  return current;
}

function getLang() {
  return current;
}

function getStrings(lang) {
  return STRINGS[lang] || STRINGS.en;
}

function t(key, params) {
  let s = STRINGS[current][key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) return key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
  }
  return s;
}

module.exports = { t, setLang, getLang, getStrings, SUPPORTED };
