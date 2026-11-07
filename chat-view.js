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

  // Описание анимаций появления для Web Animations API.
  // Параметры: длительность (мс), easing и keyframes. Не зависят от CSS-классов, поэтому
  // не конфликтуют с бесконечными эффектами рамки на .message.
  // y-dir учитывает направление потока: при dir-bottom новая плашка физически оказывается снизу,
  // поэтому вертикальные смещения инвертируются.
  const APPEAR_ANIMATIONS = {
    'fade':         { ms: 500, easing: 'ease-out', kf: [{ opacity: 0 }, { opacity: 1 }] },
    'slide-left':   { ms: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [
                        { opacity: 0, transform: 'translateX(-42px)' },
                        { opacity: 1, transform: 'translateX(0)' }] },
    'slide-down':   { ms: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', yDir: -1, kf: [
                        { opacity: 0, transform: 'translateY(-36px)' },
                        { opacity: 1, transform: 'translateY(0)' }] },
    'zoom':         { ms: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [
                        { opacity: 0, transform: 'scale(0.7)' },
                        { opacity: 1, transform: 'scale(1)' }] },
    'spring-pop':   { ms: 620, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', kf: [
                        { opacity: 0, transform: 'scale(0.4)' },
                        { opacity: 1, transform: 'scale(1.08)', offset: 0.7 },
                        { opacity: 1, transform: 'scale(1)' }] },
    'bounce-drop':  { ms: 780, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', yDir: -1, kf: [
                        { opacity: 0, transform: 'translateY(-64px)' },
                        { opacity: 1, transform: 'translateY(0)', offset: 0.55, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
                        { transform: 'translateY(-13px)', offset: 0.72, easing: 'ease-out' },
                        { transform: 'translateY(0)', offset: 0.86, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
                        { transform: 'translateY(-4px)', offset: 0.94, easing: 'ease-out' },
                        { opacity: 1, transform: 'translateY(0)' }] },
    'slide-spring': { ms: 700, easing: 'cubic-bezier(0.3, 1.35, 0.55, 1)', kf: [
                        { opacity: 0, transform: 'translateX(-90px) scale(0.92)' },
                        { opacity: 1, transform: 'translateX(12px)', offset: 0.72 },
                        { opacity: 1, transform: 'translateX(0)' }] },
    'flip-in':      { ms: 640, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [
                        { opacity: 0, transform: 'perspective(500px) rotateX(-72deg) translateY(14px)', transformOrigin: '50% 100%' },
                        { opacity: 1, transform: 'perspective(500px) rotateX(8deg)', offset: 0.8, transformOrigin: '50% 100%' },
                        { opacity: 1, transform: 'perspective(500px) rotateX(0deg) translateY(0)', transformOrigin: '50% 100%' }] },
    'rise':         { ms: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', yDir: 1, kf: [
                        { opacity: 0, transform: 'translateY(26px)' },
                        { opacity: 1, transform: 'translateY(0)' }] },
    'blur-in':      { ms: 600, easing: 'ease-out', kf: [
                        { opacity: 0, filter: 'blur(7px)', transform: 'translateY(6px)' },
                        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' }] },
    'glitch':       { ms: 700, easing: 'linear', kf: [
                        { opacity: 0.9, transform: 'translateX(-10px) skewX(16deg)', clipPath: 'inset(8% 0 62% 0)', filter: 'drop-shadow(5px 0 0 rgba(255,0,80,0.9)) drop-shadow(-5px 0 0 rgba(0,240,255,0.9))', offset: 0 },
                        { opacity: 1, transform: 'translateX(8px) skewX(-12deg)', clipPath: 'inset(55% 0 12% 0)', filter: 'drop-shadow(-6px 0 0 rgba(255,0,80,0.9)) drop-shadow(6px 0 0 rgba(0,240,255,0.9))', offset: 0.14 },
                        { opacity: 0.55, transform: 'translateX(-6px) skewX(8deg)', clipPath: 'inset(0 0 0 0)', filter: 'drop-shadow(4px 0 0 rgba(255,0,80,0.8)) drop-shadow(-4px 0 0 rgba(0,240,255,0.8))', offset: 0.28 },
                        { opacity: 1, transform: 'translateX(5px) skewX(-6deg)', clipPath: 'inset(30% 0 35% 0)', filter: 'drop-shadow(-4px 0 0 rgba(255,0,80,0.8)) drop-shadow(4px 0 0 rgba(0,240,255,0.8))', offset: 0.42 },
                        { opacity: 0.8, transform: 'translateX(-3px) skewX(3deg)', clipPath: 'inset(0 0 0 0)', filter: 'drop-shadow(3px 0 0 rgba(255,0,80,0.7)) drop-shadow(-3px 0 0 rgba(0,240,255,0.7))', offset: 0.58 },
                        { opacity: 1, transform: 'translateX(2px) skewX(-2deg)', clipPath: 'inset(0 0 0 0)', filter: 'drop-shadow(-2px 0 0 rgba(255,0,80,0.6)) drop-shadow(2px 0 0 rgba(0,240,255,0.6))', offset: 0.74 },
                        { opacity: 1, transform: 'translateX(0) skewX(0deg)', clipPath: 'inset(0 0 0 0)', filter: 'drop-shadow(0 0 0 rgba(255,0,80,0)) drop-shadow(0 0 0 rgba(0,240,255,0))', offset: 0.9 },
                        { opacity: 1, transform: 'translateX(0) skewX(0deg)', clipPath: 'inset(0 0 0 0)', filter: 'none', offset: 1 }] }
  };

  function playAppearAnimation(el, animKey, chatDirection) {
    const spec = APPEAR_ANIMATIONS[animKey] || APPEAR_ANIMATIONS['slide-left'];
    // dir-bottom: плашки растут вверх, вертикальные траектории инвертируем,
    // чтобы движение всегда шло «из потока» к финальной позиции
    const dirMul = chatDirection === 'bottom' && spec.yDir ? -1 : 1;
    const keyframes = spec.yDir
      ? spec.kf.map((f) => {
          if (f.transform && f.transform.indexOf('translateY(') >= 0) {
            return Object.assign({}, f, {
              transform: f.transform.replace(/translateY\((-?[\d.]+)px\)/,
                (m, v) => `translateY(${(parseFloat(v) * dirMul).toFixed(1)}px)`)
            });
          }
          return f;
        })
      : spec.kf;
    try {
      el.animate(keyframes, { duration: spec.ms, easing: spec.easing });
    } catch (e) {
      // Старый Chromium без поддержки какого-то ключевого кадра: просто показать плашку
    }
  }

  // Плавный сдвиг: новая плашка уже вставлена, старые «стартуют» со смещения на её высоту и плавно едут на место.
  // Читаем только offsetHeight новой плашки и детей #chat (единицы-десятки), поэтому это дёшево.
  function makeFlipShift(getConfig, chatEl) {
    return function flipShiftExisting(newEl, chatDirection) {
      const cfg = getConfig();
      if (!cfg.smoothShift || typeof newEl.animate !== 'function') return;
      const gap = parseFloat(getComputedStyle(chatEl).rowGap) || 0;
      const h = newEl.offsetHeight + gap;
      if (!h) return;
      const from = chatDirection === 'bottom' ? h : -h;
      for (let i = 0; i < chatEl.children.length; i++) {
        const el = chatEl.children[i];
        if (el === newEl) continue;
        el.animate(
          [{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }],
          { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
    };
  }

  // Адрес своей картинки: в оверлее (file://) — протокол card://, в виджете OBS (http://) — маршрут /card/ того же сервера
  function cardImageUrl(id) {
    const enc = encodeURIComponent(id);
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) return `${location.origin}/card/${enc}`;
    return `card://img/${enc}`;
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
    const flipShiftExisting = makeFlipShift(() => config, chat);

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

    function getPlateClasses(c = config) {
      const shape = c.plateShape === 'strict' ? 'strict' : 'rounded';
      const effect = c.borderEffect || 'static';
      const bw = parseInt(c.borderWidth, 10) || 0;
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

    // Переменные оформления плашки: для всего чата (root) или для отдельного сообщения (свой стиль)
    function applyStyleVars(node, c) {
      const fontSize = c.fontSize || 14;
      node.style.setProperty('--font-size', `${fontSize}px`);

      const bg = c.bgOpacity !== undefined ? c.bgOpacity : 50;
      node.style.setProperty('--bg-opacity', (bg / 100).toFixed(2));

      const family = !c.fontFamily || c.fontFamily === 'system' ? SYSTEM_FONT : c.fontFamily;
      node.style.setProperty('--font-family', family);
      node.style.setProperty('--text-align', c.textAlign || 'left');

      // Переменные плашки и рамки
      node.style.setProperty('--plate-bg', buildPlateBackground(c));

      const shape = c.plateShape === 'strict' ? 'strict' : 'rounded';
      const radius = shape === 'strict' ? '0px' : '6px';
      node.style.setProperty('--plate-radius', radius);

      const bw = parseInt(c.borderWidth, 10) || 0;
      const effect = c.borderEffect || 'static';
      const effectiveBw = bw === 0 && effect !== 'static' && effect !== 'cyber' ? 1 : bw;
      node.style.setProperty('--plate-border-width', `${effectiveBw}px`);
      node.style.setProperty('--plate-border-color', c.borderColor || '#9146FF');
      node.style.setProperty('--plate-border-color-2', c.borderColor2 || '#FFFFFF');
      node.style.setProperty('--effect-speed-mult', String(speedToDurationMultiplier(c.borderEffectSpeed)));

      // Переменные текста сообщения (применяются ТОЛЬКО к .text-content)
      node.style.setProperty('--msg-text-color', c.textColor || '#FFFFFF');
      const textShadow = buildOutlineShadow(
        c.textOutlineWidth !== undefined ? c.textOutlineWidth : 2,
        c.textOutlineColor || '#000000'
      );
      node.style.setProperty('--msg-text-shadow', textShadow);

      // Переменные никнеймов: если кастомизация выключена, остаётся базовый стиль Twitch (DEFAULT_TWITCH_NICK_SHADOW)
      if (c.customNickEnabled) {
        const nickShadow = buildOutlineShadow(
          c.customNickOutlineWidth !== undefined ? c.customNickOutlineWidth : 2,
          c.customNickOutlineColor || '#000000'
        );
        node.style.setProperty('--nick-text-shadow', nickShadow);
      } else {
        node.style.setProperty('--nick-text-shadow', DEFAULT_TWITCH_NICK_SHADOW);
      }

    }

    function applyConfig(cfg) {
      const prevPoolSig = rotationSig(config);
      const prevSync = !!config.borderEffectSync;
      const prevEffect = config.borderEffect;
      const prevSpeed = config.borderEffectSpeed;
      config = Object.assign({}, cfg);

      applyStyleVars(root, config);
      if (rotationSig(config) !== prevPoolSig) rotationLast = -1;

      chat.style.gap = `${Math.max(5, Math.min(40, parseInt(config.plateGap, 10) || 5))}px`; // расстояние между плашками (5px — прежнее базовое)
      chat.className = `dir-${config.chatDirection || 'top'} layout-${config.layoutMode || 'inline'}${config.solidRibbon ? ' solid-ribbon' : ''}`;
      updateIgnored(config.ignoredBots);

      // Обновляем уже существующие в DOM сообщения для мгновенного живого предпросмотра
      const plateClasses = getPlateClasses();
      const syncEnabled = !!config.borderEffectSync;
      const sharedSyncDelay = syncEnabled ? computeSyncDelaySeconds() : '0s';
      const needSyncUpdate = prevSync !== syncEnabled || prevEffect !== config.borderEffect || prevSpeed !== config.borderEffectSpeed;

      Array.from(chat.children).forEach((el) => {
        if (el.classList.contains('is-notice')) return;
        if (el._ownCfg) {
          // Размер шрифта общий для всех сообщений, даже если оформление плашки индивидуальное.
          el.style.setProperty('--font-size', `${config.fontSize || 14}px`);
          return; // остальные параметры индивидуального стиля не перекрашиваем общими настройками
        }
        // Снимаем служебные классы по префиксу: эффекты рамки и формы больше не перечисляются вручную
        Array.from(el.classList).filter((c) => c.startsWith('effect-') || c.startsWith('shape-')).forEach((c) => el.classList.remove(c));
        plateClasses.forEach((c) => el.classList.add(c));

        // Обновляем слой картинки на уже висящих плашках (мгновенный живой предпросмотр)
        applyCardImageVars(el);

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

    /* ---------------- Картинка на плашке ---------------- */

    const CARD_IMAGE_PRESETS = ['none', 'hearts-tile', 'clouds', 'stars-shape', 'confetti'];

    // Встроенные картинки-фигуры (data-URI SVG, фиксированные цвета, не зависят от рамки):
    // «наклейки» — сердечки, облачка, звёздочки и т.п. — вместо линий, привязанных к рамке
    function builtinPatternDataUri(name) {
      switch (name) {
        case 'hearts-tile':
          return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M12 6c-1.8-2.4-5.6-2.2-7 .5-1 2-.2 4.2 1.7 5.8L12 16l5.3-3.7c1.9-1.6 2.7-3.8 1.7-5.8-1.4-2.7-5.2-2.9-7-.5z' fill='%23ff4d6d' fill-opacity='0.85'/%3E%3Cpath d='M36 30c-1.8-2.4-5.6-2.2-7 .5-1 2-.2 4.2 1.7 5.8L36 40l5.3-3.7c1.9-1.6 2.7-3.8 1.7-5.8-1.4-2.7-5.2-2.9-7-.5z' fill='%23ff8fab' fill-opacity='0.7'/%3E%3C/svg%3E\")";
        case 'clouds':
          return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='48'%3E%3Cg fill='%23cfe3ff'%3E%3Cpath d='M14 20a6 6 0 0 1 11.6-2A5 5 0 0 1 26 28H14a5.5 5.5 0 0 1 0-11z'/%3E%3Cpath d='M50 34a6 6 0 0 1 11.6-2A5 5 0 0 1 62 42H50a5.5 5.5 0 0 1 0-11z' fill-opacity='0.6'/%3E%3C/g%3E%3C/svg%3E\")";
        case 'stars-shape':
          return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cg fill='%23ffd166'%3E%3Cpath d='M14 4l2.7 5.9L23 11l-4.6 4.3L19.5 21 14 17.8 8.5 21l1.1-5.7L5 11l6.3-1.1z'/%3E%3Cpath d='M42 32l2 4.4 4.7.8-3.4 3.2.8 4.6-4.1-2.3-4.1 2.3.8-4.6-3.4-3.2 4.7-.8z' fill-opacity='0.75'/%3E%3C/g%3E%3C/svg%3E\")";
        case 'confetti':
          return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cg%3E%3Crect x='6' y='8' width='6' height='6' rx='1' fill='%23ff6b6b' transform='rotate(20 9 11)'/%3E%3Ccircle cx='30' cy='14' r='3' fill='%234ecdc4'/%3E%3Crect x='44' y='6' width='6' height='6' rx='1' fill='%23ffe66d' transform='rotate(35 47 9)'/%3E%3Ccircle cx='16' cy='34' r='3' fill='%23a78bfa'/%3E%3Crect x='34' y='30' width='6' height='6' rx='1' fill='%234ecdc4' transform='rotate(-15 37 33)'/%3E%3Ccircle cx='50' cy='44' r='3' fill='%23ff6b6b'/%3E%3C/g%3E%3C/svg%3E\")";
        default:
          return 'none';
      }
    }

    // Значение CSS-переменной --card-image для текущих настроек.
    // Своя картинка адресуется протоколом card://img/<имя>; если файл пропал — фоллбек: 'none' (плашка без картинки).
    function getCardImageValue(c) {
      if (c.cardImageCustom) {
        return `url("${cardImageUrl(c.cardImageCustom)}")`;
      }
      if (c.cardImagePreset && c.cardImagePreset !== 'none' && CARD_IMAGE_PRESETS.includes(c.cardImagePreset)) {
        return builtinPatternDataUri(c.cardImagePreset);
      }
      return 'none';
    }

    function cardFitValue(c) {
      const fit = c.cardImageFit || 'width';
      const scale = Math.max(25, Math.min(500, parseInt(c.cardImageScale, 10) || 100)) / 100;
      if (fit === 'cover') return `auto ${Math.round(100 * scale)}%`;
      if (fit === 'tile') {
        // Плитка с зумом: базовый размер ячейки умножается
        const base = c.cardImageTileSize || 48;
        return `${Math.round(base * scale)}px`;
      }
      // По ширине с зумом
      return scale === 1 ? '100% auto' : `${Math.round(100 * scale)}% auto`;
    }

    function applyCardImageVars(el) {
      const c = el._ownCfg || config;
      // Картинка распространяется ТОЛЬКО на обычные текстовые сообщения.
      // Упоминания/ответы (is-mention) получают только свой предустановленный стиль подсветки,
      // награды (is-reward) и технические события — системную строку без картинок.
      const isTextMessage = !el.classList.contains('is-notice') && !el.classList.contains('is-reward');
      const value = isTextMessage ? getCardImageValue(c) : 'none';
      el.style.setProperty('--card-image', value);
      el.style.setProperty('--card-image-fit', cardFitValue(c));
      el.style.setProperty('--card-image-repeat', (c.cardImageFit || 'width') === 'tile' ? 'repeat' : 'no-repeat');
      el.style.setProperty('--card-image-pos-x', `${c.cardImagePosX !== undefined ? c.cardImagePosX : 50}%`);
      el.style.setProperty('--card-image-pos-y', `${c.cardImagePosY !== undefined ? c.cardImagePosY : 50}%`);
      el.style.setProperty('--card-image-opacity', String((c.cardImageOpacity !== undefined ? c.cardImageOpacity : 60) / 100));
    }

    /* ---------------- Список сообщений ---------------- */

    // Нижняя (по ходу ленты) плашка полностью за краем контейнера
    function isFullyOutside(el) {
      const top = el.offsetTop;
      return (config.chatDirection || 'top') === 'bottom'
        ? top + el.offsetHeight <= 0
        : top >= chat.clientHeight;
    }

    const removalTimers = new Map();

    function clearRemovalTimer(element) {
      const timer = removalTimers.get(element);
      if (timer) clearTimeout(timer);
      removalTimers.delete(element);
    }

    function removeMessageNode(element) {
      clearRemovalTimer(element);
      if (element.parentNode) element.parentNode.removeChild(element);
    }

    function enforceMessageLimit() {
      while (chat.children.length > MAX_DOM_MESSAGES) {
        removeMessageNode(chat.lastChild);
      }
      if (config.solidRibbon) {
        // Сплошная лента: убираем только то, что целиком ушло за границу; частично видимое остаётся и растворяется маской
        while (chat.children.length > 1 && isFullyOutside(chat.lastChild)) {
          removeMessageNode(chat.lastChild);
        }
        return;
      }
      // Обычный режим: выезд больше ~30 px убирает самую старую плашку
      while (chat.scrollHeight > chat.clientHeight + 30 && chat.children.length > 1) {
        removeMessageNode(chat.lastChild);
      }
    }

    function scheduleRemoval(element, factor = 1) {
      const lifetime = config.messageLifetime;
      if (!lifetime || lifetime <= 0) return;

      const timer = setTimeout(() => {
        if (!element.parentNode) {
          clearRemovalTimer(element);
          return;
        }
        element.classList.add('fade-out');
        removalTimers.set(element, setTimeout(() => removeMessageNode(element), 800));
      }, lifetime * factor * 1000);
      removalTimers.set(element, timer);
    }

    function insertMessage(el) {
      const chatDirection = config.chatDirection || 'top';
      chat.prepend(el);
      enforceMessageLimit();
      // Сдвиг считаем ПОСЛЕ вставки: только тогда у новой плашки есть высота
      flipShiftExisting(el, chatDirection);
      playAppearAnimation(el, (el._ownCfg || config).animation || 'slide-left', chatDirection);
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
      el.className = 'message is-notice';
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
      clearRemovalTimer(el);
      removalTimers.set(el, setTimeout(() => removeMessageNode(el), 220));
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

    /* ---------------- Стили по нику и ротация стилей ---------------- */

    // Ключи, которыми «свой» стиль перекрывает общий вид (как у пресета; размер шрифта и раскладка остаются общими)
    const OWN_STYLE_KEYS = [
      'bgOpacity', 'bgMode', 'bgColor1', 'bgColor2', 'bgMonoMode', 'bgDirection',
      'plateShape', 'borderWidth', 'borderColor', 'borderColor2', 'borderEffect', 'borderEffectSpeed', 'borderEffectSync',
      'textColor', 'textOutlineWidth', 'textOutlineColor',
      'customNickEnabled', 'customNickColor', 'customNickOutlineWidth', 'customNickOutlineColor',
      'cardImagePreset', 'cardImageCustom', 'cardImageFit', 'cardImagePosX', 'cardImagePosY', 'cardImageOpacity', 'cardImageScale',
      'fontFamily', 'textAlign', 'animation'
    ];
    let rotationLast = -1;

    function rotationSig(c) {
      const r = c && c.rotation;
      return r && r.enabled && Array.isArray(r.pool) ? `${r.random ? 'r' : 's'}${r.pool.length}:${JSON.stringify(r.pool)}` : '';
    }

    function mergeOwnStyle(style) {
      const out = Object.assign({}, config);
      OWN_STYLE_KEYS.forEach((k) => { if (style[k] !== undefined) out[k] = style[k]; });
      return out;
    }

    // Выбор своего стиля для сообщения: стиль по нику важнее ротации и не сдвигает её очередь.
    // Награды и подсвеченные упоминания (только оверлей) остаются со стандартным видом.
    function pickOwnStyle(msg, highlight) {
      if (msg.isReward || highlight) return null;
      const login = String(msg.login || msg.user || '').toLowerCase();
      const byNick = config.userStyles && config.userStyles[login];
      if (byNick) return mergeOwnStyle(byNick);
      const rot = config.rotation;
      if (!rot || !rot.enabled || !Array.isArray(rot.pool) || rot.pool.length < 2) return null;
      const n = rot.pool.length;
      let idx;
      if (rot.random && n >= 3) {
        do { idx = Math.floor(Math.random() * n); } while (idx === rotationLast);
      } else {
        idx = (rotationLast + 1) % n;
      }
      rotationLast = idx;
      return mergeOwnStyle(rot.pool[idx]);
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
      const own = pickOwnStyle(msg, highlight);
      const st = own || config;

      const el = document.createElement('div');
      const rewardClass = msg.isReward ? 'is-reward' : '';
      const mentionClass = highlight ? 'is-mention' : '';
      const plateClasses = getPlateClasses(st).join(' ');
      el.className = `message ${plateClasses} ${rewardClass} ${mentionClass}`.trim();
      if (own) {
        el._ownCfg = own;
        applyStyleVars(el, own);
      }

      const nowSec = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000;
      el.dataset.createdSec = nowSec.toFixed(3);
      applySyncDelayToElement(el, !!st.borderEffectSync);

      if (msg.id) el.dataset.msgId = msg.id;
      if (msg.login) el.dataset.login = msg.login;
      if (msg.userId) el.dataset.userId = msg.userId;


      const rewardIcon = escapeHtml(msg.rewardIconUrl || CHANNEL_POINTS_ICON_URL);
      const rewardBadgeHtml = msg.isReward
        ? `<img class="reward-icon" src="${rewardIcon}" alt="${escapeHtml(tr('ui.pointsAlt'))}" onerror="this.style.display='none'" />`
        : '';

      const safeUser = escapeHtml(msg.user);
      const twitchReadableColor = ensureReadableColor(msg.color);
      const nickColor = st.customNickEnabled
        ? (st.customNickColor || '#9146FF')
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

      applyCardImageVars(el);
      insertMessage(el);
      scheduleRemoval(el, highlight && config.mentionLonger ? 2 : 1);
    }

    function clear() {
      while (chat.firstChild) removeMessageNode(chat.firstChild);
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
})(typeof window !== 'undefined' ? window : global);
