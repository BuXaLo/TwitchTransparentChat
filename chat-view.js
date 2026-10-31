/**
 * Отображение чата. Один и тот же код работает и в оверлее, и на странице виджета для OBS.
 *
 * Использование:
 *   const view = ChatView.create({ chat: document.getElementById('chat') });
 *   view.setStrings(strings);       // строки интерфейса (нужны для событий чата)
 *   view.applyConfig(config);       // внешний вид и фильтры
 *   view.addMessage(msg);           // новое сообщение или событие
 *   view.removeMessages(info);      // удаление модератором
 */
(function (global) {
  'use strict';

  const MAX_DOM_MESSAGES = 150;
  const CHANNEL_POINTS_ICON_URL = 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png';
  const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const NOTICE_ICONS = { sub: '⭐', resub: '🔁', gift: '🎁', raid: '🚀' };
  const NOTICE_SETTING_BY_TYPE = { sub: 'showSub', resub: 'showResub', gift: 'showGift', raid: 'showRaid' };

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // Автоматическое осветление слишком тёмных/серых ников для читаемости на чёрной обводке
  function ensureReadableColor(rawColor) {
    let hex = (rawColor || '').replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return '#9146FF';
    }

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Воспринимаемая яркость по W3C
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Если яркость ниже порога (сливается с чёрной обводкой), подтягиваем к читаемому спектру
    if (luminance < 115) {
      const factor = (115 - luminance) / 145;
      r = Math.min(255, Math.round(r + (255 - r) * factor * 0.75 + 45));
      g = Math.min(255, Math.round(g + (255 - g) * factor * 0.75 + 45));
      b = Math.min(255, Math.round(b + (255 - b) * factor * 0.75 + 45));
      return `rgb(${r}, ${g}, ${b})`;
    }

    return `#${hex}`;
  }

  function create(options) {
    const chat = options.chat;
    const root = options.root || document.documentElement;

    let config = {};
    let strings = {};
    let ignoredSet = new Set();

    /* ---------------- Строки ---------------- */

    function tr(key) {
      return strings[key] !== undefined ? strings[key] : key;
    }

    // Перевод с подстановкой {name}. Значения вставляются как есть: экранирование HTML на вызывающем
    function trf(key, params) {
      return tr(key).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m));
    }

    function setStrings(newStrings) {
      strings = newStrings || {};
    }

    /* ---------------- Настройки ---------------- */

    // Игнор-лист: логины или имена через запятую, регистр и «@» не важны
    function updateIgnored(str) {
      ignoredSet = new Set(
        (str || '').split(',').map((s) => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
      );
    }

    // Сверяем с логином (он стабильнее отображаемого имени, особенно для кириллицы) и с именем
    function isIgnoredUser(msg) {
      if (!ignoredSet.size) return false;
      const login = (msg.login || '').toLowerCase();
      const name = (msg.user || '').toLowerCase();
      return (login && ignoredSet.has(login)) || ignoredSet.has(name);
    }

    function applyConfig(cfg) {
      config = Object.assign({}, cfg);

      const fontSize = config.fontSize || 14;
      root.style.setProperty('--font-size', `${fontSize}px`);

      const bg = config.bgOpacity !== undefined ? config.bgOpacity : 50;
      root.style.setProperty('--bg-opacity', (bg / 100).toFixed(2));

      const family = !config.fontFamily || config.fontFamily === 'system' ? SYSTEM_FONT : config.fontFamily;
      root.style.setProperty('--font-family', family);

      root.style.setProperty('--text-align', config.textAlign || 'left');

      chat.className = `dir-${config.chatDirection || 'top'} layout-${config.layoutMode || 'inline'}`;
      updateIgnored(config.ignoredBots);
    }

    /* ---------------- Список сообщений ---------------- */

    function enforceMessageLimit() {
      // 1. Ограничение по максимальному числу элементов в памяти
      while (chat.children.length > MAX_DOM_MESSAGES) {
        chat.removeChild(config.chatDirection === 'bottom' ? chat.firstChild : chat.lastChild);
      }

      // 2. Очистка старых сообщений, вышедших за видимую область контейнера
      while (chat.scrollHeight > chat.clientHeight + 30 && chat.children.length > 1) {
        chat.removeChild(config.chatDirection === 'bottom' ? chat.firstChild : chat.lastChild);
      }
    }

    // factor — множитель времени жизни (2 для упоминаний, если включено «держать дольше»)
    function scheduleRemoval(element, factor = 1) {
      const lifetime = config.messageLifetime;
      if (!lifetime || lifetime <= 0) return;

      setTimeout(() => {
        element.classList.add('fade-out');
        setTimeout(() => {
          if (element.parentNode) element.parentNode.removeChild(element);
        }, 800);
      }, lifetime * factor * 1000);
    }

    function insertMessage(el) {
      if (config.chatDirection === 'bottom') {
        chat.appendChild(el);
      } else {
        chat.prepend(el);
      }
      enforceMessageLimit();
    }

    // Подсвечиваем «@ник» внутри текста сообщения, не трогая теги смайлов
    function highlightMentions(rootEl, nick) {
      if (!rootEl || !nick) return;
      const re = new RegExp('(?<![A-Za-z0-9_])@' + escapeRegExp(nick) + '(?![A-Za-z0-9_])', 'gi');
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      for (const node of nodes) {
        const textValue = node.nodeValue;
        re.lastIndex = 0;
        if (!re.test(textValue)) continue;

        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let m;
        while ((m = re.exec(textValue)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(textValue.slice(last, m.index)));
          const span = document.createElement('span');
          span.className = 'mention-tag';
          span.textContent = m[0];
          frag.appendChild(span);
          last = m.index + m[0].length;
        }
        if (last < textValue.length) frag.appendChild(document.createTextNode(textValue.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    }

    /* ---------------- События чата (подписки, подарки, рейды) ---------------- */

    function tierLabel(code) {
      const c = String(code || '').toLowerCase();
      if (c === 'prime') return tr('notice.prime');
      const n = Math.round(parseInt(c, 10) / 1000);
      return trf('notice.tier', { n: n >= 1 && n <= 3 ? n : 1 });
    }

    function renderNotice(msg) {
      const settingKey = NOTICE_SETTING_BY_TYPE[msg.noticeType];
      if (!settingKey) return;
      // Тестовые события (force) показываем всегда, чтобы их можно было оценить при любых настройках
      if (!msg.force && !config[settingKey]) return;

      let key;
      switch (msg.noticeType) {
        case 'sub': key = 'notice.sub'; break;
        case 'resub': key = 'notice.resub'; break;
        case 'gift': key = msg.isMassGift ? 'notice.giftMass' : 'notice.gift'; break;
        default: key = 'notice.raid';
      }

      const line = trf(key, {
        user: `<span class="notice-user">${escapeHtml(msg.user)}</span>`,
        tier: escapeHtml(tierLabel(msg.tier)),
        months: escapeHtml(String(msg.months || 0)),
        count: escapeHtml(String(msg.count || 0)),
        recipient: `<span class="notice-user">${escapeHtml(msg.recipient || '')}</span>`,
        viewers: escapeHtml(String(msg.viewers || 0))
      });

      const el = document.createElement('div');
      el.className = `message anim-${config.animation || 'slide-left'} is-notice`;
      el.innerHTML =
        `<span class="notice-icon">${NOTICE_ICONS[msg.noticeType]}</span>${line}` +
        (msg.html ? ` <span class="notice-msg">${msg.html}</span>` : '');

      insertMessage(el);
      scheduleRemoval(el);
    }

    /* ---------------- Удаление сообщений модератором ---------------- */

    function removeMessageElement(el) {
      if (el.dataset.removing) return;
      el.dataset.removing = '1';
      el.style.transitionDuration = '0.2s';
      el.classList.add('fade-out');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }

    // info: { id } — удалено одно сообщение; { login, userId } — бан/таймаут; { all: true } — чат очищен
    function removeMessages(info) {
      if (!info) return;
      Array.from(chat.children).forEach((el) => {
        if (info.all) {
          removeMessageElement(el);
        } else if (info.id) {
          if (el.dataset.msgId === info.id) removeMessageElement(el);
        } else if (
          (info.userId && el.dataset.userId === info.userId) ||
          (info.login && el.dataset.login === info.login)
        ) {
          removeMessageElement(el);
        }
      });
    }

    /* ---------------- Обычные сообщения ---------------- */

    function addMessage(msg) {
      if (msg.isNotice) {
        renderNotice(msg);
        return;
      }

      if (isIgnoredUser(msg)) return;
      if (config.hideCommands && msg.rawText && msg.rawText.trim().startsWith('!')) return;

      // Подсветка упоминаний и ответов включается настройкой (по умолчанию включена)
      const highlight = !!msg.isMention && config.highlightMentions !== false;

      const el = document.createElement('div');
      const animClass = `anim-${config.animation || 'slide-left'}`;
      const rewardClass = msg.isReward ? 'is-reward' : '';
      const mentionClass = highlight ? 'is-mention' : '';
      el.className = `message ${animClass} ${rewardClass} ${mentionClass}`;

      // Нужны для удаления сообщений после бана/удаления модератором
      if (msg.id) el.dataset.msgId = msg.id;
      if (msg.login) el.dataset.login = msg.login;
      if (msg.userId) el.dataset.userId = msg.userId;

      const rewardIcon = escapeHtml(msg.rewardIconUrl || CHANNEL_POINTS_ICON_URL);
      const rewardBadgeHtml = msg.isReward
        ? `<img class="reward-icon" src="${rewardIcon}" alt="${escapeHtml(tr('ui.pointsAlt'))}" onerror="this.style.display='none'" />`
        : '';

      const safeUser = escapeHtml(msg.user);
      const readableColor = ensureReadableColor(msg.color);
      const safeBadges = msg.badgesHtml || '';
      const actionStyle = msg.isAction ? `style="color: ${readableColor}; font-style: italic;"` : '';

      el.innerHTML = `
        <span class="author-wrap">
          ${rewardBadgeHtml}
          ${safeBadges}
          <span class="username" style="color: ${readableColor}">${safeUser}</span><span class="colon">:</span>
        </span>
        <span class="text-content" ${actionStyle}>${msg.html}</span>
      `;

      if (highlight) highlightMentions(el.querySelector('.text-content'), msg.mentionNick);

      insertMessage(el);
      // «Держать дольше» работает только вместе с подсветкой
      scheduleRemoval(el, highlight && config.mentionLonger ? 2 : 1);
    }

    function clear() {
      while (chat.firstChild) chat.removeChild(chat.firstChild);
    }

    return {
      setStrings,
      applyConfig,
      addMessage,
      removeMessages,
      clear,
      getConfig: () => config
    };
  }

  global.ChatView = { create, escapeHtml, ensureReadableColor };
})(typeof window !== 'undefined' ? window : globalThis);
