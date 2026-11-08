
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

      $('app-version').textContent = appVersion ? `v${appVersion}` : '';
      const activeLanguage = lang || document.documentElement.lang || 'en';
      $('language-en').setAttribute('aria-pressed', String(activeLanguage === 'en'));
      $('language-ru').setAttribute('aria-pressed', String(activeLanguage === 'ru'));
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
        <section class="form-group">
          <h3 class="section-title" data-i18n="ui.messageSettings"></h3>
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
        </section>

        <section class="form-group">
          <h3 class="section-title" data-i18n="ui.appearanceBehavior"></h3>
          <div class="row animation-settings-row">
            <label class="animation-select-label">
              <span data-i18n="ui.animation"></span>
              <select id="${p}animation">${animOptions()}</select>
            </label>
            <button type="button" class="secondary anim-preview-btn" data-anim-preview="${p}" data-i18n-title="ui.animPreviewTitle" data-i18n="ui.animPreview"></button>
          </div>
          <div class="setting-choice-row">
            <span id="${p}direction-label" data-i18n="ui.direction"></span>
            <div class="setting-choice rot-seg" role="group" aria-labelledby="${p}direction-label">
              <button type="button" data-setting-choice="${p}chatDirection" data-value="top" data-i18n="ui.dirTop"></button>
              <button type="button" data-setting-choice="${p}chatDirection" data-value="bottom" data-i18n="ui.dirBottom"></button>
            </div>
            <select id="${p}chatDirection" class="hidden" tabindex="-1" aria-hidden="true">
              <option value="top" data-i18n="ui.dirTop"></option>
              <option value="bottom" data-i18n="ui.dirBottom"></option>
            </select>
          </div>

        <label class="checkbox-label setting-hint-checkbox" data-i18n-tip="ui.smoothShiftHint">
          <input type="checkbox" id="${p}smoothShift">
          <span data-i18n="ui.smoothShift"></span>
        </label>

        <label class="checkbox-label setting-hint-checkbox" data-i18n-tip="ui.solidRibbonHint">
          <input type="checkbox" id="${p}solidRibbon">
          <span data-i18n="ui.solidRibbon"></span>
        </label>

        <span class="modal-preview-label" data-i18n="ui.appearPreviewLabel"></span>
        <div class="anim-preview-stage" data-anim-stage>
          <div class="anim-preview-plate mini-preview-plate" data-anim-plate>
            <span class="mini-author-wrap"><span class="mini-badge">★</span><span class="mini-nick" data-anim-nick>TestViewer</span><span class="mini-colon">: </span></span><span class="mini-text" data-i18n="ui.previewSampleText"></span>
          </div>
        </div>
        </section>

        <section class="form-group">
          <h3 class="section-title" data-i18n="ui.appearanceSettings"></h3>
        <div class="setting-choice-row">
          <span id="${p}layout-label" data-i18n="ui.layout"></span>
          <div class="setting-choice rot-seg" role="group" aria-labelledby="${p}layout-label">
            <button type="button" data-setting-choice="${p}layoutMode" data-value="inline" data-i18n="ui.layoutInline"></button>
            <button type="button" data-setting-choice="${p}layoutMode" data-value="block" data-i18n="ui.layoutBlock"></button>
          </div>
          <select id="${p}layoutMode" class="hidden" tabindex="-1" aria-hidden="true">
            <option value="inline" data-i18n="ui.layoutInline"></option>
            <option value="block" data-i18n="ui.layoutBlock"></option>
          </select>
        </div>

        <label>
          <span data-i18n="ui.plateGap"></span>
          <div class="slider-row">
            <input type="range" id="${p}plateGap" min="5" max="40" step="1" value="5">
            <span id="${p}plateGapVal">5px</span>
          </div>
        </label>

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
              <span class="style-card-title" data-i18n="ui.cardImage"></span>
              <span class="style-card-desc" data-i18n="ui.cardImageDesc"></span>
            </div>
            <button type="button" class="accent" data-open-modal="image" data-prefix="${p}" data-i18n="ui.btnConfigure"></button>
          </div>
        </div>
        </section>

        <div class="style-card style-card-presets">
            <div class="style-card-info">
              <span class="style-card-title" data-i18n="ui.cardStyles"></span>
              <span class="style-card-desc" data-i18n="ui.cardStylesDesc"></span>
            </div>
            <div class="style-card-actions">
              <button type="button" class="secondary" data-open-extra="userstyles" data-prefix="${p}" data-i18n="ui.btnUserStyles"></button>
              <button type="button" class="secondary with-dot" data-open-extra="rotation" data-prefix="${p}"><span class="dot" data-rot-dot="${p}"></span><span data-i18n="ui.btnRotation"></span></button>
              <button type="button" class="accent" data-open-modal="styles" data-prefix="${p}" data-i18n="ui.btnOpenStyles"></button>
            </div>
        </div>

        <section class="form-group">
          <h3 class="section-title" data-i18n="ui.twitchEvents"></h3>
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
        </section>
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
      syncSettingChoices(p);
      if (a.highlightMentions !== undefined) $(p + 'highlightMentions').checked = p === 'w_' ? false : !!a.highlightMentions;
      if (a.mentionLonger !== undefined) $(p + 'mentionLonger').checked = p === 'w_' ? false : !!a.mentionLonger;
      if (a.smoothShift !== undefined) $(p + 'smoothShift').checked = !!a.smoothShift;
      if (a.solidRibbon !== undefined) $(p + 'solidRibbon').checked = !!a.solidRibbon;
      NOTICE_IDS.forEach((id) => {
        if (a[id] !== undefined) $(p + id).checked = !!a[id];
      });
      syncMentionDependency(p);
    }

    function syncSettingChoices(p) {
      ['chatDirection', 'layoutMode'].forEach((key) => {
        const select = $(p + key);
        document.querySelectorAll(`[data-setting-choice="${p + key}"]`).forEach((button) => {
          const active = button.dataset.value === select.value;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
      });
    }

    function syncMentionDependency(p) {
      const on = $(p + 'highlightMentions').checked;
      $(p + 'mentionLonger').disabled = !on;
      $(p + 'mentionLongerLabel').classList.toggle('disabled', !on);
    }

    function wireAppearance(p, onChange) {
      ['chatDirection', 'layoutMode'].forEach((key) => {
        document.querySelectorAll(`[data-setting-choice="${p + key}"]`).forEach((button) => {
          button.addEventListener('click', () => {
            const select = $(p + key);
            if (select.value === button.dataset.value) return;
            select.value = button.dataset.value;
            syncSettingChoices(p);
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      });
      syncSettingChoices(p);
      $(p + 'plateGap').addEventListener('input', () => { $(p + 'plateGapVal').textContent = `${$(p + 'plateGap').value}px`; });
      $(p + 'fontSize').addEventListener('input', () => { $(p + 'fontSizeVal').textContent = `${$(p + 'fontSize').value}px`; });
      $(p + 'highlightMentions').addEventListener('change', () => syncMentionDependency(p));
      // ▶ Проигрывает выбранную анимацию на мини-превью, которое цепляет весь текущий стиль плашки
      const previewBtn = document.querySelector(`[data-anim-preview="${p}"]`);
      const form = $(p === 'o_' ? 'overlay-form' : 'widget-form');
      const stage = form ? form.querySelector('[data-anim-stage]') : null;
      // Живое обновление превью: стиль подтягивается при любом изменении формы и после модалок,
      // кнопка только проигрывает анимацию
      if (previewBtn && stage) {
        previewBtn.addEventListener('click', () => {
          refreshAnimPreviews();
          playPreviewAnimation(stage.querySelector('[data-anim-plate]'), $(p + 'animation').value);
        });
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
        images.populateModalInputs(st);
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

    const modalFocus = (() => {
      let activeId = null, opener = null, inertState = [];
      function focusable(root) {
        return Array.from(root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
          .filter((el) => !el.closest('.hidden') && el.getClientRects().length);
      }
      function open(id, trigger) {
        const root = $(id);
        if (!root) return;
        if (activeId) close(activeId);
        activeId = id;
        opener = trigger || (document.activeElement !== document.body ? document.activeElement : null);
        inertState = Array.from(document.body.children).filter((el) => el !== root).map((el) => ({ el, inert: el.inert }));
        inertState.forEach(({ el }) => { el.inert = true; });
        const panel = root.querySelector('.modal-window');
        if (panel && !panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
        const items = focusable(root);
        (items[0] || panel || root).focus();
      }
      function close(id) {
        if (activeId !== id) return;
        inertState.forEach(({ el, inert }) => { el.inert = inert; });
        inertState = [];
        const target = opener;
        activeId = null; opener = null;
        if (target && target.isConnected && !target.disabled) target.focus();
      }
      document.addEventListener('keydown', (event) => {
        if (!activeId || event.key !== 'Tab') return;
        const root = $(activeId);
        if (!root || root.classList.contains('hidden')) return;
        const items = focusable(root);
        if (!items.length) { event.preventDefault(); root.querySelector('.modal-window')?.focus(); return; }
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }, true);
      document.addEventListener('focusin', (event) => {
        if (!activeId) return;
        const root = $(activeId);
        if (root && !root.classList.contains('hidden') && !root.contains(event.target)) {
          const items = focusable(root); (items[0] || root.querySelector('.modal-window'))?.focus();
        }
      }, true);
      return { open, close };
    })();

    function openStyleModal(kind, prefix, trigger) {
      activeModalTarget = prefix;
      $('m_cardImageScopeNote').style.display = prefix === 'w_' ? 'none' : '';
      $('m_cardImageScopeNoteW').style.display = prefix === 'w_' ? '' : 'none';
      modalSnapshot = Object.assign({}, readAppearance(prefix));
      populateModalInputsFromState(kind, appearanceState[prefix]);
      $(`modal-${kind}`).classList.remove('hidden');
      modalFocus.open(`modal-${kind}`, trigger);
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
        images.resetToDefaults(st, d);
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
        images.readModalIntoState(st);
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
        updateSaveIndicator();
      }
      modalSnapshot = null;
      if (kind === 'styles') presets.cancelPresetConfirms();
      $(`modal-${kind}`).classList.add('hidden');
      modalFocus.close(`modal-${kind}`);
      if (applyAndSave) {
        await save({ forceReconnect: false });
      }
    }

    function wireStyleModals() {
      document.querySelectorAll('[data-open-modal]').forEach((btn) => {
        btn.addEventListener('click', () => openStyleModal(btn.dataset.openModal, btn.dataset.prefix, btn));
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

      images.wire();
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

    function showResetConfirmation(prefix, visible) {
      const confirmation = $(prefix === 'o_' ? 'overlay-reset-confirm' : 'widget-reset-confirm');
      confirmation.classList.toggle('hidden', !visible);
      if (visible) confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function confirmResetSection(prefix) {
      showResetConfirmation(prefix, false);
      await resetSectionToDefaults(prefix);
    }

    /* ---------------- Модальное окно Обновления ---------------- */

    function renderUpdateModalContent(data) {
      if (!data || !data.hasUpdate) return;
      const lang = document.documentElement.lang || document.documentElement.lang || 'en';
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
      modalFocus.open('modal-update');
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

      const closeUpdateModal = () => {
        $('modal-update').classList.add('hidden');
        modalFocus.close('modal-update');
      };
      $('btn-remind-later').onclick = closeUpdateModal;

      $('btn-skip-version').onclick = async () => {
        if (currentUpdateData && currentUpdateData.latestVersion) {
          await window.api.skipUpdateVersion(currentUpdateData.latestVersion);
        }
        closeUpdateModal();
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
          closeUpdateModal();
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
    let proxyStatusTimer = null;
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

    function showNotification(message, type = 'info', duration = 5000) {
      const stack = $('notification-stack');
      const item = document.createElement('div');
      item.className = 'app-notification' + (type ? ' ' + type : '');
      item.setAttribute('role', type === 'error' ? 'alert' : 'status');

      const text = document.createElement('span');
      text.className = 'app-notification-message';
      text.textContent = message;

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'app-notification-close';
      close.textContent = '×';
      close.setAttribute('aria-label', tr('ui.notificationDismiss'));

      let timer = null;
      const dismiss = () => {
        if (timer) clearTimeout(timer);
        item.remove();
      };
      close.addEventListener('click', dismiss);
      item.append(text, close);
      stack.appendChild(item);
      if (duration > 0) timer = setTimeout(dismiss, duration);
      return dismiss;
    }

    let savedSnapshot = null;
    let saveChangeRevision = 0;

    function getSaveSnapshot() {
      return JSON.stringify(Object.assign(readGeneral(), readAppearance('o_'), presets.readExtras('o_'), {
        widgetEnabled: $('widgetEnabled').checked,
        widgetPort: $('widgetPort').value.trim(),
        widget: Object.assign(readAppearance('w_'), presets.readExtras('w_'))
      }));
    }

    function setSaveIndicator(type) {
      const el = $('save-status');
      clearTimeout(setSaveIndicator.timer);
      el.className = type === 'dirty' || type === 'widgetFailed' ? 'warn' : type === 'error' ? 'error' : '';
      const keys = {
        dirty: 'ui.unsavedChanges',
        saved: 'ui.allChangesSaved',
        error: 'ui.saveFailed',
        widgetFailed: 'ui.savedWidgetFailed'
      };
      el.textContent = tr(keys[type] || '');
      if (type === 'saved') {
        setSaveIndicator.timer = setTimeout(() => {
          if (el.textContent === tr('ui.allChangesSaved')) el.textContent = '';
        }, 3000);
      }
    }

    function updateSaveIndicator() {
      if (savedSnapshot === null) return;
      const dirty = getSaveSnapshot() !== savedSnapshot;
      const el = $('save-status');
      if (dirty) {
        setSaveIndicator('dirty');
      } else if (el.classList.contains('warn') || el.classList.contains('error')) {
        el.textContent = '';
        el.className = '';
        clearTimeout(setSaveIndicator.timer);
      }
    }

    /* ---------------- Вкладки ---------------- */

    function updateSettingsMascot() {
      const content = document.querySelector('.content');
      if (!content) return;

      const contentRect = content.getBoundingClientRect();
      const rightEdge = content.clientWidth - parseFloat(getComputedStyle(content).paddingRight || 0);

      content.querySelectorAll('.settings-mascot').forEach((layer) => {
        const root = $(layer.dataset.mascotRoot);
        const tab = root && root.closest('.tab');
        const presetCard = root && root.querySelector('.style-card-presets');
        const imageCard = root && root.querySelector('.style-cards .style-card:last-child');
        const actions = root && root.querySelector('.tab-actions');

        if (!root || !tab || !presetCard || !imageCard || !actions ||
            tab.classList.contains('hidden') || root.classList.contains('hidden')) {
          layer.hidden = true;
          return;
        }

        const presetRect = presetCard.getBoundingClientRect();
        const imageRect = imageCard.getBoundingClientRect();
        const actionsRect = actions.getBoundingClientRect();
        const left = presetRect.right - contentRect.left + content.scrollLeft;
        const top = imageRect.bottom - contentRect.top + content.scrollTop;
        const width = rightEdge - left;
        const height = actionsRect.top - imageRect.bottom;

        layer.hidden = width <= 0 || height <= 0;
        if (layer.hidden) return;

        layer.style.left = `${left}px`;
        layer.style.top = `${top}px`;
        layer.style.width = `${width}px`;
        layer.style.height = `${height}px`;
      });
    }

    function setupSettingsMascot() {
      const content = document.querySelector('.content');
      if (!content) return;

      [
        { root: $('tab-overlay'), id: 'tab-overlay' },
        { root: $('widgetSettings'), id: 'widgetSettings' }
      ].forEach(({ root, id }) => {
        const layer = document.createElement('div');
        layer.className = 'settings-mascot';
        layer.dataset.mascotRoot = id;
        layer.setAttribute('aria-hidden', 'true');
        content.appendChild(layer);
      });

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(updateSettingsMascot);
        [content, $('tab-overlay'), $('widgetSettings')].forEach((el) => {
          if (el) observer.observe(el);
        });
        document.querySelectorAll('.style-card-presets, .style-cards .style-card:last-child, .tab-actions')
          .forEach((el) => observer.observe(el));
      }
      window.addEventListener('resize', updateSettingsMascot);
      requestAnimationFrame(updateSettingsMascot);
    }

    function showTab(name) {
      document.querySelectorAll('.tab-btn').forEach((b) => {
        const active = b.dataset.tab === name;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('hidden', t.id !== `tab-${name}`));
      requestAnimationFrame(updateSettingsMascot);
    }

    document.querySelectorAll('.tab-btn').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

    /* ---------------- Сохранение ---------------- */

    async function save(opts = {}) {
      const forceReconnect = opts.forceReconnect !== undefined ? !!opts.forceReconnect : false;
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
        setSaveIndicator('error');
        return;
      }

      const cfg = Object.assign(readGeneral(), readAppearance('o_'), presets.readExtras('o_'), {
        widgetEnabled,
        widgetPort: portText,
        widget: Object.assign(readAppearance('w_'), presets.readExtras('w_')),
        _forceReconnect: forceReconnect
      });
      const submittedConfig = JSON.parse(JSON.stringify(cfg));
      delete submittedConfig._forceReconnect;
      const submittedRevision = saveChangeRevision;

      try {
        const result = await window.api.saveConfig(cfg);
        if (!result || result.ok !== true) {
          setSaveIndicator('error');
          return;
        }
        if (result.widgetPort) {
          $('widgetPort').value = result.widgetPort;
          submittedConfig.widgetPort = result.widgetPort;
          updateLink();
        }
        if (Array.isArray(result.customPresets)) {
          customPresets = result.customPresets;
          submittedConfig.customPresets = result.customPresets;
          presets.renderPresetsLists();
        }
        if (result.widget) renderWidgetStatus(result.widget);

        savedSnapshot = submittedRevision === saveChangeRevision
          ? getSaveSnapshot()
          : JSON.stringify(submittedConfig);
        const widgetFailed = widgetEnabled && result.widget && result.widget.error;
        if (getSaveSnapshot() !== savedSnapshot) {
          setSaveIndicator('dirty');
        } else if (widgetFailed) {
          setSaveIndicator('widgetFailed');
        } else {
          setSaveIndicator('saved');
        }
      } catch (error) {
        console.error('[Settings] Save failed:', error);
        setSaveIndicator('error');
      }
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
      setupSettingsMascot();
      wireAppearance('o_', schedulePreview);
      wireAppearance('w_', scheduleWidgetPreview);
      wireStyleModals();
      presets.wireExtraModals();
      wireUpdateControls();

      const proxyStatus = $('proxy-test-status');
      const clearProxyStatus = () => {
        clearTimeout(proxyStatusTimer);
        proxyStatusTimer = null;
        proxyStatus.textContent = '';
        proxyStatus.className = 'proxy-test-status';
      };
      const showProxyStatus = (message, state, autoHide = false) => {
        clearProxyStatus();
        proxyStatus.textContent = message;
        if (state) proxyStatus.classList.add(state);
        if (autoHide) {
          proxyStatusTimer = setTimeout(clearProxyStatus, 12000);
        }
      };

      $('useProxy').onchange = () => {
        const enabled = $('useProxy').checked;
        $('proxyBox').classList.toggle('hidden', !enabled);
        if (!enabled) clearProxyStatus();
      };
      $('btn-test-proxy').onclick = async () => {
        const host = $('proxyHost').value.trim();
        const port = Number($('proxyPort').value);
        if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
          showProxyStatus(tr('ui.proxyTestIncomplete'), 'error', true);
          return;
        }

        const button = $('btn-test-proxy');
        button.disabled = true;
        showProxyStatus(tr('ui.proxyTestPending'));
        try {
          const result = await window.api.testProxy({
            host,
            port,
            username: $('proxyUser').value,
            password: $('proxyPass').value
          });
          if (!$('useProxy').checked) return;
          showProxyStatus(
            tr(result && result.ok ? 'ui.proxyTestSuccess' : 'ui.proxyTestError'),
            result && result.ok ? 'success' : 'error',
            true
          );
        } catch (_) {
          showProxyStatus(tr('ui.proxyTestError'), 'error', true);
        } finally {
          button.disabled = false;
        }
      };
      $('hideCommands').addEventListener('change', () => { schedulePreview(); scheduleWidgetPreview(); });
      $('ignoredBots').addEventListener('input', () => { schedulePreview(); scheduleWidgetPreview(); });

      $('widgetPort').addEventListener('input', updateLink);
      $('widgetEnabled').addEventListener('change', () => {
        $('widgetSettings').classList.toggle('hidden', !$('widgetEnabled').checked);
        requestAnimationFrame(updateSettingsMascot);
      });

      async function changeLanguage(lang) {
        if (lang !== 'en' && lang !== 'ru') return;
        applyStrings(await window.api.setLanguage(lang), lang);
      }
      $('language-en').onclick = () => changeLanguage('en');
      $('language-ru').onclick = () => changeLanguage('ru');

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
      $('btn-reset-overlay').onclick = () => showResetConfirmation('o_', true);
      $('btn-reset-widget').onclick = () => showResetConfirmation('w_', true);
      $('overlay-reset-cancel').onclick = () => showResetConfirmation('o_', false);
      $('widget-reset-cancel').onclick = () => showResetConfirmation('w_', false);
      $('overlay-reset-ok').onclick = () => confirmResetSection('o_');
      $('widget-reset-ok').onclick = () => confirmResetSection('w_');
      $('btn-save').onclick = () => save({ forceReconnect: false });
      const handleSaveRelevantChange = (event) => {
        if (event.target.closest('.modal-backdrop')) return;
        saveChangeRevision++;
        updateSaveIndicator();
      };
      document.addEventListener('input', handleSaveRelevantChange);
      document.addEventListener('change', handleSaveRelevantChange);

      const cfg = await window.api.loadConfig();
      if (cfg.defaults && typeof cfg.defaults === 'object') {
        defaultAppearance = Object.assign({}, defaultAppearance, cfg.defaults);
      }
      customPresets = Array.isArray(cfg.customPresets) ? cfg.customPresets : [];

      const lang = cfg.language || 'en';
      appVersion = cfg.currentVersion || '';
      isPortableBuild = !!cfg.isPortable;
      // Активный язык синхронизируется в applyStrings().

      $('channel').value = cfg.channel;
      $('useProxy').checked = cfg.useProxy;
      $('proxyBox').classList.toggle('hidden', !cfg.useProxy);
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
      $('widgetSettings').classList.toggle('hidden', !cfg.widgetEnabled);
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
        applyStrings(data.strings, data.language);
      });

      savedSnapshot = getSaveSnapshot();
      updateSaveIndicator();
    }

    const preview = window.SettingsPreview.create({
      $,
      readAppearance,
      getActiveModalTarget: () => activeModalTarget,
      SYSTEM_FONT,
      DEFAULT_TWITCH_NICK_SHADOW,
      DEFAULT_TWITCH_SAMPLE_COLOR,
      CARD_RESET_KEYS: window.SettingsPresets.CARD_RESET_KEYS,
      CARD_RESET_DEFAULTS: window.SettingsPresets.CARD_RESET_DEFAULTS,
      STYLE_KEYS
    });
    const {
      applyThumbStyle, paintMiniPlate, refreshAnimPreviews, updateMiniPreviews,
      playPreviewAnimation, hoverPreviewStyle, restorePreviewStyle, wirePresetHover
    } = preview;


    const presets = window.SettingsPresets.create({
      $, tr, trf, escapeHtml, state: presetState, STYLE_KEYS,
      readAppearance, save, triggerTargetPreview, schedulePreview,
      scheduleWidgetPreview, preview, modalFocus
    });

    const images = window.SettingsImages.create({
      $, tr, trf, notify: showNotification, state: presetState, updateMiniPreviews, triggerTargetPreview
    });

    init();
  