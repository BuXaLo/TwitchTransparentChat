
    const $ = (id) => document.getElementById(id);
    const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const DEFAULT_TWITCH_NICK_SHADOW =
      '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, ' +
      '-2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000, 0 2px 4px rgba(0, 0, 0, 0.9)';
    const DEFAULT_TWITCH_SAMPLE_COLOR = '#00FF7F';

    const NOTICE_IDS = ['showSub', 'showResub', 'showGift', 'showRaid'];
    const ANIMATED_EFFECTS = ['pulse', 'rgb', 'cyber', 'breathing'];
    const ANIM_CALM = ['fade', 'slide-left', 'slide-down', 'rise', 'blur-in'];
    const ANIM_ALL = [
      'fade', 'slide-left', 'slide-down', 'zoom',
      'spring-pop', 'bounce-drop', 'slide-spring', 'flip-in', 'rise', 'blur-in', 'glitch'
    ];
    const CARD_IMAGE_PRESETS = [
      { id: 'none', key: 'ui.cardImageSourceNone' },
      { id: 'hearts-tile', key: 'ui.cardImageHeartsTile' },
      { id: 'clouds', key: 'ui.cardImageClouds' },
      { id: 'stars-shape', key: 'ui.cardImageStarsShape' },
      { id: 'confetti', key: 'ui.cardImageConfetti' }
    ];
    // Базовые («задуманные») значения посадки для каждой встроенной картинки
    const CARD_IMAGE_BASE = {
      'hearts-tile':  { fit: 'tile',  posX: 50, posY: 50, opacity: 45,  scale: 100 },
      'clouds':       { fit: 'tile',  posX: 50, posY: 50, opacity: 80,  scale: 100 },
      'stars-shape':  { fit: 'tile',  posX: 50, posY: 50, opacity: 70,  scale: 100 },
      'confetti':     { fit: 'tile',  posX: 50, posY: 50, opacity: 60,  scale: 100 }
    };
    // Исходный файл до 8 МБ. Изображение крупнее 1920 px по длинной стороне уменьшается автоматически,
    // готовый WebP не больше 5 МБ (то же ограничение проверяет main.js). Сторона исходника до 8000 px: больше — слишком тяжело для декодирования.
    const CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
    const CARD_IMAGE_MAX_SIDE = 1920;
    const CARD_IMAGE_MAX_SOURCE_SIDE = 8000;
    const CARD_IMAGE_RESULT_MAX_BYTES = 5 * 1024 * 1024;
    // Комплектные шрифты: family — то, что реально в CSS/config.js; stack — фоллбек; key — суффикс ключа локали
    const BUNDLED_FONTS = [
      { family: 'Rubik', stack: 'sans-serif', key: 'Rubik' },
      { family: 'Nunito', stack: 'sans-serif', key: 'Nunito' },
      { family: 'Exo 2', stack: 'sans-serif', key: 'Exo2' },
      { family: 'Oswald', stack: 'sans-serif', key: 'Oswald' },
      { family: 'Play', stack: 'sans-serif', key: 'Play' },
      { family: 'Russo One', stack: 'sans-serif', key: 'RussoOne' },
      { family: 'Comfortaa', stack: 'sans-serif', key: 'Comfortaa' },
      { family: 'JetBrains Mono', stack: 'monospace', key: 'JetBrainsMono' },
      { family: 'Unbounded', stack: 'sans-serif', key: 'Unbounded' }
    ];
    const STYLE_KEYS = [
      'bgOpacity', 'bgMode', 'bgColor1', 'bgColor2', 'bgMonoMode', 'bgDirection',
      'plateShape', 'borderWidth', 'borderColor', 'borderColor2', 'borderEffect', 'borderEffectSpeed', 'borderEffectSync',
      'textColor', 'textOutlineWidth', 'textOutlineColor',
      'customNickEnabled', 'customNickColor', 'customNickOutlineWidth', 'customNickOutlineColor',
      'cardImagePreset', 'cardImageCustom', 'cardImageFit', 'cardImagePosX', 'cardImagePosY', 'cardImageOpacity', 'cardImageScale'
    ];

    // Запасной фоллбек на случай, если config.js еще не ответил, но перезаписывается из cfg.defaults при инициализации
    let defaultAppearance = {
      messageLifetime: 15,
      fontSize: 14,
      plateGap: 5,
      fontFamily: 'system',
      textAlign: 'left',
      bgOpacity: 50,
      animation: 'slide-left',
      chatDirection: 'top',
      layoutMode: 'inline',
      showSub: false,
      showResub: false,
      showGift: false,
      showRaid: false,
      highlightMentions: true,
      mentionLonger: false,
      bgMode: 'solid',
      bgColor1: '#000000',
      bgColor2: '#251640',
      bgMonoMode: 'tone',
      bgDirection: 'to right',
      plateShape: 'rounded',
      borderWidth: 0,
      borderColor: '#9146FF',
      borderColor2: '#FFFFFF',
      borderEffect: 'static',
      borderEffectSpeed: 5,
      borderEffectSync: false,
      textColor: '#FFFFFF',
      textOutlineWidth: 2,
      textOutlineColor: '#000000',
      customNickEnabled: false,
      customNickColor: '#9146FF',
      customNickOutlineWidth: 2,
      customNickOutlineColor: '#000000',
      smoothShift: true,
      cardImagePreset: 'none',
      cardImageCustom: '',
      cardImageFit: 'width',
      cardImagePosX: 50,
      cardImagePosY: 50,
      cardImageOpacity: 60,
      cardImageScale: 100,
      solidRibbon: false
    };

    /* ---------------- Встроенные пресеты (5 демонстрационных стилей) ---------------- */

    const BUILTIN_PRESETS = [
      {
        id: 'default',
        titleKey: 'ui.presetDefault',
        descKey: 'ui.presetDefaultDesc',
        style: {
          bgMode: 'solid',
          bgColor1: '#000000',
          bgColor2: '#251640',
          bgMonoMode: 'tone',
          bgDirection: 'to right',
          bgOpacity: 50,
          plateShape: 'rounded',
          borderWidth: 0,
          borderColor: '#9146FF',
          borderColor2: '#FFFFFF',
          borderEffect: 'static',
          borderEffectSpeed: 5,
          borderEffectSync: false,
          textColor: '#FFFFFF',
          textOutlineWidth: 2,
          textOutlineColor: '#000000',
          customNickEnabled: false,
          customNickColor: '#9146FF',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#000000'
        }
      },
      {
        id: 'fade',
        titleKey: 'ui.presetFade',
        descKey: 'ui.presetFadeDesc',
        style: {
          bgMode: 'grad-mono',
          bgColor1: '#0F1E36',
          bgColor2: '#000000',
          bgMonoMode: 'fade',
          bgDirection: 'to right',
          bgOpacity: 85,
          plateShape: 'strict',
          borderWidth: 1,
          borderColor: '#00E5FF',
          borderColor2: '#FFFFFF',
          borderEffect: 'neon',
          borderEffectSpeed: 5,
          borderEffectSync: false,
          textColor: '#EAFBFF',
          textOutlineWidth: 2,
          textOutlineColor: '#04101E',
          customNickEnabled: false,
          customNickColor: '#00E5FF',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#000000'
        }
      },
      {
        id: 'velvet',
        titleKey: 'ui.presetVelvet',
        descKey: 'ui.presetVelvetDesc',
        style: {
          bgMode: 'grad-mono',
          bgColor1: '#281545',
          bgColor2: '#120824',
          bgMonoMode: 'tone',
          bgDirection: '135deg',
          bgOpacity: 75,
          plateShape: 'rounded',
          borderWidth: 2,
          borderColor: '#B56BFF',
          borderColor2: '#FFFFFF',
          borderEffect: 'pulse',
          borderEffectSpeed: 4,
          borderEffectSync: true,
          textColor: '#F6EEFF',
          textOutlineWidth: 2,
          textOutlineColor: '#120624',
          customNickEnabled: false,
          customNickColor: '#D6A8FF',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#000000'
        }
      },
      {
        id: 'cyber',
        titleKey: 'ui.presetCyber',
        descKey: 'ui.presetCyberDesc',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#240B36',
          bgColor2: '#09203F',
          bgMonoMode: 'tone',
          bgDirection: '45deg',
          bgOpacity: 80,
          plateShape: 'rounded',
          borderWidth: 2,
          borderColor: '#FF007F',
          borderColor2: '#00F0FF',
          borderEffect: 'cyber',
          borderEffectSpeed: 6,
          borderEffectSync: true,
          textColor: '#FFFFFF',
          textOutlineWidth: 2,
          textOutlineColor: '#080412',
          customNickEnabled: true,
          customNickColor: '#FFE600',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#1A0526'
        }
      },
      {
        id: 'rgb',
        titleKey: 'ui.presetRgb',
        descKey: 'ui.presetRgbDesc',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#142824',
          bgColor2: '#0A0C12',
          bgMonoMode: 'tone',
          bgDirection: 'radial',
          bgOpacity: 75,
          plateShape: 'strict',
          borderWidth: 2,
          borderColor: '#00FF88',
          borderColor2: '#FFFFFF',
          borderEffect: 'rgb',
          borderEffectSpeed: 5,
          borderEffectSync: true,
          textColor: '#F0FFF8',
          textOutlineWidth: 2,
          textOutlineColor: '#000000',
          customNickEnabled: false,
          customNickColor: '#00FF88',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#000000',
          cardImagePreset: 'none',
          cardImageCustom: '',
          cardImageFit: 'width',
          cardImagePosX: 50,
          cardImagePosY: 50,
          cardImageOpacity: 60
        }
      },
      {
        id: 'star-night',
        titleKey: 'ui.presetStarNight',
        descKey: 'ui.presetStarNightDesc',
        group: 'image',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#0B1026',
          bgColor2: '#1B2A52',
          bgMonoMode: 'tone',
          bgDirection: '135deg',
          bgOpacity: 80,
          plateShape: 'rounded',
          borderWidth: 1,
          borderColor: '#8FB7FF',
          borderColor2: '#FFFFFF',
          borderEffect: 'neon',
          borderEffectSpeed: 4,
          borderEffectSync: false,
          textColor: '#EAF2FF',
          textOutlineWidth: 2,
          textOutlineColor: '#050918',
          customNickEnabled: false,
          customNickColor: '#BBD3FF',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#050918',
          cardImagePreset: 'stars-shape',
          cardImageCustom: '',
          cardImageFit: 'tile',
          cardImagePosX: 50,
          cardImagePosY: 50,
          cardImageOpacity: 70
        }
      },
      {
        id: 'sakura-petals',
        titleKey: 'ui.presetSakuraPetals',
        descKey: 'ui.presetSakuraPetalsDesc',
        group: 'image',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#3A1F33',
          bgColor2: '#6E3A55',
          bgMonoMode: 'tone',
          bgDirection: 'to bottom',
          bgOpacity: 72,
          plateShape: 'rounded',
          borderWidth: 1,
          borderColor: '#FF9EC4',
          borderColor2: '#FFFFFF',
          borderEffect: 'neon',
          borderEffectSpeed: 3,
          borderEffectSync: false,
          textColor: '#FFF0F6',
          textOutlineWidth: 2,
          textOutlineColor: '#2A1222',
          customNickEnabled: false,
          customNickColor: '#FFC1DA',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#2A1222',
          cardImagePreset: 'hearts-tile',
          cardImageCustom: '',
          cardImageFit: 'tile',
          cardImagePosX: 50,
          cardImagePosY: 50,
          cardImageOpacity: 55
        }
      },
      {
        id: 'confetti-pop',
        titleKey: 'ui.presetConfettiPop',
        descKey: 'ui.presetConfettiPopDesc',
        group: 'image',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#2A0E4F',
          bgColor2: '#0E0524',
          bgMonoMode: 'tone',
          bgDirection: '45deg',
          bgOpacity: 80,
          plateShape: 'rounded',
          borderWidth: 2,
          borderColor: '#FF2EC4',
          borderColor2: '#00F0FF',
          borderEffect: 'cyber',
          borderEffectSpeed: 6,
          borderEffectSync: true,
          textColor: '#FFFFFF',
          textOutlineWidth: 2,
          textOutlineColor: '#12032B',
          customNickEnabled: false,
          customNickColor: '#FF7BE0',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#12032B',
          cardImagePreset: 'confetti',
          cardImageCustom: '',
          cardImageFit: 'tile',
          cardImagePosX: 50,
          cardImagePosY: 50,
          cardImageOpacity: 45
        }
      },
      {
        id: 'cloudy',
        titleKey: 'ui.presetCloudy',
        descKey: 'ui.presetCloudyDesc',
        group: 'image',
        style: {
          bgMode: 'grad-dual',
          bgColor1: '#232A3A',
          bgColor2: '#12182A',
          bgMonoMode: 'tone',
          bgDirection: '135deg',
          bgOpacity: 82,
          plateShape: 'rounded',
          borderWidth: 1,
          borderColor: '#7FA8D9',
          borderColor2: '#FFFFFF',
          borderEffect: 'neon',
          borderEffectSpeed: 3,
          borderEffectSync: false,
          textColor: '#F2F7FF',
          textOutlineWidth: 2,
          textOutlineColor: '#0C1220',
          customNickEnabled: false,
          customNickColor: '#BDD7F5',
          customNickOutlineWidth: 2,
          customNickOutlineColor: '#0C1220',
          cardImagePreset: 'clouds',
          cardImageCustom: '',
          cardImageFit: 'tile',
          cardImagePosX: 50,
          cardImagePosY: 50,
          cardImageOpacity: 85,
          cardImageScale: 100
        }
      }
    ];

    /* ---------------- Вспомогательные функции генерации стилей для мини-превью ---------------- */

    // Стилизация миниатюры-плашки в списке пресетов: те же переменные, что и в живом предпросмотре
    function applyThumbStyle(el, style) {
      const cfg = style || {};
      el.style.setProperty('--plate-bg', buildPlateBackground(cfg));
      el.style.setProperty('--plate-radius', cfg.plateShape === 'strict' ? '0px' : '6px');
      const bw = Math.max(0, Math.min(5, parseInt(cfg.borderWidth, 10) || 0));
      const effect = cfg.borderEffect || 'static';
      el.style.setProperty('--plate-border-width', `${bw === 0 && effect !== 'static' && effect !== 'cyber' ? 1 : bw}px`);
      el.style.setProperty('--plate-border-color', cfg.borderColor || '#9146FF');
      el.style.setProperty('--plate-border-color-2', cfg.borderColor2 || '#FFFFFF');
      el.style.setProperty('--msg-text-color', cfg.textColor || '#FFFFFF');
      el.style.setProperty('--msg-text-shadow', 'none');
      el.style.setProperty('--nick-text-shadow', 'none');
      el.style.setProperty('--card-image', cardImageCssValue(cfg));
      el.style.setProperty('--card-image-fit', cardImageCssSize(cfg));
      el.style.setProperty('--card-image-repeat', cardImageCssRepeat(cfg));
      el.style.setProperty('--card-image-pos-x', `${cfg.cardImagePosX !== undefined ? cfg.cardImagePosX : 50}%`);
      el.style.setProperty('--card-image-pos-y', `${cfg.cardImagePosY !== undefined ? cfg.cardImagePosY : 50}%`);
      el.style.setProperty('--card-image-opacity', String((cfg.cardImageOpacity !== undefined ? cfg.cardImageOpacity : 60) / 100));
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

    function speedToDurationMultiplier(speedVal) {
      const s = Math.max(1, Math.min(10, parseInt(speedVal, 10) || 5));
      return Number((5 / s).toFixed(2));
    }

    /* ---------------- Состояние внешнего вида для Оверлея и Виджета ---------------- */

    const appearanceState = {
      o_: {},
      w_: {}
    };

    let customPresets = [];
    // Стили по нику и ротация: отдельно для вкладок Оверлей ('o_') и Виджет ('w_')
    const extras = {
      o_: { userStyles: [], rotation: { enabled: false, random: false, source: 'all', names: [] } },
      w_: { userStyles: [], rotation: { enabled: false, random: false, source: 'all', names: [] } }
    };
    let extraTarget = 'o_';
    let usEditing = null;
    let usPendingDup = null;
    let usPendingDelete = null;
    let overlayVisible = true;
    let rotDraft = null;
    let rotPreviewCfg = null;
    let selectedPresetKey = 'current';
    let pendingPresetOverwrite = null;
    let pendingPresetDelete = null;
    let activeModalTarget = 'o_'; // 'o_' | 'w_'
    let modalSnapshot = null;
    let currentUpdateData = null;
    let stringsLoaded = false;
    let appVersion = '1.3.1';
    let isPortableBuild = false;

    /* ---------------- Локализация ---------------- */

    let strings = {};
    let widgetStatus = {};

    function tr(key) {
      return strings[key] !== undefined ? strings[key] : key;
    }

    function trf(key, params) {
      return tr(key).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m));
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[m]);
    }

    function formatInlineMarkdown(escapedLine) {
      return escapedLine
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    function renderMarkdownNotes(mdText) {
      const raw = String(mdText || '').replace(/\r\n/g, '\n').trim();
      if (!raw) return '<p>—</p>';

      const lines = raw.split('\n');
      const html = [];
      let inList = false;

      const closeList = () => {
        if (inList) {
          html.push('</ul>');
          inList = false;
        }
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          closeList();
          continue;
        }
        if (/^---+$/.test(trimmed)) {
          closeList();
          html.push('<hr>');
          continue;
        }
        const hMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
        if (hMatch) {
          closeList();
          const tag = hMatch[1].length <= 2 ? 'h3' : 'h4';
          html.push(`<${tag}>${formatInlineMarkdown(escapeHtml(hMatch[2]))}</${tag}>`);
          continue;
        }
        const liMatch = /^[-*•]\s+(.+)$/.exec(trimmed);
        if (liMatch) {
          if (!inList) {
            html.push('<ul>');
            inList = true;
          }
          html.push(`<li>${formatInlineMarkdown(escapeHtml(liMatch[1]))}</li>`);
          continue;
        }
        closeList();
        html.push(`<p>${formatInlineMarkdown(escapeHtml(trimmed))}</p>`);
      }

      closeList();
      return html.join('');
    }

    function applyStrings(newStrings, lang) {
      strings = newStrings || {};
      stringsLoaded = true;
      document.documentElement.lang = lang || 'en';
      document.title = tr('settings.title');

      document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
      document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.label = tr(el.dataset.i18nLabel); });
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
      document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = tr(el.dataset.i18nTitle); });
      document.querySelectorAll('[data-i18n-tip]').forEach((el) => { el.dataset.tip = tr(el.dataset.i18nTip); });
      document.querySelectorAll('[data-mini-nick], [data-anim-nick]').forEach((el) => { el.textContent = tr('test.user1'); });

      if (!$('update-check-status').dataset.custom) {
        $('update-check-status').textContent = `v${appVersion}`;
      }
      renderWidgetStatus(widgetStatus);
      if (typeof refreshConfigDirInfo === 'function' && $('configDir')) refreshConfigDirInfo();
      renderPresetsLists();
      renderOverlayToggle(overlayVisible);
      updateRotationDots();
      renderUserStyles();
      renderRotation();

      if (currentUpdateData && currentUpdateData.hasUpdate) {
        renderUpdateModalContent(currentUpdateData);
      }
    }

    /* ---------------- Отрисовка мини-превью внутри модальных окон ---------------- */

    // Красит мини-плашку по настройкам cfg: общий код для превью в модалках и превью под кнопкой «Проиграть анимацию».
    // Размер шрифта задаётся только CSS (14px) и не зависит от ползунка размера сообщений.
    function paintMiniPlate(el, cfg, baseClasses) {
      const family = !cfg.fontFamily || cfg.fontFamily === 'system' ? SYSTEM_FONT : cfg.fontFamily;
      const layout = cfg.layoutMode || 'inline';
      const bw = Math.max(0, Math.min(5, parseInt(cfg.borderWidth, 10) || 0));
      const effect = cfg.borderEffect || 'static';
      const effectiveBw = bw === 0 && effect !== 'static' && effect !== 'cyber' ? 1 : bw;
      const nickCustom = !!cfg.customNickEnabled;

      el.style.fontFamily = family;
      el.style.textAlign = cfg.textAlign || 'left';
      el.style.setProperty('--plate-bg', buildPlateBackground(cfg));
      el.style.setProperty('--plate-radius', cfg.plateShape === 'strict' ? '0px' : '6px');
      el.style.setProperty('--plate-border-width', `${effectiveBw}px`);
      el.style.setProperty('--plate-border-color', cfg.borderColor || '#9146FF');
      el.style.setProperty('--plate-border-color-2', cfg.borderColor2 || '#FFFFFF');
      el.style.setProperty('--effect-speed-mult', String(speedToDurationMultiplier(cfg.borderEffectSpeed)));
      el.style.setProperty('--msg-text-color', cfg.textColor || '#FFFFFF');
      el.style.setProperty('--msg-text-shadow', buildOutlineShadow(cfg.textOutlineWidth !== undefined ? cfg.textOutlineWidth : 2, cfg.textOutlineColor || '#000000'));
      el.style.setProperty('--nick-text-shadow', nickCustom
        ? buildOutlineShadow(cfg.customNickOutlineWidth !== undefined ? cfg.customNickOutlineWidth : 2, cfg.customNickOutlineColor || '#000000')
        : DEFAULT_TWITCH_NICK_SHADOW);

      // Слой картинки на превью: как на реальной плашке
      el.style.setProperty('--card-image', cardImageCssValue(cfg));
      el.style.setProperty('--card-image-fit', cardImageCssSize(cfg));
      el.style.setProperty('--card-image-repeat', cardImageCssRepeat(cfg));
      el.style.setProperty('--card-image-pos-x', `${cfg.cardImagePosX !== undefined ? cfg.cardImagePosX : 50}%`);
      el.style.setProperty('--card-image-pos-y', `${cfg.cardImagePosY !== undefined ? cfg.cardImagePosY : 50}%`);
      el.style.setProperty('--card-image-opacity', String((cfg.cardImageOpacity !== undefined ? cfg.cardImageOpacity : 60) / 100));

      const classes = baseClasses.concat([`layout-${layout}`]);
      if (bw > 0 || effect !== 'static') classes.push(`effect-${effect}`);
      el.className = classes.join(' ');

      const nickEl = el.querySelector('[data-mini-nick], [data-anim-nick]');
      if (nickEl) nickEl.style.color = nickCustom ? (cfg.customNickColor || '#9146FF') : DEFAULT_TWITCH_SAMPLE_COLOR;
    }

    // Превью под кнопкой «Проиграть анимацию» (вкладки Оверлей и Виджет): живое, не зависит от нажатия кнопки
    function refreshAnimPreviews() {
      ['o_', 'w_'].forEach((p) => {
        const btn = document.querySelector(`[data-anim-preview="${p}"]`);
        const plate = btn && btn.parentElement ? btn.parentElement.querySelector('[data-anim-plate]') : null;
        if (plate && $(p + 'fontSize')) paintMiniPlate(plate, readAppearance(p), ['anim-preview-plate', 'mini-preview-plate']);
      });
    }

    function updateMiniPreviews(prefix) {
      const cfg = readAppearance(prefix || activeModalTarget || 'o_');
      document.querySelectorAll('[data-mini-preview]').forEach((el) => paintMiniPlate(el, cfg, ['mini-preview-plate']));
      refreshAnimPreviews();
    }

    /* ---------------- Форма базовых настроек внешнего вида ---------------- */

    function appearanceHtml(p) {
      // Один общий список: каждый пункт набран своим шрифтом, чтобы вид был понятен ещё до выбора
      const fontOptions = [
        '<option value="system" data-i18n="ui.fontSystem"></option>',
        '<option value="\'Inter\', sans-serif" data-i18n="ui.fontInter" style="font-family: \'Inter\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Montserrat\', sans-serif" data-i18n="ui.fontMontserrat" style="font-family: \'Montserrat\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Roboto\', sans-serif" data-i18n="ui.fontRoboto" style="font-family: \'Roboto\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Rubik\', sans-serif" data-i18n="ui.fontRubik" style="font-family: \'Rubik\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Nunito\', sans-serif" data-i18n="ui.fontNunito" style="font-family: \'Nunito\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Exo 2\', sans-serif" data-i18n="ui.fontExo2" style="font-family: \'Exo 2\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Oswald\', sans-serif" data-i18n="ui.fontOswald" style="font-family: \'Oswald\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Play\', sans-serif" data-i18n="ui.fontPlay" style="font-family: \'Play\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Russo One\', sans-serif" data-i18n="ui.fontRussoOne" style="font-family: \'Russo One\', sans-serif; font-weight: 700"></option>',
        '<option value="\'Comfortaa\', sans-serif" data-i18n="ui.fontComfortaa" style="font-family: \'Comfortaa\', sans-serif; font-weight: 700"></option>',
        '<option value="\'JetBrains Mono\', monospace" data-i18n="ui.fontJetBrainsMono" style="font-family: \'JetBrains Mono\', monospace; font-weight: 700"></option>',
        '<option value="\'Unbounded\', sans-serif" data-i18n="ui.fontUnbounded" style="font-family: \'Unbounded\', sans-serif; font-weight: 700"></option>'
      ].join('');

      const animOptions = () => {
        const calm = ANIM_ALL.filter((a) => ANIM_CALM.includes(a));
        const expr = ANIM_ALL.filter((a) => !ANIM_CALM.includes(a));
        const opt = (a) => `<option value="${a}" data-i18n="ui.anim${a.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}"></option>`;
        return [
          '<optgroup data-i18n-label="ui.animGroupCalm">', calm.map(opt).join(''), '</optgroup>',
          '<optgroup data-i18n-label="ui.animGroupExpressive">', expr.map(opt).join(''), '</optgroup>'
        ].join('');
      };

      return `
        <div class="row">
          <label>
            <span data-i18n="ui.font"></span>
            <select id="${p}fontFamily">${fontOptions}</select>
          </label>
          <label>
            <span data-i18n="ui.align"></span>
            <select id="${p}textAlign">
              <option value="left" data-i18n="ui.alignLeft"></option>
              <option value="center" data-i18n="ui.alignCenter"></option>
              <option value="right" data-i18n="ui.alignRight"></option>
            </select>
          </label>
        </div>

        <div class="row">
          <label>
            <span data-i18n="ui.fontSize"></span>
            <div class="slider-row">
              <input type="range" id="${p}fontSize" min="10" max="${p === 'w_' ? 72 : 36}" value="14">
              <span id="${p}fontSizeVal">14px</span>
            </div>
          </label>
          <label>
            <span data-i18n="ui.lifetime"></span>
            <input type="number" id="${p}messageLifetime" min="0" max="300" value="15">
          </label>
        </div>

        <div class="row">
          <label>
            <span data-i18n="ui.animation"></span>
            <select id="${p}animation">${animOptions()}</select>
          </label>
          <label>
            <span data-i18n="ui.direction"></span>
            <select id="${p}chatDirection">
              <option value="top" data-i18n="ui.dirTop"></option>
              <option value="bottom" data-i18n="ui.dirBottom"></option>
            </select>
          </label>
        </div>

        <label class="checkbox-label">
          <input type="checkbox" id="${p}smoothShift">
          <span data-i18n="ui.smoothShift"></span>
        </label>
        <p class="note" data-i18n="ui.smoothShiftHint"></p>

        <label class="checkbox-label">
          <input type="checkbox" id="${p}solidRibbon">
          <span data-i18n="ui.solidRibbon"></span>
        </label>
        <p class="note" data-i18n="ui.solidRibbonHint"></p>

        <span class="modal-preview-label" data-i18n="ui.appearPreviewLabel"></span>
        <button type="button" class="secondary anim-preview-btn" data-anim-preview="${p}" data-i18n-title="ui.animPreviewTitle" data-i18n="ui.animPreview" style="align-self: flex-start;"></button>
        <div class="anim-preview-stage" data-anim-stage>
          <div class="anim-preview-plate mini-preview-plate" data-anim-plate>
            <span class="mini-author-wrap"><span class="mini-badge">★</span><span class="mini-nick" data-anim-nick>TestViewer</span><span class="mini-colon">: </span></span><span class="mini-text" data-i18n="ui.previewSampleText"></span>
          </div>
        </div>

        <label>
          <span data-i18n="ui.layout"></span>
          <select id="${p}layoutMode">
            <option value="inline" data-i18n="ui.layoutInline"></option>
            <option value="block" data-i18n="ui.layoutBlock"></option>
          </select>
        </label>

        <label>
          <span data-i18n="ui.plateGap"></span>
          <div class="slider-row">
            <input type="range" id="${p}plateGap" min="5" max="40" step="1" value="5">
            <span id="${p}plateGapVal">5px</span>
          </div>
        </label>

        <div class="section-title" data-i18n="ui.customizeSection"></div>
        <div class="style-cards">
          <div class="style-card">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardPlate"></span>
              <span class="style-card-desc" data-i18n="ui.cardPlateDesc"></span>
            </div>
            <button type="button" class="accent" data-open-modal="plate" data-prefix="${p}" data-i18n="ui.btnConfigure"></button>
          </div>
          <div class="style-card">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardText"></span>
              <span class="style-card-desc" data-i18n="ui.cardTextDesc"></span>
            </div>
            <button type="button" class="accent" data-open-modal="text" data-prefix="${p}" data-i18n="ui.btnConfigure"></button>
          </div>
          <div class="style-card">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardNick"></span>
              <span class="style-card-desc" data-i18n="ui.cardNickDesc"></span>
            </div>
            <button type="button" class="accent" data-open-modal="nick" data-prefix="${p}" data-i18n="ui.btnConfigure"></button>
          </div>
          <div class="style-card">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardStyles"></span>
              <span class="style-card-desc" data-i18n="ui.cardStylesDesc"></span>
            </div>
            <div class="style-card-actions">
              <button type="button" class="accent" data-open-extra="userstyles" data-prefix="${p}" data-i18n="ui.btnUserStyles"></button>
              <button type="button" class="accent with-dot" data-open-extra="rotation" data-prefix="${p}"><span class="dot" data-rot-dot="${p}"></span><span data-i18n="ui.btnRotation"></span></button>
              <button type="button" class="accent" data-open-modal="styles" data-prefix="${p}" data-i18n="ui.btnOpenStyles"></button>
            </div>
          </div>
          <div class="style-card">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardImage"></span>
              <span class="style-card-desc" data-i18n="ui.cardImageDesc"></span>
            </div>
            <button type="button" class="accent" data-open-modal="image" data-prefix="${p}" data-i18n="ui.btnConfigure"></button>
          </div>
        </div>

        <hr>

        <label class="checkbox-label"${p === 'w_' ? ' style="display:none"' : ''}>
          <input type="checkbox" id="${p}highlightMentions">
          <span data-i18n="ui.highlightMentions"></span>
        </label>
        <label class="checkbox-label sub" id="${p}mentionLongerLabel"${p === 'w_' ? ' style="display:none"' : ''}>
          <input type="checkbox" id="${p}mentionLonger">
          <span data-i18n="ui.mentionLonger"></span>
        </label>

        <label class="checkbox-label"><input type="checkbox" id="${p}showSub"><span data-i18n="ui.noticeSub"></span></label>
        <label class="checkbox-label"><input type="checkbox" id="${p}showResub"><span data-i18n="ui.noticeResub"></span></label>
        <label class="checkbox-label"><input type="checkbox" id="${p}showGift"><span data-i18n="ui.noticeGift"></span></label>
        <label class="checkbox-label"><input type="checkbox" id="${p}showRaid"><span data-i18n="ui.noticeRaid"></span></label>
      `;
    }

    function readAppearance(p) {
      const a = Object.assign({}, appearanceState[p], {
        messageLifetime: parseInt($(p + 'messageLifetime').value, 10) || 0,
        fontSize: parseInt($(p + 'fontSize').value, 10) || 14,
        plateGap: parseInt($(p + 'plateGap').value, 10) || 5,
        fontFamily: $(p + 'fontFamily').value,
        textAlign: $(p + 'textAlign').value,
        animation: $(p + 'animation').value,
        chatDirection: $(p + 'chatDirection').value,
        layoutMode: $(p + 'layoutMode').value,
        highlightMentions: p === 'w_' ? false : $(p + 'highlightMentions').checked,
        mentionLonger: p === 'w_' ? false : $(p + 'mentionLonger').checked,
        smoothShift: $(p + 'smoothShift').checked,
        solidRibbon: $(p + 'solidRibbon').checked
      });
      NOTICE_IDS.forEach((id) => { a[id] = $(p + id).checked; });
      return a;
    }

    function writeAppearance(p, a) {
      STYLE_KEYS.forEach((k) => {
        if (a[k] !== undefined) appearanceState[p][k] = a[k];
      });
      if (a.messageLifetime !== undefined) $(p + 'messageLifetime').value = a.messageLifetime;
      if (a.plateGap !== undefined) {
        $(p + 'plateGap').value = a.plateGap;
        $(p + 'plateGapVal').textContent = `${a.plateGap}px`;
      }
      if (a.fontSize !== undefined) {
        $(p + 'fontSize').value = a.fontSize;
        $(p + 'fontSizeVal').textContent = `${a.fontSize}px`;
      }
      if (a.fontFamily !== undefined) $(p + 'fontFamily').value = a.fontFamily;
      if (a.textAlign !== undefined) $(p + 'textAlign').value = a.textAlign;
      if (a.animation !== undefined) $(p + 'animation').value = a.animation;
      if (a.chatDirection !== undefined) $(p + 'chatDirection').value = a.chatDirection;
      if (a.layoutMode !== undefined) $(p + 'layoutMode').value = a.layoutMode;
      if (a.highlightMentions !== undefined) $(p + 'highlightMentions').checked = p === 'w_' ? false : !!a.highlightMentions;
      if (a.mentionLonger !== undefined) $(p + 'mentionLonger').checked = p === 'w_' ? false : !!a.mentionLonger;
      if (a.smoothShift !== undefined) $(p + 'smoothShift').checked = !!a.smoothShift;
      if (a.solidRibbon !== undefined) $(p + 'solidRibbon').checked = !!a.solidRibbon;
      NOTICE_IDS.forEach((id) => {
        if (a[id] !== undefined) $(p + id).checked = !!a[id];
      });
      syncMentionDependency(p);
    }

    function syncMentionDependency(p) {
      const on = $(p + 'highlightMentions').checked;
      $(p + 'mentionLonger').disabled = !on;
      $(p + 'mentionLongerLabel').classList.toggle('disabled', !on);
    }

    function wireAppearance(p, onChange) {
      $(p + 'plateGap').addEventListener('input', () => { $(p + 'plateGapVal').textContent = `${$(p + 'plateGap').value}px`; });
      $(p + 'fontSize').addEventListener('input', () => { $(p + 'fontSizeVal').textContent = `${$(p + 'fontSize').value}px`; });
      $(p + 'highlightMentions').addEventListener('change', () => syncMentionDependency(p));
      // ▶ Проигрывает выбранную анимацию на мини-превью, которое цепляет весь текущий стиль плашки
      const previewBtn = document.querySelector(`[data-anim-preview="${p}"]`);
      const stage = previewBtn ? previewBtn.parentElement.querySelector('[data-anim-stage]') : null;
      // Живое обновление превью: стиль подтягивается при любом изменении формы и после модалок,
      // кнопка только проигрывает анимацию
      if (previewBtn && stage) {
        previewBtn.addEventListener('click', () => {
          refreshAnimPreviews();
          playPreviewAnimation(stage.querySelector('[data-anim-plate]'), $(p + 'animation').value);
        });
        const form = $(p === 'o_' ? 'overlay-form' : 'widget-form');
        form.addEventListener('input', refreshAnimPreviews);
        form.addEventListener('change', refreshAnimPreviews);
      }
      if (onChange) {
        $(p === 'o_' ? 'overlay-form' : 'widget-form').addEventListener('input', onChange);
        $(p === 'o_' ? 'overlay-form' : 'widget-form').addEventListener('change', onChange);
      }
    }

    // Мини-движок предпросмотра анимаций (тот же набор, что в chat-view.js, ключевые кадры совпадают)
    const PREVIEW_ANIMATIONS = {
      'fade':         { ms: 500, easing: 'ease-out', kf: [{ opacity: 0 }, { opacity: 1 }] },
      'slide-left':   { ms: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [{ opacity: 0, transform: 'translateX(-42px)' }, { opacity: 1, transform: 'translateX(0)' }] },
      'slide-down':   { ms: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [{ opacity: 0, transform: 'translateY(-36px)' }, { opacity: 1, transform: 'translateY(0)' }] },
      'zoom':         { ms: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'scale(1)' }] },
      'spring-pop':   { ms: 620, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', kf: [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }] },
      'bounce-drop':  { ms: 780, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', kf: [
                        { opacity: 0, transform: 'translateY(-64px)' },
                        { opacity: 1, transform: 'translateY(0)', offset: 0.55, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
                        { transform: 'translateY(-13px)', offset: 0.72, easing: 'ease-out' },
                        { transform: 'translateY(0)', offset: 0.86, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
                        { transform: 'translateY(-4px)', offset: 0.94, easing: 'ease-out' },
                        { opacity: 1, transform: 'translateY(0)' }] },
      'slide-spring': { ms: 700, easing: 'cubic-bezier(0.3, 1.35, 0.55, 1)', kf: [{ opacity: 0, transform: 'translateX(-90px) scale(0.92)' }, { opacity: 1, transform: 'translateX(12px)', offset: 0.72 }, { opacity: 1, transform: 'translateX(0)' }] },
      'flip-in':      { ms: 640, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [
                        { opacity: 0, transform: 'perspective(500px) rotateX(-72deg) translateY(14px)', transformOrigin: '50% 100%' },
                        { opacity: 1, transform: 'perspective(500px) rotateX(8deg)', offset: 0.8, transformOrigin: '50% 100%' },
                        { opacity: 1, transform: 'perspective(500px) rotateX(0deg) translateY(0)', transformOrigin: '50% 100%' }] },
      'rise':         { ms: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', kf: [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'translateY(0)' }] },
      'blur-in':      { ms: 600, easing: 'ease-out', kf: [{ opacity: 0, filter: 'blur(7px)', transform: 'translateY(6px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' }] },
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

    function playPreviewAnimation(plateEl, animKey) {
      const spec = PREVIEW_ANIMATIONS[animKey] || PREVIEW_ANIMATIONS['slide-left'];
      try { plateEl.animate(spec.kf, { duration: spec.ms, easing: spec.easing }); } catch (e) {}
    }

    /* ---------------- Модальное окно Картинки плашки ---------------- */

    // Встроенные картинки-фигуры (data-URI SVG, фиксированные цвета, не зависят от рамки):
    // «наклейки» — сердечки, облачка, звёздочки и т.п. — вместо линий, привязанных к рамке
    function cardPatternCss(name) {
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

    function cardImageCssValue(st) {
      if (st.cardImageCustom) return `url("card://img/${encodeURIComponent(st.cardImageCustom)}")`;
      if (st.cardImagePreset && st.cardImagePreset !== 'none') return cardPatternCss(st.cardImagePreset);
      return 'none';
    }

    function cardImageCssSize(st) {
      const fit = st.cardImageFit || 'width';
      const scale = Math.max(25, Math.min(500, parseInt(st.cardImageScale, 10) || 100)) / 100;
      if (fit === 'cover') return `auto ${Math.round(100 * scale)}%`;
      if (fit === 'tile') return `${Math.round(48 * scale)}px`;
      return scale === 1 ? '100% auto' : `${Math.round(100 * scale)}% auto`;
    }

    function cardImageCssRepeat(st) {
      return (st.cardImageFit || 'width') === 'tile' ? 'repeat' : 'no-repeat';
    }

    let cardImages = []; // библиотека загруженных картинок [{id, name}]; id совпадает с именем файла

    // Перестраивает группу «Своя картинка» из реестра именованных картинок
    async function syncImageModalCustomOption() {
      const st = appearanceState[activeModalTarget];
      cardImages = await window.api.listCardImages();
      const group = $('m_cardImageGroupCustom');
      group.innerHTML = '';
      if (!cardImages.length) {
        const empty = document.createElement('option');
        empty.disabled = true;
        empty.textContent = tr('ui.cardImageCustomNone');
        group.appendChild(empty);
      }
      cardImages.forEach((img) => {
        const opt = document.createElement('option');
        opt.value = `img:${img.id}`;
        opt.textContent = img.name;
        group.appendChild(opt);
      });
      // Текущее значение: своя картинка по sha или встроенный пресет
      $('m_cardImageSource').value = st.cardImageCustom ? `img:${st.cardImageCustom}` : (st.cardImagePreset || 'none');
      $('m_cardImageManageRow').style.display = st.cardImageCustom ? '' : 'none';
    }

    // После переименования или удаления файла подменяем ссылку во всех стилях окна настроек
    function remapCardRefsInState(oldId, newId) {
      Object.keys(appearanceState).forEach((k) => {
        if (appearanceState[k] && appearanceState[k].cardImageCustom === oldId) appearanceState[k].cardImageCustom = newId;
      });
      (customPresets || []).forEach((p) => {
        if (p.appearance && p.appearance.cardImageCustom === oldId) p.appearance.cardImageCustom = newId;
      });
      // Стили по нику хранят собственные копии оформления (в том числе копии удалённых стилей)
      ['o_', 'w_'].forEach((pfx) => {
        extras[pfx].userStyles.forEach((u) => {
          if (u.appearance && u.appearance.cardImageCustom === oldId) u.appearance.cardImageCustom = newId;
        });
      });
    }

    // Где используется своя картинка: вид вкладок, сохранённые стили, стили по нику
    function findCardImageUsage(id) {
      const use = { tabs: [], styles: [], nicks: [] };
      ['o_', 'w_'].forEach((pfx) => {
        if (appearanceState[pfx] && appearanceState[pfx].cardImageCustom === id) use.tabs.push(pfx);
        extras[pfx].userStyles.forEach((u) => {
          if (u.appearance && u.appearance.cardImageCustom === id && !use.nicks.includes(u.nick)) use.nicks.push(u.nick);
        });
      });
      (customPresets || []).forEach((cp) => {
        if (cp.appearance && cp.appearance.cardImageCustom === id) use.styles.push(cp.name);
      });
      return use;
    }

    function findCardImageByValue(srcVal) {
      if (!srcVal || !srcVal.startsWith('img:')) return null;
      const id = srcVal.slice(4);
      return cardImages.find((i) => i.id === id) || null;
    }

    // Загрузка своей картинки: PNG/JPEG/WebP → (уменьшение до 1920 px) → canvas → WebP → userData/card-images/<имя>.webp.
    // Анимация отсекается: у кадра GIF/APNG/WebP берётся только первый кадр при конвертации в canvas.
    async function handleCardImageUpload(file) {
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return;
      if (file.size > CARD_IMAGE_MAX_BYTES) {
        alert(tr('ui.cardImageTooBig'));
        return;
      }

      const buf = await file.arrayBuffer();
      const blob = new Blob([buf], { type: file.type });
      const bitmap = await createImageBitmap(blob).catch(() => null);
      if (!bitmap) {
        alert(tr('ui.cardImageAnimated'));
        return;
      }
      const longSide = Math.max(bitmap.width, bitmap.height);
      if (longSide > CARD_IMAGE_MAX_SOURCE_SIDE) {
        bitmap.close && bitmap.close();
        alert(tr('ui.cardImageBadSize'));
        return;
      }

      // Крупные изображения уменьшаются, а не отклоняются: плашке не нужно больше 1920 px
      const k = longSide > CARD_IMAGE_MAX_SIDE ? CARD_IMAGE_MAX_SIDE / longSide : 1;
      const w = Math.max(1, Math.round(bitmap.width * k));
      const h = Math.max(1, Math.round(bitmap.height * k));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close && bitmap.close();

      const toWebp = (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      let webpBlob = await toWebp(0.9);
      if (webpBlob && webpBlob.size > CARD_IMAGE_RESULT_MAX_BYTES) webpBlob = await toWebp(0.75);
      if (!webpBlob || webpBlob.size > CARD_IMAGE_RESULT_MAX_BYTES) {
        alert(tr('ui.cardImageResultTooBig'));
        return;
      }
      const webpBuf = await webpBlob.arrayBuffer();
      const name = ($('m_cardImageName').value || '').trim() || (file.name || 'Picture').replace(/\.[^.]+$/, '');
      const res = await window.api.saveCardImage(webpBuf, name);
      if (!res || !res.ok) {
        alert(tr(res && res.error === 'size' ? 'ui.cardImageResultTooBig' : 'ui.cardImageSaveFailed'));
        return;
      }

      const st = appearanceState[activeModalTarget];
      st.cardImageCustom = res.id;
      st.cardImagePreset = 'none';
      // Свежая картинка встаёт с базовыми значениями посадки, не перетирая стиль плашки
      st.cardImageFit = 'width';
      st.cardImagePosX = 50;
      st.cardImagePosY = 50;
      st.cardImageOpacity = 60;
      st.cardImageScale = 100;
      await syncImageModalCustomOption();
      $('m_cardImageSource').value = `img:${res.id}`;
      $('m_cardImageName').value = res.name;
      $('m_cardImageManageRow').style.display = '';
      $('m_cardImageFit').value = 'width';
      $('m_cardImagePosX').value = 50; $('m_cardImagePosXVal').textContent = '50%';
      $('m_cardImagePosY').value = 50; $('m_cardImagePosYVal').textContent = '50%';
      $('m_cardImageOpacity').value = 60; $('m_cardImageOpacityVal').textContent = '60%';
      $('m_cardImageScale').value = 100; $('m_cardImageScaleVal').textContent = '100%';
      updateMiniPreviews(activeModalTarget);
      triggerTargetPreview(activeModalTarget);
    }

    /* ---------------- Модальное окно Стилей и пресетов ---------------- */

    function applyStyleObjectToTarget(prefix, styleObj) {
      if (!styleObj) return;
      // Пресет задаёт ВСЕ свои настройки целиком, включая картинку: сначала сбрасываем
      // картинку на задуманные в пресете значения (а не на текущие пользовательские),
      // затем накладываем остальные ключи стиля
      CARD_RESET_KEYS.forEach((k) => {
        appearanceState[prefix][k] = styleObj[k] !== undefined ? styleObj[k] : CARD_RESET_DEFAULTS[k];
      });
      STYLE_KEYS.forEach((k) => {
        if (styleObj[k] !== undefined) {
          appearanceState[prefix][k] = styleObj[k];
        }
      });
      if (styleObj.fontFamily !== undefined) $(prefix + 'fontFamily').value = styleObj.fontFamily;
      if (styleObj.textAlign !== undefined) $(prefix + 'textAlign').value = styleObj.textAlign;
      if (styleObj.layoutMode !== undefined) $(prefix + 'layoutMode').value = styleObj.layoutMode;
      if (styleObj.animation !== undefined) $(prefix + 'animation').value = styleObj.animation;
      triggerTargetPreview(prefix);
    }

    // Ключи картинки, которые пресет всегда выставляет явно (полный сброс, а не «поверх текущего»)
    const CARD_RESET_KEYS = ['cardImagePreset', 'cardImageCustom', 'cardImageFit', 'cardImagePosX', 'cardImagePosY', 'cardImageOpacity', 'cardImageScale'];
    const CARD_RESET_DEFAULTS = {
      cardImagePreset: 'none', cardImageCustom: '', cardImageFit: 'width',
      cardImagePosX: 50, cardImagePosY: 50, cardImageOpacity: 60, cardImageScale: 100
    };

    // Примерка стиля при наведении: меняет ТОЛЬКО превью в модалке, форма, оверлей и виджет не затрагиваются
    function hoverPreviewStyle(styleObj) {
      const el = document.querySelector('#modal-styles [data-mini-preview]');
      if (!el || !styleObj) return;
      const cfg = Object.assign({}, readAppearance(activeModalTarget));
      CARD_RESET_KEYS.forEach((k) => { cfg[k] = styleObj[k] !== undefined ? styleObj[k] : CARD_RESET_DEFAULTS[k]; });
      STYLE_KEYS.concat(['fontFamily', 'textAlign', 'layoutMode']).forEach((k) => {
        if (styleObj[k] !== undefined) cfg[k] = styleObj[k];
      });
      paintMiniPlate(el, cfg, ['mini-preview-plate']);
    }

    // Курсор ушёл со строки: превью снова показывает реально применённый (нажатый) стиль
    function restorePreviewStyle() {
      const el = document.querySelector('#modal-styles [data-mini-preview]');
      if (el) paintMiniPlate(el, readAppearance(activeModalTarget), ['mini-preview-plate']);
    }

    function wirePresetHover(item, styleObj) {
      item.addEventListener('mouseenter', () => hoverPreviewStyle(styleObj));
      item.addEventListener('mouseleave', restorePreviewStyle);
    }

    function renderPresetsLists() {
      updateRotationDots();
      const builtinBox = $('builtin-presets-list');
      const customBox = $('custom-presets-list');
      if (!builtinBox || !customBox) return;

      builtinBox.innerHTML = '';

      // Первая строка — возврат к виду, который был у пользователя до открытия окна пресетов
      const currentRow = document.createElement('div');
      currentRow.className = 'preset-item' + (selectedPresetKey === 'current' ? ' active' : '');
      currentRow.innerHTML = `
        <div class="preset-info">
          <span class="preset-title">${escapeHtml(tr('ui.presetCurrent'))}</span>
          <span class="preset-desc">${escapeHtml(tr('ui.presetCurrentDesc'))}</span>
        </div>
      `;
      currentRow.onclick = () => {
        selectedPresetKey = 'current';
        if (modalSnapshot) {
          applyStyleObjectToTarget(activeModalTarget, modalSnapshot);
        }
        renderPresetsLists();
      };
      if (modalSnapshot) wirePresetHover(currentRow, modalSnapshot);
      builtinBox.appendChild(currentRow);

      // Встроенные пресеты, сгруппированные: «Простые» и «С картинкой».
      // Каждый ряд несёт миниатюру-плашку с образцом стиля, чтобы стиль был виден ещё до клика.
      const builtinRow = (preset) => {
        const key = `builtin:${preset.id}`;
        const item = document.createElement('div');
        item.className = 'preset-item' + (selectedPresetKey === key ? ' active' : '');

        const thumb = document.createElement('div');
        thumb.className = 'preset-thumb mini-preview-plate';
        applyThumbStyle(thumb, preset.style);
        thumb.innerHTML = '<span class="mini-text">Aa</span>';
        item.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'preset-info';
        info.innerHTML = `
          <span class="preset-title">${escapeHtml(tr(preset.titleKey))}</span>
          <span class="preset-desc">${escapeHtml(tr(preset.descKey))}</span>
        `;
        item.appendChild(info);

        wirePresetHover(item, preset.style);
        item.onclick = () => {
          selectedPresetKey = key;
          applyStyleObjectToTarget(activeModalTarget, preset.style);
          renderPresetsLists();
        };
        return item;
      };

      const groupTitle = (labelKey) => {
        const t = document.createElement('span');
        t.className = 'section-title';
        t.textContent = tr(labelKey);
        return t;
      };

      const simple = BUILTIN_PRESETS.filter((p) => p.group !== 'image');
      const withImage = BUILTIN_PRESETS.filter((p) => p.group === 'image');
      builtinBox.appendChild(groupTitle('ui.presetGroupSimple'));
      simple.forEach((preset) => builtinBox.appendChild(builtinRow(preset)));
      if (withImage.length) {
        builtinBox.appendChild(groupTitle('ui.presetGroupImage'));
        withImage.forEach((preset) => builtinBox.appendChild(builtinRow(preset)));
      }

      renderPresetConfirmBars();

      // Пользовательские стили
      customBox.innerHTML = '';
      if (!Array.isArray(customPresets) || customPresets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'preset-empty';
        empty.textContent = tr('ui.stylesEmptyCustom');
        customBox.appendChild(empty);
        return;
      }

      customPresets.forEach((cp, idx) => {
        const key = `custom:${idx}`;
        const item = document.createElement('div');
        item.className = 'preset-item' + (selectedPresetKey === key ? ' active' : '');

        const info = document.createElement('div');
        info.className = 'preset-info';
        info.innerHTML = `<span class="preset-title">${escapeHtml(cp.name)}</span>` +
          (cp.locked ? `<span class="preset-desc preset-badge">${escapeHtml(tr('ui.presetLockedBadge'))}</span>` : '');
        item.appendChild(info);
        wirePresetHover(item, cp.appearance);

        // Замок: стиль не участвует в ротации и не входит в счётчик «Все мои стили»
        const lockBtn = document.createElement('button');
        lockBtn.type = 'button';
        lockBtn.className = 'preset-lock-btn' + (cp.locked ? ' on' : '');
        const lockTip = tr(cp.locked ? 'ui.presetLockOn' : 'ui.presetLockOff');
        lockBtn.dataset.tip = lockTip;
        lockBtn.setAttribute('aria-label', lockTip);
        lockBtn.setAttribute('aria-pressed', cp.locked ? 'true' : 'false');
        lockBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${cp.locked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="${cp.locked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.5-2'}"/></svg>`;
        lockBtn.onclick = (e) => {
          e.stopPropagation();
          toggleStyleLock(cp.name);
        };
        item.appendChild(lockBtn);

        // «Перезаписать»: текущий вид активной вкладки уходит в этот стиль под его именем (через то же подтверждение)
        const owBtn = document.createElement('button');
        owBtn.type = 'button';
        owBtn.className = 'preset-overwrite-btn';
        owBtn.textContent = tr('ui.btnOverwritePreset');
        owBtn.onclick = (e) => {
          e.stopPropagation();
          pendingPresetDelete = null;
          pendingPresetOverwrite = { name: cp.name, appearance: Object.assign({}, readAppearance(activeModalTarget)) };
          renderPresetConfirmBars();
          $('preset-overwrite-confirm').scrollIntoView({ block: 'nearest' });
        };
        item.appendChild(owBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'preset-delete-btn';
        delBtn.textContent = tr('ui.btnDeletePreset');
        delBtn.onclick = (e) => {
          e.stopPropagation();
          pendingPresetOverwrite = null;
          pendingPresetDelete = { name: cp.name };
          renderPresetConfirmBars();
          $('preset-delete-confirm').scrollIntoView({ block: 'nearest' });
        };
        item.appendChild(delBtn);

        item.onclick = () => {
          selectedPresetKey = key;
          applyStyleObjectToTarget(activeModalTarget, cp.appearance);
          renderPresetsLists();
        };

        customBox.appendChild(item);
      });
    }

    async function saveCurrentAsCustomPreset() {
      const nameInput = $('m_presetNameInput');
      const name = (nameInput.value || '').trim();
      if (!name) {
        nameInput.focus();
        return;
      }

      const fullCurrent = readAppearance(activeModalTarget);
      const existingIdx = customPresets.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        pendingPresetDelete = null;
        pendingPresetOverwrite = { name: customPresets[existingIdx].name, appearance: Object.assign({}, fullCurrent) };
        renderPresetConfirmBars();
        return;
      }

      customPresets.push({
        name,
        appearance: Object.assign({}, fullCurrent)
      });
      selectedPresetKey = `custom:${customPresets.length - 1}`;

      pendingPresetOverwrite = null;
      nameInput.value = '';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    // Ники (в обеих вкладках), которым назначен этот сохранённый стиль
    function nicksUsingStyle(name) {
      const key = `custom:${String(name).toLowerCase()}`;
      const out = [];
      ['o_', 'w_'].forEach((p) => {
        extras[p].userStyles.forEach((u) => {
          if (String(u.styleKey).toLowerCase() === key && !out.includes(u.nick)) out.push(u.nick);
        });
      });
      return out;
    }

    // Замок на своём стиле: он не участвует в ротации. Если из-за этого ротация перестаёт работать, выключаем её явно и сообщаем.
    async function toggleStyleLock(name) {
      const cp = customPresets.find((x) => x.name === name);
      if (!cp) return;
      const before = ['o_', 'w_'].filter((p) => readExtras(p).rotation.enabled);
      cp.locked = !cp.locked;
      const stopped = before.filter((p) => !readExtras(p).rotation.enabled);
      const note = $('preset-lock-note');
      if (stopped.length) {
        note.textContent = trf('ui.presetLockRotationOff', {
          tabs: stopped.map((p) => tr(p === 'o_' ? 'ui.tabOverlay' : 'ui.tabWidget')).join(', ')
        });
        note.classList.remove('hidden');
      } else {
        note.classList.add('hidden');
      }
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    function renderPresetConfirmBars() {
      $('preset-overwrite-confirm').classList.toggle('hidden', !pendingPresetOverwrite);
      if (pendingPresetOverwrite) {
        $('preset-overwrite-text').textContent = trf('ui.stylesOverwriteConfirm', { name: pendingPresetOverwrite.name });
      }
      $('preset-delete-confirm').classList.toggle('hidden', !pendingPresetDelete);
      if (pendingPresetDelete) {
        let text = trf('ui.stylesDeleteConfirm', { name: pendingPresetDelete.name });
        const nicks = nicksUsingStyle(pendingPresetDelete.name);
        if (nicks.length) text += ' ' + trf('ui.stylesDeleteUsedBy', { list: nicks.join(', ') });
        $('preset-delete-text').textContent = text;
      }
    }

    function cancelPresetConfirms() {
      pendingPresetOverwrite = null;
      pendingPresetDelete = null;
      renderPresetConfirmBars();
    }

    async function confirmPresetOverwrite() {
      const pending = pendingPresetOverwrite;
      if (!pending) return;
      pendingPresetOverwrite = null;
      const idx = customPresets.findIndex((p) => p.name.toLowerCase() === pending.name.toLowerCase());
      if (idx >= 0) {
        customPresets[idx].appearance = pending.appearance;
        selectedPresetKey = `custom:${idx}`;
      } else {
        customPresets.push({ name: pending.name, locked: false, appearance: pending.appearance });
        selectedPresetKey = `custom:${customPresets.length - 1}`;
      }
      $('m_presetNameInput').value = '';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    async function confirmPresetDelete() {
      const pending = pendingPresetDelete;
      if (!pending) return;
      pendingPresetDelete = null;
      const idx = customPresets.findIndex((p) => p.name.toLowerCase() === pending.name.toLowerCase());
      if (idx < 0) {
        renderPresetConfirmBars();
        return;
      }
      customPresets.splice(idx, 1);
      if (selectedPresetKey === `custom:${idx}`) selectedPresetKey = 'current';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    /* ---------------- Модальные окна кастомизации стилей ---------------- */

    function syncPlateModalVisibility() {
      const mode = $('m_bgMode').value;
      const effect = $('m_borderEffect').value;
      const isAnimated = ANIMATED_EFFECTS.includes(effect);
      $('m_bgColor2Wrap').classList.toggle('hidden', mode !== 'grad-dual');
      $('m_bgMonoModeWrap').classList.toggle('hidden', mode !== 'grad-mono');
      $('m_bgDirectionWrap').classList.toggle('hidden', mode === 'solid');
      $('m_borderColor2Wrap').classList.toggle('hidden', effect !== 'cyber');
      $('m_borderEffectSpeedWrap').classList.toggle('hidden', !isAnimated);
      $('m_borderEffectSyncWrap').classList.toggle('hidden', !isAnimated);
    }

    function syncNickModalDisabled() {
      const enabled = $('m_customNickEnabled').checked;
      $('m_nickControlsBox').classList.toggle('disabled', !enabled);
      $('m_customNickColor').disabled = !enabled;
      $('m_customNickOutlineWidth').disabled = !enabled;
      $('m_customNickOutlineColor').disabled = !enabled;
    }

    function populateModalInputsFromState(kind, st) {
      if (kind === 'plate') {
        $('m_bgMode').value = st.bgMode || 'solid';
        $('m_bgColor1').value = st.bgColor1 || '#000000';
        $('m_bgColor2').value = st.bgColor2 || '#251640';
        $('m_bgMonoMode').value = st.bgMonoMode || 'tone';
        $('m_bgDirection').value = st.bgDirection || 'to right';
        $('m_bgOpacity').value = st.bgOpacity !== undefined ? st.bgOpacity : 50;
        $('m_bgOpacityVal').textContent = `${$('m_bgOpacity').value}%`;
        $('m_plateShape').value = st.plateShape === 'strict' ? 'strict' : 'rounded';
        $('m_borderWidth').value = st.borderWidth || 0;
        $('m_borderWidthVal').textContent = `${$('m_borderWidth').value}px`;
        $('m_borderColor').value = st.borderColor || '#9146FF';
        $('m_borderColor2').value = st.borderColor2 || '#FFFFFF';
        $('m_borderEffect').value = st.borderEffect || 'static';
        $('m_borderEffectSpeed').value = st.borderEffectSpeed !== undefined ? st.borderEffectSpeed : 5;
        $('m_borderEffectSpeedVal').textContent = `${$('m_borderEffectSpeed').value}`;
        $('m_borderEffectSync').checked = !!st.borderEffectSync;
        syncPlateModalVisibility();
      } else if (kind === 'text') {
        $('m_textColor').value = st.textColor || '#FFFFFF';
        $('m_textOutlineWidth').value = st.textOutlineWidth !== undefined ? st.textOutlineWidth : 2;
        $('m_textOutlineWidthVal').textContent = `${$('m_textOutlineWidth').value}px`;
        $('m_textOutlineColor').value = st.textOutlineColor || '#000000';
      } else if (kind === 'nick') {
        $('m_customNickEnabled').checked = !!st.customNickEnabled;
        $('m_customNickColor').value = st.customNickColor || '#9146FF';
        $('m_customNickOutlineWidth').value = st.customNickOutlineWidth !== undefined ? st.customNickOutlineWidth : 2;
        $('m_customNickOutlineWidthVal').textContent = `${$('m_customNickOutlineWidth').value}px`;
        $('m_customNickOutlineColor').value = st.customNickOutlineColor || '#000000';
        syncNickModalDisabled();
      } else if (kind === 'image') {
        $('img-delete-confirm').classList.add('hidden');
        syncImageModalCustomOption();
        $('m_cardImageFit').value = st.cardImageFit || 'width';
        $('m_cardImageScale').value = st.cardImageScale !== undefined ? st.cardImageScale : 100;
        $('m_cardImageScaleVal').textContent = `${$('m_cardImageScale').value}%`;
        $('m_cardImageOpacity').value = st.cardImageOpacity !== undefined ? st.cardImageOpacity : 60;
        $('m_cardImageOpacityVal').textContent = `${$('m_cardImageOpacity').value}%`;
        $('m_cardImagePosX').value = st.cardImagePosX !== undefined ? st.cardImagePosX : 50;
        $('m_cardImagePosXVal').textContent = `${$('m_cardImagePosX').value}%`;
        $('m_cardImagePosY').value = st.cardImagePosY !== undefined ? st.cardImagePosY : 50;
        $('m_cardImagePosYVal').textContent = `${$('m_cardImagePosY').value}%`;
      } else if (kind === 'styles') {
        selectedPresetKey = 'current';
        $('m_presetNameInput').value = '';
        pendingPresetOverwrite = null;
        pendingPresetDelete = null;
        $('preset-lock-note').classList.add('hidden');
        renderPresetsLists();
      }
      updateMiniPreviews(activeModalTarget);
    }

    function openStyleModal(kind, prefix) {
      activeModalTarget = prefix;
      $('m_cardImageScopeNote').style.display = prefix === 'w_' ? 'none' : '';
      $('m_cardImageScopeNoteW').style.display = prefix === 'w_' ? '' : 'none';
      modalSnapshot = Object.assign({}, readAppearance(prefix));
      populateModalInputsFromState(kind, appearanceState[prefix]);
      $(`modal-${kind}`).classList.remove('hidden');
    }

    function resetModalToDefaults(kind) {
      const st = appearanceState[activeModalTarget];
      const d = defaultAppearance;
      if (kind === 'plate') {
        Object.assign(st, {
          bgMode: d.bgMode,
          bgColor1: d.bgColor1,
          bgColor2: d.bgColor2,
          bgMonoMode: d.bgMonoMode,
          bgDirection: d.bgDirection,
          bgOpacity: d.bgOpacity,
          plateShape: d.plateShape,
          borderWidth: d.borderWidth,
          borderColor: d.borderColor,
          borderColor2: d.borderColor2,
          borderEffect: d.borderEffect,
          borderEffectSpeed: d.borderEffectSpeed,
          borderEffectSync: !!d.borderEffectSync
        });
      } else if (kind === 'text') {
        Object.assign(st, {
          textColor: d.textColor,
          textOutlineWidth: d.textOutlineWidth,
          textOutlineColor: d.textOutlineColor
        });
      } else if (kind === 'nick') {
        Object.assign(st, {
          customNickEnabled: d.customNickEnabled,
          customNickColor: d.customNickColor,
          customNickOutlineWidth: d.customNickOutlineWidth,
          customNickOutlineColor: d.customNickOutlineColor
        });
      } else if (kind === 'image') {
        Object.assign(st, {
          cardImagePreset: d.cardImagePreset || 'none',
          cardImageCustom: '',
          cardImageFit: d.cardImageFit || 'width',
          cardImagePosX: d.cardImagePosX !== undefined ? d.cardImagePosX : 50,
          cardImagePosY: d.cardImagePosY !== undefined ? d.cardImagePosY : 50,
          cardImageOpacity: d.cardImageOpacity !== undefined ? d.cardImageOpacity : 60,
          cardImageScale: d.cardImageScale !== undefined ? d.cardImageScale : 100
        });
      }
      populateModalInputsFromState(kind, st);
      triggerTargetPreview(activeModalTarget);
    }

    function readModalIntoState(kind) {
      const st = appearanceState[activeModalTarget];
      if (kind === 'plate') {
        st.bgMode = $('m_bgMode').value;
        st.bgColor1 = $('m_bgColor1').value;
        st.bgColor2 = $('m_bgColor2').value;
        st.bgMonoMode = $('m_bgMonoMode').value;
        st.bgDirection = $('m_bgDirection').value;
        st.bgOpacity = parseInt($('m_bgOpacity').value, 10) || 0;
        st.plateShape = $('m_plateShape').value;
        st.borderWidth = parseInt($('m_borderWidth').value, 10) || 0;
        st.borderColor = $('m_borderColor').value;
        st.borderColor2 = $('m_borderColor2').value;
        st.borderEffect = $('m_borderEffect').value;
        st.borderEffectSpeed = parseInt($('m_borderEffectSpeed').value, 10) || 5;
        st.borderEffectSync = $('m_borderEffectSync').checked;
      } else if (kind === 'text') {
        st.textColor = $('m_textColor').value;
        st.textOutlineWidth = parseInt($('m_textOutlineWidth').value, 10) || 0;
        st.textOutlineColor = $('m_textOutlineColor').value;
      } else if (kind === 'nick') {
        st.customNickEnabled = $('m_customNickEnabled').checked;
        st.customNickColor = $('m_customNickColor').value;
        st.customNickOutlineWidth = parseInt($('m_customNickOutlineWidth').value, 10) || 0;
        st.customNickOutlineColor = $('m_customNickOutlineColor').value;
      } else if (kind === 'image') {
        const prevSrc = st.cardImageCustom ? `img:${st.cardImageCustom}` : st.cardImagePreset;
        const srcVal = $('m_cardImageSource').value;
        const changed = srcVal !== prevSrc;
        const isCustom = srcVal.startsWith('img:');
        st.cardImagePreset = isCustom ? 'none' : srcVal;
        st.cardImageCustom = isCustom ? srcVal.slice(4) : '';
        if (changed) {
          if (isCustom) {
            // Своя картинка из библиотеки: базовые значения посадки, стиль плашки не трогаем
            st.cardImageFit = 'width'; st.cardImagePosX = 50; st.cardImagePosY = 50;
            st.cardImageOpacity = 60; st.cardImageScale = 100;
            $('m_cardImageFit').value = 'width';
            $('m_cardImagePosX').value = 50; $('m_cardImagePosXVal').textContent = '50%';
            $('m_cardImagePosY').value = 50; $('m_cardImagePosYVal').textContent = '50%';
            $('m_cardImageOpacity').value = 60; $('m_cardImageOpacityVal').textContent = '60%';
            $('m_cardImageScale').value = 100; $('m_cardImageScaleVal').textContent = '100%';
          } else {
            // Смена встроенной картинки: её задуманные базовые значения
            const base = CARD_IMAGE_BASE[srcVal] || { fit: 'width', posX: 50, posY: 50, opacity: 60, scale: 100 };
            st.cardImageFit = base.fit; st.cardImagePosX = base.posX; st.cardImagePosY = base.posY;
            st.cardImageOpacity = base.opacity; st.cardImageScale = base.scale;
            $('m_cardImageFit').value = base.fit;
            $('m_cardImagePosX').value = base.posX; $('m_cardImagePosXVal').textContent = base.posX + '%';
            $('m_cardImagePosY').value = base.posY; $('m_cardImagePosYVal').textContent = base.posY + '%';
            $('m_cardImageOpacity').value = base.opacity; $('m_cardImageOpacityVal').textContent = base.opacity + '%';
            $('m_cardImageScale').value = base.scale; $('m_cardImageScaleVal').textContent = base.scale + '%';
          }
        } else {
          st.cardImageFit = $('m_cardImageFit').value;
          st.cardImageScale = parseInt($('m_cardImageScale').value, 10) || 100;
          st.cardImageOpacity = parseInt($('m_cardImageOpacity').value, 10) || 0;
          st.cardImagePosX = parseInt($('m_cardImagePosX').value, 10) || 0;
          st.cardImagePosY = parseInt($('m_cardImagePosY').value, 10) || 0;
        }
        $('m_cardImageManageRow').style.display = st.cardImageCustom ? '' : 'none';
        // Поле имени обновляется только при смене картинки: иначе оно «залипает» и не даёт печатать
        if (changed) {
          const entry = st.cardImageCustom ? findCardImageByValue(srcVal) : null;
          $('m_cardImageName').value = entry ? entry.name : '';
        }
      }
      updateMiniPreviews(activeModalTarget);
    }

    function triggerTargetPreview(prefix) {
      updateMiniPreviews(prefix);
      if (prefix === 'o_') schedulePreview();
      else scheduleWidgetPreview();
    }

    async function closeStyleModal(kind, applyAndSave) {
      if (!applyAndSave && modalSnapshot) {
        writeAppearance(activeModalTarget, modalSnapshot);
        triggerTargetPreview(activeModalTarget);
      }
      modalSnapshot = null;
      if (kind === 'styles') cancelPresetConfirms();
      $(`modal-${kind}`).classList.add('hidden');
      if (applyAndSave) {
        await save({ forceReconnect: false });
      }
    }

    function wireStyleModals() {
      document.querySelectorAll('[data-open-modal]').forEach((btn) => {
        btn.addEventListener('click', () => openStyleModal(btn.dataset.openModal, btn.dataset.prefix));
      });

      document.querySelectorAll('[data-modal-cancel]').forEach((btn) => {
        btn.addEventListener('click', () => closeStyleModal(btn.dataset.modalCancel, false));
      });

      document.querySelectorAll('[data-modal-reset]').forEach((btn) => {
        btn.addEventListener('click', () => resetModalToDefaults(btn.dataset.modalReset));
      });

      document.querySelectorAll('[data-modal-apply]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const kind = btn.dataset.modalApply;
          if (kind !== 'styles') {
            readModalIntoState(kind);
          }
          triggerTargetPreview(activeModalTarget);
          await closeStyleModal(kind, true);
        });
      });

      $('btn-save-custom-preset').addEventListener('click', saveCurrentAsCustomPreset);
      $('btn-preset-overwrite-ok').addEventListener('click', confirmPresetOverwrite);
      $('btn-preset-overwrite-cancel').addEventListener('click', cancelPresetConfirms);
      $('btn-preset-delete-ok').addEventListener('click', confirmPresetDelete);
      $('btn-preset-delete-cancel').addEventListener('click', cancelPresetConfirms);
      $('m_presetNameInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCurrentAsCustomPreset();
        }
      });

      // Live-preview при любом изменении внутри модальных окон
      $('m_bgMode').addEventListener('change', () => {
        syncPlateModalVisibility();
        readModalIntoState('plate');
        triggerTargetPreview(activeModalTarget);
      });
      // Анимированный эффект (кроме «Кибер») рисуется рамкой минимум 1 px. Показываем это число на ползунке,
      // а если подняли его мы, а не пользователь, то при возврате к обычной рамке возвращаем 0.
      let borderWidthAutoRaised = false;
      $('m_borderEffect').addEventListener('change', () => {
        const effect = $('m_borderEffect').value;
        const needsLine = effect !== 'static' && effect !== 'cyber';
        const widthEl = $('m_borderWidth');
        if (needsLine && (parseInt(widthEl.value, 10) || 0) < 1) {
          widthEl.value = 1;
          $('m_borderWidthVal').textContent = '1px';
          borderWidthAutoRaised = true;
        } else if (!needsLine && borderWidthAutoRaised) {
          widthEl.value = 0;
          $('m_borderWidthVal').textContent = '0px';
          borderWidthAutoRaised = false;
        }
        syncPlateModalVisibility();
        readModalIntoState('plate');
        triggerTargetPreview(activeModalTarget);
      });
      $('m_bgOpacity').addEventListener('input', () => {
        $('m_bgOpacityVal').textContent = `${$('m_bgOpacity').value}%`;
      });
      $('m_borderWidth').addEventListener('input', () => {
        borderWidthAutoRaised = false;
        $('m_borderWidthVal').textContent = `${$('m_borderWidth').value}px`;
      });
      $('m_borderEffectSpeed').addEventListener('input', () => {
        $('m_borderEffectSpeedVal').textContent = `${$('m_borderEffectSpeed').value}`;
      });
      $('modal-plate').addEventListener('input', () => {
        readModalIntoState('plate');
        triggerTargetPreview(activeModalTarget);
      });
      $('modal-plate').addEventListener('change', () => {
        readModalIntoState('plate');
        triggerTargetPreview(activeModalTarget);
      });

      $('m_textOutlineWidth').addEventListener('input', () => {
        $('m_textOutlineWidthVal').textContent = `${$('m_textOutlineWidth').value}px`;
      });
      $('modal-text').addEventListener('input', () => {
        readModalIntoState('text');
        triggerTargetPreview(activeModalTarget);
      });

      $('m_customNickEnabled').addEventListener('change', () => {
        syncNickModalDisabled();
        readModalIntoState('nick');
        triggerTargetPreview(activeModalTarget);
      });
      $('m_customNickOutlineWidth').addEventListener('input', () => {
        $('m_customNickOutlineWidthVal').textContent = `${$('m_customNickOutlineWidth').value}px`;
      });
      $('modal-nick').addEventListener('input', () => {
        readModalIntoState('nick');
        triggerTargetPreview(activeModalTarget);
      });

      // Модальное окно Картинки плашки
      $('m_cardImageScale').addEventListener('input', () => {
        $('m_cardImageScaleVal').textContent = `${$('m_cardImageScale').value}%`;
      });
      $('m_cardImageOpacity').addEventListener('input', () => {
        $('m_cardImageOpacityVal').textContent = `${$('m_cardImageOpacity').value}%`;
      });
      $('m_cardImagePosX').addEventListener('input', () => {
        $('m_cardImagePosXVal').textContent = `${$('m_cardImagePosX').value}%`;
      });
      $('m_cardImagePosY').addEventListener('input', () => {
        $('m_cardImagePosYVal').textContent = `${$('m_cardImagePosY').value}%`;
      });
      $('m_cardImageFile').addEventListener('change', (e) => {
        handleCardImageUpload(e.target.files && e.target.files[0]);
        e.target.value = ''; // позволяет выбрать тот же файл повторно
      });
      // Переименовать выбранную свою картинку
      $('m_cardImageRename').addEventListener('click', async () => {
        const st = appearanceState[activeModalTarget];
        if (!st.cardImageCustom) return;
        const name = ($('m_cardImageName').value || '').trim();
        if (!name) return;
        const res = await window.api.renameCardImage(st.cardImageCustom, name);
        if (!res || !res.ok) return;
        remapCardRefsInState(res.oldId, res.id);
        await syncImageModalCustomOption();
        $('m_cardImageSource').value = `img:${res.id}`;
        $('m_cardImageName').value = res.name;
        updateMiniPreviews(activeModalTarget);
        triggerTargetPreview(activeModalTarget);
      });
      // Удалить выбранную свою картинку из библиотеки. Перед удалением показываем, где она используется
      // (вид другой вкладки, сохранённые стили, стили по нику), и удаляем только после подтверждения.
      function hideImageDeleteConfirm() {
        $('img-delete-confirm').classList.add('hidden');
      }
      $('m_cardImageSource').addEventListener('change', hideImageDeleteConfirm);
      $('m_cardImageDelete').addEventListener('click', () => {
        const st = appearanceState[activeModalTarget];
        if (!st.cardImageCustom) return;
        const id = st.cardImageCustom;
        const use = findCardImageUsage(id);
        const otherTabs = use.tabs.filter((pfx) => pfx !== activeModalTarget);
        const parts = [];
        if (otherTabs.length) parts.push(trf('ui.cardImageUseTabs', { list: otherTabs.map((pfx) => tr(pfx === 'o_' ? 'ui.tabOverlay' : 'ui.tabWidget')).join(', ') }));
        if (use.styles.length) parts.push(trf('ui.cardImageUseStyles', { list: use.styles.join(', ') }));
        if (use.nicks.length) parts.push(trf('ui.cardImageUseNicks', { list: use.nicks.join(', ') }));
        $('img-delete-text').textContent = parts.length
          ? trf('ui.cardImageDeleteUsed', { name: id, where: parts.join('; ') })
          : trf('ui.cardImageDeleteUnused', { name: id });
        $('img-delete-ok').textContent = tr(parts.length ? 'ui.cardImageDeleteEverywhere' : 'ui.cardImageDeleteOk');
        $('img-delete-confirm').classList.remove('hidden');
        $('img-delete-confirm').scrollIntoView({ block: 'nearest' });
      });
      $('img-delete-cancel').addEventListener('click', hideImageDeleteConfirm);
      $('img-delete-ok').addEventListener('click', async () => {
        hideImageDeleteConfirm();
        const st = appearanceState[activeModalTarget];
        const deletedId = st.cardImageCustom;
        if (!deletedId) return;
        await window.api.deleteCardImage(deletedId);
        remapCardRefsInState(deletedId, '');
        st.cardImageCustom = '';
        st.cardImagePreset = 'none';
        await syncImageModalCustomOption();
        $('m_cardImageSource').value = 'none';
        $('m_cardImageName').value = '';
        $('m_cardImageManageRow').style.display = 'none';
        updateMiniPreviews(activeModalTarget);
        triggerTargetPreview(activeModalTarget);
      });
      $('modal-image').addEventListener('input', () => {
        readModalIntoState('image');
        triggerTargetPreview(activeModalTarget);
      });
      $('modal-image').addEventListener('change', () => {
        readModalIntoState('image');
        triggerTargetPreview(activeModalTarget);
      });
    }

    /* ---------------- Стили по нику, ротация стилей, кнопка скрытия оверлея ---------------- */

    function renderOverlayToggle(visible) {
      overlayVisible = !!visible;
      const b = $('btn-toggle-overlay');
      if (b) b.textContent = tr(overlayVisible ? 'ui.btnHideOverlay' : 'ui.btnShowOverlay');
    }

    // Разворачивает ключ стиля ('builtin:<id>' | 'custom:<имя>') в снимок оформления
    function resolveStyle(key) {
      if (typeof key !== 'string') return null;
      if (key.startsWith('builtin:')) {
        const bp = BUILTIN_PRESETS.find((x) => `builtin:${x.id}` === key);
        return bp ? { name: tr(bp.titleKey), appearance: Object.assign({}, defaultAppearance, bp.style) } : null;
      }
      if (key.startsWith('custom:')) {
        const nm = key.slice(7).toLowerCase();
        const cp = customPresets.find((x) => x.name.toLowerCase() === nm);
        return cp ? { name: cp.name, appearance: Object.assign({}, cp.appearance) } : null;
      }
      return null;
    }

    // Стили, доступные для ротации. Заблокированные (замок) не участвуют и не входят в счётчик.
    function rotatablePresets() {
      return customPresets.filter((x) => !x.locked);
    }

    // Состав ротации: <2 стилей — пусто, ровно 2 — оба автоматически, от 3 — выбранные (до 5)
    function effectiveRotationNames(p) {
      const avail = rotatablePresets();
      const n = avail.length;
      if (n < 2) return [];
      const rot = extras[p].rotation;
      if (n === 2 || rot.source !== 'manual') return avail.map((x) => x.name);
      return (rot.names || []).filter((nm) => avail.some((x) => x.name === nm)).slice(0, 5);
    }

    // Данные вкладки для сохранения и живого предпросмотра (снимки обновляются по актуальным сохранённым стилям)
    function readExtras(p) {
      const ex = extras[p];
      ex.userStyles.forEach((u) => {
        const r = resolveStyle(u.styleKey);
        if (r) { u.appearance = r.appearance; u.styleName = r.name; }
      });
      const n = rotatablePresets().length;
      const names = effectiveRotationNames(p);
      const enabled = !!ex.rotation.enabled && n >= 2 && (n === 2 || ex.rotation.source !== 'manual' || names.length >= 3);
      ex.rotation.enabled = enabled;
      const random = !!ex.rotation.random && n >= 3 && names.length >= 3;
      const pool = names.map((nm) => ({ name: nm, appearance: Object.assign({}, customPresets.find((x) => x.name === nm).appearance) }));
      return {
        userStyles: ex.userStyles.map((u) => ({ nick: u.nick, styleKey: u.styleKey, styleName: u.styleName, appearance: u.appearance })),
        rotation: { source: n === 2 ? 'all' : ex.rotation.source, enabled, random, pool }
      };
    }

    function normalizeNick(v) {
      const name = String(v || '').trim().replace(/^[#@]/, '').toLowerCase();
      return /^[a-z0-9_]{1,25}$/.test(name) ? name : '';
    }

    function openExtraModal(kind, p) {
      extraTarget = p;
      const tabName = tr(p === 'o_' ? 'ui.tabOverlay' : 'ui.tabWidget');
      if (kind === 'userstyles') {
        usEditing = null; usPendingDup = null; usPendingDelete = null;
        $('us-nick').value = '';
        $('us-error').classList.add('hidden');
        $('us-title').textContent = `${tr('ui.userStylesTitle')} — ${tabName}`;
        renderUserStyles();
      } else {
        $('rot-title').textContent = `${tr('ui.rotationTitle')} — ${tabName}`;
        const rot = extras[p].rotation;
        const nFree = rotatablePresets().length;
        const manual = nFree >= 3 && rot.source === 'manual';
        rotDraft = {
          enabled: !!rot.enabled && nFree >= 2,
          source: manual ? 'manual' : 'all',
          order: rot.random && nFree >= 3 ? 'random' : 'seq',
          names: manual ? effectiveRotationNames(p).slice() : []
        };
        rotPreviewCfg = defaultAppearance;
        renderRotation();
      }
      $(`modal-${kind}`).classList.remove('hidden');
    }

    function closeExtraModal(kind) {
      if (kind === 'userstyles') { usEditing = null; usPendingDup = null; usPendingDelete = null; }
      if (kind === 'rotation') rotDraft = null;
      $(`modal-${kind}`).classList.add('hidden');
    }

    function renderUserStyles() {
      const ex = extras[extraTarget];
      const sel = $('us-style');
      if (!sel) return;
      const prev = sel.value;
      sel.innerHTML = '';
      const addGroup = (labelKey, items) => {
        if (!items.length) return;
        const g = document.createElement('optgroup');
        g.label = tr(labelKey);
        items.forEach(([v, t]) => {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = t;
          g.appendChild(o);
        });
        sel.appendChild(g);
      };
      addGroup('ui.userStylesStyleBuiltin', BUILTIN_PRESETS.map((bp) => [`builtin:${bp.id}`, tr(bp.titleKey)]));
      addGroup('ui.userStylesStyleCustom', customPresets.map((cp) => [`custom:${cp.name}`, cp.name]));
      if (prev && Array.from(sel.options).some((o) => o.value === prev)) sel.value = prev;

      $('us-assign').textContent = tr(usEditing ? 'ui.userStylesSaveChanges' : 'ui.userStylesAssign');
      $('us-cancel-edit').classList.toggle('hidden', !usEditing);
      $('us-nick').disabled = !!usEditing;

      // Защита: замена существующего пользователя и удаление — только после подтверждения
      const bar = $('us-confirm');
      bar.classList.toggle('hidden', !usPendingDup && !usPendingDelete);
      if (usPendingDup) {
        const old = ex.userStyles.find((u) => u.nick === usPendingDup.nick);
        const oldRes = old ? resolveStyle(old.styleKey) : null;
        const nw = resolveStyle(usPendingDup.key);
        $('us-confirm-text').textContent = trf('ui.userStylesDupConfirm', {
          nick: usPendingDup.nick,
          old: oldRes ? oldRes.name : (old ? old.styleName : ''),
          name: nw ? nw.name : ''
        });
        $('us-confirm-ok').textContent = tr('ui.userStylesDupYes');
      } else if (usPendingDelete) {
        $('us-confirm-text').textContent = trf('ui.userStylesDeleteConfirm', { nick: usPendingDelete });
        $('us-confirm-ok').textContent = tr('ui.userStylesDeleteYes');
      }

      const list = $('us-list');
      list.innerHTML = '';
      if (!ex.userStyles.length) {
        const empty = document.createElement('div');
        empty.className = 'preset-empty';
        empty.textContent = tr('ui.userStylesEmpty');
        list.appendChild(empty);
        return;
      }
      ex.userStyles.forEach((u) => {
        const res = resolveStyle(u.styleKey);
        const item = document.createElement('div');
        item.className = 'preset-item' + (usEditing === u.nick ? ' active' : '');
        item.style.cursor = 'default';
        const info = document.createElement('div');
        info.className = 'preset-info';
        info.innerHTML = `<span class="preset-title">${escapeHtml(u.nick)}</span>` +
          `<span class="preset-desc">${escapeHtml(res ? res.name : u.styleName)}${res ? '' : ' ' + escapeHtml(tr('ui.userStylesDeletedStyle'))}</span>`;
        item.appendChild(info);

        // Стиль удалён, ник работает по своей копии: её можно вернуть в список сохранённых стилей
        if (!res) {
          const keepBtn = document.createElement('button');
          keepBtn.type = 'button';
          keepBtn.className = 'preset-overwrite-btn';
          keepBtn.textContent = tr('ui.userStylesSaveCopy');
          keepBtn.onclick = () => saveUserStyleCopyAsPreset(u);
          item.appendChild(keepBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'preset-overwrite-btn';
        editBtn.textContent = tr('ui.userStylesEdit');
        editBtn.onclick = () => {
          usEditing = u.nick; usPendingDup = null; usPendingDelete = null;
          $('us-error').classList.add('hidden');
          $('us-nick').value = u.nick;
          renderUserStyles();
          if (Array.from($('us-style').options).some((o) => o.value === u.styleKey)) $('us-style').value = u.styleKey;
        };
        item.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'preset-delete-btn';
        delBtn.textContent = tr('ui.userStylesDelete');
        delBtn.onclick = () => {
          usPendingDup = null; usPendingDelete = u.nick;
          renderUserStyles();
          bar.scrollIntoView({ block: 'nearest' });
        };
        item.appendChild(delBtn);
        list.appendChild(item);
      });
    }

    // Копия удалённого стиля становится обычным сохранённым стилем (с той же картинкой); ники этой вкладки с тем же стилем переключаются на него
    async function saveUserStyleCopyAsPreset(u) {
      const base = String(u.styleName || 'Style').slice(0, 40);
      let name = base;
      let i = 2;
      while (customPresets.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
        const suffix = ` (${i++})`;
        name = base.slice(0, 40 - suffix.length) + suffix;
      }
      customPresets.push({ name, locked: false, appearance: Object.assign({}, u.appearance) });
      const oldKey = u.styleKey;
      extras[extraTarget].userStyles.forEach((x) => {
        if (x.styleKey === oldKey) { x.styleKey = `custom:${name}`; x.styleName = name; }
      });
      renderPresetsLists();
      renderUserStyles();
      await save({ forceReconnect: false });
    }

    async function commitUserStyle(nick, key) {
      const ex = extras[extraTarget];
      const r = resolveStyle(key);
      if (!r) return;
      const entry = { nick, styleKey: key, styleName: r.name, appearance: r.appearance };
      const idx = ex.userStyles.findIndex((u) => u.nick === nick);
      if (idx >= 0) ex.userStyles[idx] = entry; else ex.userStyles.push(entry);
      usEditing = null; usPendingDup = null;
      $('us-nick').value = '';
      renderUserStyles();
      await save({ forceReconnect: false });
    }

    async function assignUserStyle() {
      const ex = extras[extraTarget];
      const err = $('us-error');
      err.classList.add('hidden');
      const nick = usEditing || normalizeNick($('us-nick').value);
      const key = $('us-style').value;
      if (!nick || !key) {
        err.textContent = tr('ui.userStylesBadNick');
        err.classList.remove('hidden');
        return;
      }
      if (!usEditing && ex.userStyles.some((u) => u.nick === nick)) {
        usPendingDelete = null;
        usPendingDup = { nick, key };
        renderUserStyles();
        return;
      }
      await commitUserStyle(nick, key);
    }

    async function confirmUserStylesAction() {
      const ex = extras[extraTarget];
      if (usPendingDup) {
        const { nick, key } = usPendingDup;
        await commitUserStyle(nick, key);
      } else if (usPendingDelete) {
        const nick = usPendingDelete;
        ex.userStyles = ex.userStyles.filter((u) => u.nick !== nick);
        usPendingDelete = null;
        if (usEditing === nick) { usEditing = null; $('us-nick').value = ''; }
        renderUserStyles();
        await save({ forceReconnect: false });
      }
    }

    function cancelUserStylesConfirm() {
      usPendingDup = null; usPendingDelete = null;
      renderUserStyles();
    }

    function cancelUserStylesEdit() {
      usEditing = null; usPendingDup = null; usPendingDelete = null;
      $('us-nick').value = '';
      renderUserStyles();
    }

    // Окно ротации работает с черновиком rotDraft: в конфиг попадает только после «Сохранить»
    function renderRotation() {
      if (!rotDraft) return;
      const d = rotDraft;
      const n = rotatablePresets().length;
      const locked = customPresets.length - n;
      const manual = n >= 3 && d.source === 'manual';
      $('rot-mention-note').textContent = tr(extraTarget === 'o_' ? 'ui.rotationMentionOverlay' : 'ui.rotationMentionWidget');
      $('rot-need-two').textContent = locked ? trf('ui.rotationNeedTwoLocked', { k: locked }) : tr('ui.rotationNeedTwo');
      $('rot-need-two').classList.toggle('hidden', n >= 2);
      $('rot-enable').disabled = n < 2;
      $('rot-enable').checked = n >= 2 && d.enabled;
      $('rot-enable-label').classList.toggle('disabled', n < 2);
      $('rot-controls').classList.toggle('hidden', n < 2);

      $('rot-src-all').checked = !manual;
      $('rot-src-all').disabled = n === 2;
      $('rot-src-manual').checked = manual;
      $('rot-src-manual-label').classList.toggle('hidden', n < 3);
      $('rot-src-all-text').textContent = n === 2 ? trf('ui.rotationSourceAllN', { n }) : tr('ui.rotationSourceAll');

      const random = d.order === 'random' && n >= 3;
      $('rot-ord-seq').classList.toggle('active', !random);
      $('rot-ord-random').classList.toggle('active', random);
      $('rot-ord-random').disabled = n < 3;
      $('rot-two-note').classList.toggle('hidden', n !== 2);
      $('rot-all-info').classList.toggle('hidden', !(n >= 3 && !manual));
      $('rot-all-info').textContent = trf('ui.rotationAllInfo', { n }) + (locked ? ' ' + trf('ui.rotationLockedInfo', { k: locked }) : '');
      $('rot-manual').classList.toggle('hidden', !manual);

      if (manual) {
        $('rot-queue-title').textContent = trf('ui.rotationQueue', { n: d.names.length });
        paintMiniPlate($('rot-plate'), rotPreviewCfg || defaultAppearance, ['mini-preview-plate']);
        const chips = $('rot-chips');
        chips.innerHTML = '';
        d.names.forEach((nm) => {
          const chip = document.createElement('span');
          chip.className = 'rot-chip';
          const t = document.createElement('span');
          t.textContent = nm;
          const x = document.createElement('button');
          x.type = 'button';
          x.textContent = '×';
          x.title = tr('ui.rotationRemove');
          x.onclick = () => { d.names = d.names.filter((v) => v !== nm); renderRotation(); };
          chip.appendChild(t);
          chip.appendChild(x);
          chips.appendChild(chip);
        });
        $('rot-manual-warn').textContent = d.names.length < 3 ? tr('ui.rotationManualWarn') : '';
        const list = $('rot-list');
        list.innerHTML = '';
        customPresets.forEach((cp) => {
          const inPool = d.names.includes(cp.name);
          const row = document.createElement('div');
          row.className = 'rot-row' + (cp.locked ? ' locked' : '');
          row.onmouseenter = () => { rotPreviewCfg = cp.appearance; paintMiniPlate($('rot-plate'), cp.appearance, ['mini-preview-plate']); };
          const t = document.createElement('span');
          t.textContent = cp.locked ? `${cp.name} · ${tr('ui.rotationLockedRow')}` : cp.name;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = inPool ? 'primary' : 'secondary';
          b.textContent = tr(inPool ? 'ui.rotationIn' : 'ui.rotationAdd');
          b.disabled = !!cp.locked || (!inPool && d.names.length >= 5);
          b.onclick = () => {
            if (inPool) d.names = d.names.filter((v) => v !== cp.name);
            else if (d.names.length < 5) d.names.push(cp.name);
            renderRotation();
          };
          row.appendChild(t);
          row.appendChild(b);
          list.appendChild(row);
        });
      }

      // Подвал: статус валидации и доступность «Сохранить»
      const need = manual ? Math.max(0, 3 - d.names.length) : 0;
      const status = $('rot-status');
      status.style.color = '';
      if (n < 2) {
        status.textContent = '';
      } else if (need > 0) {
        status.textContent = trf('ui.rotationNeedMore', { n: need });
        status.style.color = '#ff8585';
      } else {
        status.textContent = tr('ui.rotationReady');
        status.style.color = '#3fcf3f';
      }
      $('rot-save').disabled = n < 2 || need > 0;
    }

    async function saveRotationModal() {
      if (!rotDraft) return;
      const p = extraTarget;
      const d = rotDraft;
      const n = rotatablePresets().length;
      const rot = extras[p].rotation;
      rot.enabled = d.enabled && n >= 2;
      rot.source = n >= 3 && d.source === 'manual' ? 'manual' : 'all';
      rot.random = d.order === 'random' && n >= 3;
      rot.names = d.source === 'manual' ? d.names.slice() : [];
      closeExtraModal('rotation');
      updateRotationDots();
      if (p === 'o_') schedulePreview(); else scheduleWidgetPreview();
      await save({ forceReconnect: false });
    }

    // Индикатор на кнопке «Ротация»: зелёный — включена и валидна
    function updateRotationDots() {
      ['o_', 'w_'].forEach((p) => {
        const dot = document.querySelector(`[data-rot-dot="${p}"]`);
        if (dot) dot.classList.toggle('ok', readExtras(p).rotation.enabled);
      });
    }

    function wireExtraModals() {
      document.querySelectorAll('[data-open-extra]').forEach((btn) => {
        btn.addEventListener('click', () => openExtraModal(btn.dataset.openExtra, btn.dataset.prefix));
      });
      document.querySelectorAll('[data-extra-close]').forEach((btn) => {
        btn.addEventListener('click', () => closeExtraModal(btn.dataset.extraClose));
      });
      $('us-assign').addEventListener('click', assignUserStyle);
      $('us-cancel-edit').addEventListener('click', cancelUserStylesEdit);
      $('us-confirm-ok').addEventListener('click', confirmUserStylesAction);
      $('us-confirm-cancel').addEventListener('click', cancelUserStylesConfirm);
      $('us-nick').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); assignUserStyle(); }
      });
      $('rot-enable').addEventListener('change', () => { rotDraft.enabled = $('rot-enable').checked; renderRotation(); });
      $('rot-src-all').addEventListener('change', () => { rotDraft.source = 'all'; renderRotation(); });
      $('rot-src-manual').addEventListener('change', () => { rotDraft.source = 'manual'; renderRotation(); });
      $('rot-ord-seq').addEventListener('click', () => { rotDraft.order = 'seq'; renderRotation(); });
      $('rot-ord-random').addEventListener('click', () => { rotDraft.order = 'random'; renderRotation(); });
      $('rot-cancel').addEventListener('click', () => closeExtraModal('rotation'));
      $('rot-save').addEventListener('click', saveRotationModal);
    }

    /* ---------------- Полный сброс вкладки Оверлей / Виджет до заводских настроек ---------------- */

    async function resetSectionToDefaults(prefix) {
      const defaults = Object.assign({}, defaultAppearance);
      if (prefix === 'w_') {
        defaults.highlightMentions = false;
        defaults.mentionLonger = false;
      }
      appearanceState[prefix] = Object.assign({}, defaults);
      writeAppearance(prefix, defaults);
      triggerTargetPreview(prefix);
      await save({ forceReconnect: false });
    }

    /* ---------------- Модальное окно Обновления ---------------- */

    function renderUpdateModalContent(data) {
      if (!data || !data.hasUpdate) return;
      const lang = document.documentElement.lang || $('language').value || 'en';
      const localizedNotes = (lang === 'ru' ? data.notesRu : data.notesEn) || data.releaseNotes || '';

      $('update-modal-title').textContent = trf('ui.updateAvailableTitle', {
        latest: data.latestVersion,
        current: data.currentVersion
      });
      $('update-modal-notes').innerHTML = localizedNotes
        ? renderMarkdownNotes(localizedNotes)
        : `<p class="note">${escapeHtml(tr('ui.updateNotesUnavailable'))}</p>`;
      $('btn-update-now').textContent = data.isPortable ? tr('ui.btnUpdateDownload') : tr('ui.btnUpdateNow');
      $('modal-update').classList.remove('hidden');
    }

    function showUpdateModal(data) {
      if (!data || !data.hasUpdate) return;
      currentUpdateData = data;
      $('update-progress-text').classList.add('hidden');
      $('btn-update-now').disabled = false;
      if (stringsLoaded) {
        renderUpdateModalContent(data);
      }
    }

    function wireUpdateControls() {
      $('btn-check-updates').onclick = async () => {
        const btn = $('btn-check-updates');
        const statusEl = $('update-check-status');
        btn.disabled = true;
        btn.textContent = tr('ui.checkingUpdates');
        try {
          const res = await window.api.checkForUpdates({ manual: true });
          if (res && res.hasUpdate) {
            showUpdateModal(res);
          } else if (res && res.error) {
            statusEl.dataset.custom = '1';
            statusEl.textContent = trf('ui.updateError', { msg: res.error });
          } else {
            statusEl.dataset.custom = '1';
            statusEl.textContent = trf('ui.upToDate', { v: (res && res.currentVersion) || appVersion });
          }
        } finally {
          btn.disabled = false;
          btn.textContent = tr('ui.checkUpdates');
        }
      };

      $('btn-remind-later').onclick = () => {
        $('modal-update').classList.add('hidden');
      };

      $('btn-skip-version').onclick = async () => {
        if (currentUpdateData && currentUpdateData.latestVersion) {
          await window.api.skipUpdateVersion(currentUpdateData.latestVersion);
        }
        $('modal-update').classList.add('hidden');
      };

      $('btn-update-now').onclick = async () => {
        if (!currentUpdateData) return;
        $('btn-update-now').disabled = true;
        const progEl = $('update-progress-text');
        progEl.classList.remove('hidden');
        progEl.textContent = trf('ui.updateDownloading', { percent: 0 });

        let res = null;
        try {
          res = await window.api.installUpdate(currentUpdateData);
        } catch (e) {
          res = { mode: 'error', error: e && e.message ? e.message : String(e) };
        }
        if (res && res.mode === 'browser') {
          $('modal-update').classList.add('hidden');
        } else if (res && res.mode === 'browser-fallback') {
          const msg = res.reason === 'not-available' ? tr('ui.updateNoInstallable') : res.error;
          progEl.textContent = trf('ui.updateFallbackOpened', { msg });
          $('btn-update-now').disabled = false;
        } else if (!res || res.mode !== 'updater') {
          progEl.textContent = trf('ui.updateError', { msg: (res && res.error) || '?' });
          $('btn-update-now').disabled = false;
        }
      };

      window.api.onUpdateAvailable((data) => showUpdateModal(data));
      window.api.onUpdateProgress((prog) => {
        const progEl = $('update-progress-text');
        progEl.classList.remove('hidden');
        if (prog.downloaded) {
          progEl.textContent = tr('ui.updateInstalling');
        } else if (prog.error) {
          progEl.textContent = trf('ui.updateError', { msg: prog.error });
          $('btn-update-now').disabled = false;
        } else if (prog.percent !== undefined) {
          progEl.textContent = trf('ui.updateDownloading', { percent: prog.percent });
        }
      });
    }

    /* ---------------- Общие настройки ---------------- */

    function readGeneral() {
      return {
        channel: $('channel').value.trim(),
        useProxy: $('useProxy').checked,
        proxyHost: $('proxyHost').value.trim(),
        proxyPort: $('proxyPort').value.trim(),
        proxyUser: $('proxyUser').value.trim(),
        proxyPass: $('proxyPass').value.trim(),
        hideCommands: $('hideCommands').checked,
        ignoredBots: $('ignoredBots').value.trim(),
        autoStart: $('autoStart').checked,
        customPresets
      };
    }

    /* ---------------- Живой предпросмотр оверлея и виджета (до сохранения) ---------------- */

    let previewTimer = null;
    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        window.api.previewOverlay(Object.assign(readAppearance('o_'), readExtras('o_'), {
          hideCommands: $('hideCommands').checked,
          ignoredBots: $('ignoredBots').value.trim()
        }));
      }, 35);
    }

    let widgetPreviewTimer = null;
    function scheduleWidgetPreview() {
      clearTimeout(widgetPreviewTimer);
      widgetPreviewTimer = setTimeout(() => {
        window.api.previewWidget(Object.assign(readAppearance('w_'), readExtras('w_'), {
          hideCommands: $('hideCommands').checked,
          ignoredBots: $('ignoredBots').value.trim()
        }));
      }, 35);
    }

    /* ---------------- Виджет для OBS ---------------- */

    function widgetLinkFor(port) {
      return `http://127.0.0.1:${port}/`;
    }

    function updateLink() {
      const port = parseInt($('widgetPort').value, 10);
      $('widgetLink').value = Number.isInteger(port) && port >= 1024 && port <= 65535 ? widgetLinkFor(port) : '';
    }

    function renderWidgetStatus(st) {
      widgetStatus = st || {};
      const dot = $('widget-dot');
      const label = $('widget-status-text');
      dot.className = 'dot';
      label.className = '';

      if (widgetStatus.error) {
        dot.classList.add('error');
        label.classList.add('error');
        label.textContent = widgetStatus.error.code === 'EADDRINUSE'
          ? trf('ui.widgetPortBusy', { port: widgetStatus.error.port || $('widgetPort').value })
          : trf('ui.widgetError', { msg: widgetStatus.error.message });
      } else if (widgetStatus.running) {
        dot.classList.add('ok');
        label.textContent = trf('ui.widgetStatusOn', { n: widgetStatus.clients || 0 });
      } else {
        label.textContent = tr('ui.widgetStatusOff');
      }

      $('btn-widget-test').disabled = !widgetStatus.running;
    }

    function showSaveStatus(textValue, warn) {
      const el = $('save-status');
      el.textContent = textValue;
      el.classList.toggle('warn', !!warn);
      clearTimeout(showSaveStatus.timer);
      showSaveStatus.timer = setTimeout(() => { el.textContent = ''; }, 4000);
    }

    /* ---------------- Вкладки ---------------- */

    function showTab(name) {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== `tab-${name}`));
    }

    document.querySelectorAll('.tab-btn').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

    /* ---------------- Сохранение ---------------- */

    async function save(opts = {}) {
      const forceReconnect = opts.forceReconnect !== undefined ? !!opts.forceReconnect : true;
      const widgetEnabled = $('widgetEnabled').checked;
      const portText = $('widgetPort').value.trim();
      const portNumber = Number(portText);
      const portValid = Number.isInteger(portNumber) && portNumber >= 1024 && portNumber <= 65535;

      if (widgetEnabled && !portValid) {
        showTab('widget');
        const dot = $('widget-dot');
        const label = $('widget-status-text');
        dot.className = 'dot error';
        label.className = 'error';
        label.textContent = tr('ui.widgetPortInvalid');
        $('widgetPort').focus();
        return;
      }

      const cfg = Object.assign(readGeneral(), readAppearance('o_'), readExtras('o_'), {
        widgetEnabled,
        widgetPort: portText,
        widget: Object.assign(readAppearance('w_'), readExtras('w_')),
        _forceReconnect: forceReconnect
      });

      const result = await window.api.saveConfig(cfg);
      if (result && result.widgetPort) {
        $('widgetPort').value = result.widgetPort;
        updateLink();
      }
      if (result && Array.isArray(result.customPresets)) {
        customPresets = result.customPresets;
        renderPresetsLists();
      }
      if (result && result.widget) renderWidgetStatus(result.widget);

      const widgetFailed = widgetEnabled && result && result.widget && result.widget.error;
      showSaveStatus(tr(widgetFailed ? 'ui.savedWidgetFailed' : 'ui.saved'), widgetFailed);
    }

    /* ---------------- Папка настроек ---------------- */

    async function refreshConfigDirInfo() {
      const info = await window.api.getConfigDirInfo();
      $('configDir').value = info.dir;
    }

    /* ---------------- Запуск ---------------- */

    async function init() {
      $('overlay-form').innerHTML = appearanceHtml('o_');
      $('widget-form').innerHTML = appearanceHtml('w_');
      wireAppearance('o_', schedulePreview);
      wireAppearance('w_', scheduleWidgetPreview);
      wireStyleModals();
      wireExtraModals();
      wireUpdateControls();

      $('useProxy').onchange = () => $('proxyBox').classList.toggle('disabled', !$('useProxy').checked);
      $('hideCommands').addEventListener('change', () => { schedulePreview(); scheduleWidgetPreview(); });
      $('ignoredBots').addEventListener('input', () => { schedulePreview(); scheduleWidgetPreview(); });

      $('widgetPort').addEventListener('input', updateLink);

      $('language').onchange = async () => {
        const lang = $('language').value;
        applyStrings(await window.api.setLanguage(lang), lang);
      };

      $('btn-copy').onclick = async () => {
        if (!$('widgetLink').value) return;
        await window.api.copyText($('widgetLink').value);
        const original = tr('ui.copyLink');
        $('btn-copy').textContent = tr('ui.copied');
        setTimeout(() => { $('btn-copy').textContent = original; }, 1500);
      };

      $('btn-open-config-dir').onclick = () => window.api.openConfigDir();
      $('btn-support').onclick = (e) => { e.preventDefault(); window.api.openSupportLink(); };
      $('btn-toggle-overlay').onclick = async () => renderOverlayToggle(await window.api.toggleOverlayVisibility());

      $('btn-test').onclick = () => window.api.sendTestMessage($('channel').value.trim());
      $('btn-widget-test').onclick = () => window.api.sendWidgetTest($('channel').value.trim());
      $('btn-reset-overlay').onclick = () => resetSectionToDefaults('o_');
      $('btn-reset-widget').onclick = () => resetSectionToDefaults('w_');
      $('btn-save').onclick = () => save({ forceReconnect: true });

      const cfg = await window.api.loadConfig();
      if (cfg.defaults && typeof cfg.defaults === 'object') {
        defaultAppearance = Object.assign({}, defaultAppearance, cfg.defaults);
      }
      customPresets = Array.isArray(cfg.customPresets) ? cfg.customPresets : [];

      const lang = cfg.language || 'en';
      appVersion = cfg.currentVersion || '';
      isPortableBuild = !!cfg.isPortable;
      $('language').value = lang;

      $('channel').value = cfg.channel;
      $('useProxy').checked = cfg.useProxy;
      $('proxyBox').classList.toggle('disabled', !cfg.useProxy);
      $('proxyHost').value = cfg.proxyHost;
      $('proxyPort').value = cfg.proxyPort;
      $('proxyUser').value = cfg.proxyUser;
      $('proxyPass').value = cfg.proxyPass;
      $('hideCommands').checked = cfg.hideCommands;
      $('ignoredBots').value = cfg.ignoredBots;
      $('autoStart').checked = cfg.autoStart;

      writeAppearance('o_', cfg);
      writeAppearance('w_', cfg.widget);
      [['o_', cfg], ['w_', cfg.widget]].forEach(([p, src]) => {
        extras[p].userStyles = (Array.isArray(src.userStyles) ? src.userStyles : []).map((u) => Object.assign({}, u));
        const r = src.rotation || {};
        extras[p].rotation = { enabled: !!r.enabled, random: !!r.random, source: r.source === 'manual' ? 'manual' : 'all', names: r.source === 'manual' ? (r.pool || []).map((x) => x.name) : [] };
        updateRotationDots();
      });
      $('widgetEnabled').checked = cfg.widgetEnabled;
      $('widgetPort').value = cfg.widgetPort;
      updateLink();

      applyStrings(await window.api.getStrings(lang), lang);
      updateMiniPreviews('o_');
      renderOverlayToggle(await window.api.getOverlayVisible());
      window.api.onOverlayVisibility(renderOverlayToggle);

      if (cfg.pendingUpdate && cfg.pendingUpdate.hasUpdate) {
        showUpdateModal(cfg.pendingUpdate);
      }
      renderWidgetStatus(await window.api.getWidgetStatus());

      window.api.onWidgetStatus(renderWidgetStatus);
      window.api.onStringsUpdated((data) => {
        $('language').value = data.language;
        applyStrings(data.strings, data.language);
      });
    }

    init();
  