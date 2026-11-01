/**
 * Отображение чата. Один и тот же код работает и в оверлее, и на странице виджета для OBS.
 *
 * Использование:
 * const view = ChatView.create({ chat: document.getElementById('chat') });
 * view.setStrings(strings); // строки интерфейса (нужны для событий чата)
 * view.applyConfig(config); // внешний вид и фильтры
 * view.addMessage(msg); // новое сообщение или событие
 * view.removeMessages(info); // удаление модератором
 */
(function (global) {
  'use strict';

  const MAX_DOM_MESSAGES = 150;
  const CHANNEL_POINTS_ICON_URL = 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png';
  const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Базовая тень для никнеймов с Twitch, когда кастомизация никнеймов выключена
  const DEFAULT_TWITCH_NICK_SHADOW =
    '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, ' +
    '-2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000, 0 2px 4px rgba(0, 0, 0, 0.9)';

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

  function parseHexRgb(hexStr) {
    let hex = String(hexStr || '').replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  function rgbaStr(hex, alpha) {
    const { r, g, b } = parseHexRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${Number(alpha).toFixed(2)})`;
  }

  // Осветление или затемнение цвета для монохромного градиента "По тону"
  function shiftTone(hex, delta) {
    const { r, g, b } = parseHexRgb(hex);
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return {
      r: clamp(r + delta),
      g: clamp(g + delta),
      b: clamp(b + delta)
    };
  }

  function buildPlateBackground(cfg) {
    const alpha = (cfg.bgOpacity !== undefined ? cfg.bgOpacity : 50) / 100;
    const mode = cfg.bgMode || 'solid';
    const c1 = cfg.bgColor1 || '#000000';
    const c2 = cfg.bgColor2 || '#251640';
    const dir = cfg.bgDirection || 'to right';

    if (mode === 'solid') {
      return rgbaStr(c1, alpha);
    }

    let startRgba;
    let endRgba;

    if (mode === 'grad-mono') {
      if (cfg.bgMonoMode === 'fade') {
        startRgba = rgbaStr(c1, alpha);
        endRgba = rgbaStr(c1, 0);
      } else {
        // По тону (Светлее <-> Темнее) без потери непрозрачности
        const light = shiftTone(c1, 38);
        const dark = shiftTone(c1, -28);
        startRgba = `rgba(${light.r}, ${light.g}, ${light.b}, ${alpha.toFixed(2)})`;
        endRgba = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${alpha.toFixed(2)})`;
      }
    } else {
      startRgba = rgbaStr(c1, alpha);
      endRgba = rgbaStr(c2, alpha);
    }

    if (dir === 'radial') {
      return `radial-gradient(circle at center, ${startRgba} 0%, ${endRgba} 100%)`;
    }
    return `linear-gradient(${dir}, ${startRgba} 0%, ${endRgba} 100%)`;
  }

  // Многовекторная тень для четкой окантовки (0..4px)
  function buildOutlineShadow(width, color) {
    const w = parseInt(width, 10) || 0;
    if (w <= 0) return 'none';
    const c = color || '#000000';
    const layers = [];
    for (let step = 1; step <= w; step++) {
      layers.push(
        `-${step}px -${step}px 0 ${c}`,
        `${step}px -${step}px 0 ${c}`,
        `-${step}px ${step}px 0 ${c}`,
        `${step}px ${step}px 0 ${c}`,
        `-${step}px 0 0 ${c}`,
        `${step}px 0 0 ${c}`,
        `0 -${step}px 0 ${c}`,
        `0 ${step}px 0 ${c}`
      );
    }
    layers.push('0 2px 4px rgba(0, 0, 0, 0.85)');
    return layers.join(', ');
  }

  // Перевод слайдера скорости 1..10 в множитель длительности анимации (1 = медленно, 5 = норма 1x, 10 = быстро)
  function speedToDurationMultiplier(speedVal) {
    const s = Math.max(1, Math.min(10, parseInt(speedVal, 10) || 5));
    return Number((5 / s).toFixed(2));
  }

  // Отрицательная задержка от глобальных часов страницы синхронизирует фазу анимации всех плашек
  function computeSyncDelaySeconds() {
    const nowMs = typeof performance !== 'undefined' && performance.now ? performance.now() : (Date.now() % 3600000);
    return `-${(nowMs / 1000).toFixed(3)}s`;
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

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

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

    function trf(key, params) {
      return tr(key).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m));
    }

    function setStrings(newStrings) {
      strings = newStrings || {};
    }

    /* ---------------- Настройки ---------------- */

    function updateIgnored(str) {
      ignoredSet = new Set(
        (str || '').split(',').map((s) => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
      );
    }

    function isIgnoredUser(msg) {
      if (!ignoredSet.size) return false;
      const login = (msg.login || '').toLowerCase();
      const name = (msg.user || '').toLowerCase();
      return (login && ignoredSet.has(login)) || ignoredSet.has(name);
    }

    function getPlateClasses() {
      const shape = config.plateShape === 'strict' ? 'strict' : 'rounded';
      const effect = config.borderEffect || 'static';
      const bw = parseInt(config.borderWidth, 10) || 0;
      const classes = [`shape-${shape}`];
      if (bw > 0 || effect !== 'static') {
        classes.push(`effect-${effect}`);
      }
      return classes;
    }

    function applySyncDelayToElement(el, syncEnabled, sharedSyncDelay) {
      if (syncEnabled) {
        el.style.setProperty('--effect-sync-delay', sharedSyncDelay || computeSyncDelaySeconds());
      } else {
        // Если синхронизация выключена, у каждой плашки сохраняется её собственный момент появления (0s от вставки)
        el.style.setProperty('--effect-sync-delay', '0s');
      }
    }

    function applyConfig(cfg) {
      const prevSync = !!config.borderEffectSync;
      const prevEffect = config.borderEffect;
      const prevSpeed = config.borderEffectSpeed;
      config = Object.assign({}, cfg);

      const fontSize = config.fontSize || 14;
      root.style.setProperty('--font-size', `${fontSize}px`);

      const bg = config.bgOpacity !== undefined ? config.bgOpacity : 50;
      root.style.setProperty('--bg-opacity', (bg / 100).toFixed(2));

      const family = !config.fontFamily || config.fontFamily === 'system' ? SYSTEM_FONT : config.fontFamily;
      root.style.setProperty('--font-family', family);
      root.style.setProperty('--text-align', config.textAlign || 'left');

      // Переменные плашки и рамки
      root.style.setProperty('--plate-bg', buildPlateBackground(config));

      const shape = config.plateShape === 'strict' ? 'strict' : 'rounded';
      const radius = shape === 'strict' ? '0px' : '6px';
      root.style.setProperty('--plate-radius', radius);

      const bw = parseInt(config.borderWidth, 10) || 0;
      const effect = config.borderEffect || 'static';
      const effectiveBw = bw === 0 && effect !== 'static' && effect !== 'cyber' ? 1 : bw;
      root.style.setProperty('--plate-border-width', `${effectiveBw}px`);
      root.style.setProperty('--plate-border-color', config.borderColor || '#9146FF');
      root.style.setProperty('--effect-speed-mult', String(speedToDurationMultiplier(config.borderEffectSpeed)));

      // Переменные текста сообщения (применяются ТОЛЬКО к .text-content)
      root.style.setProperty('--msg-text-color', config.textColor || '#FFFFFF');
      const textShadow = buildOutlineShadow(
        config.textOutlineWidth !== undefined ? config.textOutlineWidth : 2,
        config.textOutlineColor || '#000000'
      );
      root.style.setProperty('--msg-text-shadow', textShadow);

      // Переменные никнеймов: если кастомизация выключена, остаётся базовый стиль Twitch (DEFAULT_TWITCH_NICK_SHADOW)
      if (config.customNickEnabled) {
        const nickShadow = buildOutlineShadow(
          config.customNickOutlineWidth !== undefined ? config.customNickOutlineWidth : 2,
          config.customNickOutlineColor || '#000000'
        );
        root.style.setProperty('--nick-text-shadow', nickShadow);
      } else {
        root.style.setProperty('--nick-text-shadow', DEFAULT_TWITCH_NICK_SHADOW);
      }

      chat.className = `dir-${config.chatDirection || 'top'} layout-${config.layoutMode || 'inline'}`;
      updateIgnored(config.ignoredBots);

      // Обновляем уже существующие в DOM сообщения для мгновенного живого предпросмотра
      const plateClasses = getPlateClasses();
      const syncEnabled = !!config.borderEffectSync;
      const sharedSyncDelay = syncEnabled ? computeSyncDelaySeconds() : '0s';
      const needSyncUpdate = prevSync !== syncEnabled || prevEffect !== config.borderEffect || prevSpeed !== config.borderEffectSpeed;

      Array.from(chat.children).forEach((el, idx) => {
        if (el.classList.contains('is-notice')) return;
        el.classList.remove(
          'shape-rounded', 'shape-strict',
          'effect-static', 'effect-neon', 'effect-pulse', 'effect-rgb', 'effect-cyber', 'effect-breathing'
        );
        plateClasses.forEach((c) => el.classList.add(c));

        if (needSyncUpdate) {
          if (syncEnabled) {
            el.style.setProperty('--effect-sync-delay', sharedSyncDelay);
          } else {
            // При выключении синхронизации на уже висящих плашках возвращаем естественный сдвиг по порядку их прихода
            const createdOffset = el.dataset.createdSec ? parseFloat(el.dataset.createdSec) : idx * 0.45;
            const nowSec = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000;
            const individualDelay = -Math.max(0, nowSec - createdOffset);
            el.style.setProperty('--effect-sync-delay', `${individualDelay.toFixed(3)}s`);
          }
        }

        const userEl = el.querySelector('.username');
        if (userEl) {
          const origColor = userEl.dataset.origColor || '#9146FF';
          userEl.style.color = config.customNickEnabled
            ? (config.customNickColor || '#9146FF')
            : origColor;
        }
      });
    }

    /* ---------------- Список сообщений ---------------- */

    function enforceMessageLimit() {
      while (chat.children.length > MAX_DOM_MESSAGES) {
        chat.removeChild(chat.lastChild);
      }
      while (chat.scrollHeight > chat.clientHeight + 30 && chat.children.length > 1) {
        chat.removeChild(chat.lastChild);
      }
    }

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
      chat.prepend(el);
      enforceMessageLimit();
    }

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

      const highlight = !!msg.isMention && config.highlightMentions !== false;

      const el = document.createElement('div');
      const animClass = `anim-${config.animation || 'slide-left'}`;
      const rewardClass = msg.isReward ? 'is-reward' : '';
      const mentionClass = highlight ? 'is-mention' : '';
      const plateClasses = getPlateClasses().join(' ');
      el.className = `message ${animClass} ${plateClasses} ${rewardClass} ${mentionClass}`.trim();

      const nowSec = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000;
      el.dataset.createdSec = nowSec.toFixed(3);
      applySyncDelayToElement(el, !!config.borderEffectSync);

      if (msg.id) el.dataset.msgId = msg.id;
      if (msg.login) el.dataset.login = msg.login;
      if (msg.userId) el.dataset.userId = msg.userId;

      const rewardIcon = escapeHtml(msg.rewardIconUrl || CHANNEL_POINTS_ICON_URL);
      const rewardBadgeHtml = msg.isReward
        ? `<img class="reward-icon" src="${rewardIcon}" alt="${escapeHtml(tr('ui.pointsAlt'))}" onerror="this.style.display='none'" />`
        : '';

      const safeUser = escapeHtml(msg.user);
      const twitchReadableColor = ensureReadableColor(msg.color);
      const nickColor = config.customNickEnabled
        ? (config.customNickColor || '#9146FF')
        : twitchReadableColor;

      const safeBadges = msg.badgesHtml || '';
      // Действия /me сохраняют цвет автора и курсив, не перебиваясь общим цветом текста
      const actionStyle = msg.isAction ? `style="color: ${twitchReadableColor}; font-style: italic;"` : '';

      el.innerHTML = `
        <span class="author-wrap">
          ${rewardBadgeHtml}
          ${safeBadges}
          <span class="username" data-orig-color="${escapeHtml(twitchReadableColor)}" style="color: ${escapeHtml(nickColor)}">${safeUser}</span><span class="colon">:</span>
        </span>
        <span class="text-content" ${actionStyle}>${msg.html}</span>
      `;

      if (highlight) highlightMentions(el.querySelector('.text-content'), msg.mentionNick);

      insertMessage(el);
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
