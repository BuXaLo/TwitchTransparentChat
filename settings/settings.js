
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



    /* ---------------- Вспомогательные функции генерации стилей для мини-превью ---------------- */

    // Стилизация миниатюры-плашки в списке пресетов: те же переменные, что и в живом предпросмотре
    

    

    

    

    

    

    

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


    const presetState = {
      get appearanceState() { return appearanceState; },
      get defaultAppearance() { return defaultAppearance; }, set defaultAppearance(value) { defaultAppearance = value; },
      get customPresets() { return customPresets; }, set customPresets(value) { customPresets = value; },
      get extras() { return extras; },
      get activeModalTarget() { return activeModalTarget; }, set activeModalTarget(value) { activeModalTarget = value; },
      get modalSnapshot() { return modalSnapshot; }, set modalSnapshot(value) { modalSnapshot = value; },
      get selectedPresetKey() { return selectedPresetKey; }, set selectedPresetKey(value) { selectedPresetKey = value; },
      get pendingPresetOverwrite() { return pendingPresetOverwrite; }, set pendingPresetOverwrite(value) { pendingPresetOverwrite = value; },
      get pendingPresetDelete() { return pendingPresetDelete; }, set pendingPresetDelete(value) { pendingPresetDelete = value; },
      get extraTarget() { return extraTarget; }, set extraTarget(value) { extraTarget = value; },
      get usEditing() { return usEditing; }, set usEditing(value) { usEditing = value; },
      get usPendingDup() { return usPendingDup; }, set usPendingDup(value) { usPendingDup = value; },
      get usPendingDelete() { return usPendingDelete; }, set usPendingDelete(value) { usPendingDelete = value; },
      get rotDraft() { return rotDraft; }, set rotDraft(value) { rotDraft = value; },
      get rotPreviewCfg() { return rotPreviewCfg; }, set rotPreviewCfg(value) { rotPreviewCfg = value; }
    };

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
      presets.renderPresetsLists();
      renderOverlayToggle(overlayVisible);
      presets.updateRotationDots();
      presets.renderUserStyles();
      presets.renderRotation();

      if (currentUpdateData && currentUpdateData.hasUpdate) {
        renderUpdateModalContent(currentUpdateData);
      }
    }

    /* ---------------- Отрисовка мини-превью внутри модальных окон ---------------- */

    // Красит мини-плашку по настройкам cfg: общий код для превью в модалках и превью под кнопкой «Проиграть анимацию».
    // Размер шрифта задаётся только CSS (14px) и не зависит от ползунка размера сообщений.
    

    // Превью под кнопкой «Проиграть анимацию» (вкладки Оверлей и Виджет): живое, не зависит от нажатия кнопки
    

    

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
    

    

    /* ---------------- Модальное окно Картинки плашки ---------------- */

    // Встроенные картинки-фигуры (data-URI SVG, фиксированные цвета, не зависят от рамки):
    // «наклейки» — сердечки, облачка, звёздочки и т.п. — вместо линий, привязанных к рамке
    

    

    

    

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
        presets.renderPresetsLists();
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
      if (kind === 'styles') presets.cancelPresetConfirms();
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








      presets.wirePresetControls();

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
        window.api.previewOverlay(Object.assign(readAppearance('o_'), presets.readExtras('o_'), {
          hideCommands: $('hideCommands').checked,
          ignoredBots: $('ignoredBots').value.trim()
        }));
      }, 35);
    }

    let widgetPreviewTimer = null;
    function scheduleWidgetPreview() {
      clearTimeout(widgetPreviewTimer);
      widgetPreviewTimer = setTimeout(() => {
        window.api.previewWidget(Object.assign(readAppearance('w_'), presets.readExtras('w_'), {
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

      const cfg = Object.assign(readGeneral(), readAppearance('o_'), presets.readExtras('o_'), {
        widgetEnabled,
        widgetPort: portText,
        widget: Object.assign(readAppearance('w_'), presets.readExtras('w_')),
        _forceReconnect: forceReconnect
      });

      const result = await window.api.saveConfig(cfg);
      if (result && result.widgetPort) {
        $('widgetPort').value = result.widgetPort;
        updateLink();
      }
      if (result && Array.isArray(result.customPresets)) {
        customPresets = result.customPresets;
        presets.renderPresetsLists();
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
      presets.wireExtraModals();
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
        presets.updateRotationDots();
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

    const preview = window.SettingsPreview.create({
      $,
      readAppearance,
      getActiveModalTarget: () => activeModalTarget,
      SYSTEM_FONT,
      DEFAULT_TWITCH_NICK_SHADOW,
      DEFAULT_TWITCH_SAMPLE_COLOR,
      CARD_RESET_KEYS,
      CARD_RESET_DEFAULTS,
      STYLE_KEYS
    });
    const {
      applyThumbStyle, paintMiniPlate, refreshAnimPreviews, updateMiniPreviews,
      playPreviewAnimation, hoverPreviewStyle, restorePreviewStyle, wirePresetHover
    } = preview;


    const presets = window.SettingsPresets.create({
      $, tr, trf, escapeHtml, state: presetState, STYLE_KEYS,
      readAppearance, save, triggerTargetPreview, schedulePreview,
      scheduleWidgetPreview, preview
    });

    init();
  