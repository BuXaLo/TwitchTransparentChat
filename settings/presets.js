(function () {
  const CARD_RESET_KEYS = ['cardImagePreset', 'cardImageCustom', 'cardImageFit', 'cardImagePosX', 'cardImagePosY', 'cardImageOpacity', 'cardImageScale'];
  const CARD_RESET_DEFAULTS = {
    cardImagePreset: 'none', cardImageCustom: '', cardImageFit: 'width',
    cardImagePosX: 50, cardImagePosY: 50, cardImageOpacity: 60, cardImageScale: 100
  };

  window.SettingsPresets = {
    CARD_RESET_KEYS,
    CARD_RESET_DEFAULTS,
    create(deps) {
      const {
        $, tr, trf, escapeHtml, state, STYLE_KEYS, readAppearance,
        save, triggerTargetPreview, schedulePreview, scheduleWidgetPreview, preview, modalFocus
      } = deps;
      const { applyThumbStyle, paintMiniPlate, wirePresetHover } = preview;

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

    function applyStyleObjectToTarget(prefix, styleObj) {
      if (!styleObj) return;
      // Пресет задаёт ВСЕ свои настройки целиком, включая картинку: сначала сбрасываем
      // картинку на задуманные в пресете значения (а не на текущие пользовательские),
      // затем накладываем остальные ключи стиля
      CARD_RESET_KEYS.forEach((k) => {
        state.appearanceState[prefix][k] = styleObj[k] !== undefined ? styleObj[k] : CARD_RESET_DEFAULTS[k];
      });
      STYLE_KEYS.forEach((k) => {
        if (styleObj[k] !== undefined) {
          state.appearanceState[prefix][k] = styleObj[k];
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
    

    // Курсор ушёл со строки: превью снова показывает реально применённый (нажатый) стиль
    

    

    function renderPresetsLists() {
      updateRotationDots();
      const builtinBox = $('builtin-presets-list');
      const customBox = $('custom-presets-list');
      if (!builtinBox || !customBox) return;

      builtinBox.innerHTML = '';

      // Первая строка — возврат к виду, который был у пользователя до открытия окна пресетов
      const currentRow = document.createElement('div');
      currentRow.className = 'preset-item' + (state.selectedPresetKey === 'current' ? ' active' : '');
      currentRow.innerHTML = `
        <div class="preset-info">
          <span class="preset-title">${escapeHtml(tr('ui.presetCurrent'))}</span>
          <span class="preset-desc">${escapeHtml(tr('ui.presetCurrentDesc'))}</span>
        </div>
      `;
      currentRow.onclick = () => {
        state.selectedPresetKey = 'current';
        if (state.modalSnapshot) {
          applyStyleObjectToTarget(state.activeModalTarget, state.modalSnapshot);
        }
        renderPresetsLists();
      };
      if (state.modalSnapshot) wirePresetHover(currentRow, state.modalSnapshot);
      builtinBox.appendChild(currentRow);

      // Встроенные пресеты, сгруппированные: «Простые» и «С картинкой».
      // Каждый ряд несёт миниатюру-плашку с образцом стиля, чтобы стиль был виден ещё до клика.
      const builtinRow = (preset) => {
        const key = `builtin:${preset.id}`;
        const item = document.createElement('div');
        item.className = 'preset-item' + (state.selectedPresetKey === key ? ' active' : '');

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
          state.selectedPresetKey = key;
          applyStyleObjectToTarget(state.activeModalTarget, preset.style);
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
      if (!Array.isArray(state.customPresets) || state.customPresets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'preset-empty';
        empty.textContent = tr('ui.stylesEmptyCustom');
        customBox.appendChild(empty);
        return;
      }

      state.customPresets.forEach((cp, idx) => {
        const key = `custom:${idx}`;
        const item = document.createElement('div');
        item.className = 'preset-item' + (state.selectedPresetKey === key ? ' active' : '');

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
          state.pendingPresetDelete = null;
          state.pendingPresetOverwrite = { name: cp.name, appearance: Object.assign({}, readAppearance(state.activeModalTarget)) };
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
          state.pendingPresetOverwrite = null;
          state.pendingPresetDelete = { name: cp.name };
          renderPresetConfirmBars();
          $('preset-delete-confirm').scrollIntoView({ block: 'nearest' });
        };
        item.appendChild(delBtn);

        item.onclick = () => {
          state.selectedPresetKey = key;
          applyStyleObjectToTarget(state.activeModalTarget, cp.appearance);
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

      const fullCurrent = readAppearance(state.activeModalTarget);
      const existingIdx = state.customPresets.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        state.pendingPresetDelete = null;
        state.pendingPresetOverwrite = { name: state.customPresets[existingIdx].name, appearance: Object.assign({}, fullCurrent) };
        renderPresetConfirmBars();
        return;
      }

      state.customPresets.push({
        name,
        appearance: Object.assign({}, fullCurrent)
      });
      state.selectedPresetKey = `custom:${state.customPresets.length - 1}`;

      state.pendingPresetOverwrite = null;
      nameInput.value = '';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    // Ники (в обеих вкладках), которым назначен этот сохранённый стиль
    function nicksUsingStyle(name) {
      const key = `custom:${String(name).toLowerCase()}`;
      const out = [];
      ['o_', 'w_'].forEach((p) => {
        state.extras[p].userStyles.forEach((u) => {
          if (String(u.styleKey).toLowerCase() === key && !out.includes(u.nick)) out.push(u.nick);
        });
      });
      return out;
    }

    // Замок на своём стиле: он не участвует в ротации. Если из-за этого ротация перестаёт работать, выключаем её явно и сообщаем.
    async function toggleStyleLock(name) {
      const cp = state.customPresets.find((x) => x.name === name);
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
      $('preset-overwrite-confirm').classList.toggle('hidden', !state.pendingPresetOverwrite);
      if (state.pendingPresetOverwrite) {
        $('preset-overwrite-text').textContent = trf('ui.stylesOverwriteConfirm', { name: state.pendingPresetOverwrite.name });
      }
      $('preset-delete-confirm').classList.toggle('hidden', !state.pendingPresetDelete);
      if (state.pendingPresetDelete) {
        let text = trf('ui.stylesDeleteConfirm', { name: state.pendingPresetDelete.name });
        const nicks = nicksUsingStyle(state.pendingPresetDelete.name);
        if (nicks.length) text += ' ' + trf('ui.stylesDeleteUsedBy', { list: nicks.join(', ') });
        $('preset-delete-text').textContent = text;
      }
    }

    function cancelPresetConfirms() {
      state.pendingPresetOverwrite = null;
      state.pendingPresetDelete = null;
      renderPresetConfirmBars();
    }

    async function confirmPresetOverwrite() {
      const pending = state.pendingPresetOverwrite;
      if (!pending) return;
      state.pendingPresetOverwrite = null;
      const idx = state.customPresets.findIndex((p) => p.name.toLowerCase() === pending.name.toLowerCase());
      if (idx >= 0) {
        state.customPresets[idx].appearance = pending.appearance;
        state.selectedPresetKey = `custom:${idx}`;
      } else {
        state.customPresets.push({ name: pending.name, locked: false, appearance: pending.appearance });
        state.selectedPresetKey = `custom:${state.customPresets.length - 1}`;
      }
      $('m_presetNameInput').value = '';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }

    async function confirmPresetDelete() {
      const pending = state.pendingPresetDelete;
      if (!pending) return;
      state.pendingPresetDelete = null;
      const idx = state.customPresets.findIndex((p) => p.name.toLowerCase() === pending.name.toLowerCase());
      if (idx < 0) {
        renderPresetConfirmBars();
        return;
      }
      state.customPresets.splice(idx, 1);
      if (state.selectedPresetKey === `custom:${idx}`) state.selectedPresetKey = 'current';
      renderPresetsLists();
      await save({ forceReconnect: false });
    }


    function resolveStyle(key) {
      if (typeof key !== 'string') return null;
      if (key.startsWith('builtin:')) {
        const bp = BUILTIN_PRESETS.find((x) => `builtin:${x.id}` === key);
        return bp ? { name: tr(bp.titleKey), appearance: Object.assign({}, state.defaultAppearance, bp.style) } : null;
      }
      if (key.startsWith('custom:')) {
        const nm = key.slice(7).toLowerCase();
        const cp = state.customPresets.find((x) => x.name.toLowerCase() === nm);
        return cp ? { name: cp.name, appearance: Object.assign({}, cp.appearance) } : null;
      }
      return null;
    }

    // Стили, доступные для ротации. Заблокированные (замок) не участвуют и не входят в счётчик.
    function rotatablePresets() {
      return state.customPresets.filter((x) => !x.locked);
    }

    // Состав ротации: <2 стилей — пусто, ровно 2 — оба автоматически, от 3 — выбранные (до 5)
    function effectiveRotationNames(p) {
      const avail = rotatablePresets();
      const n = avail.length;
      if (n < 2) return [];
      const rot = state.extras[p].rotation;
      if (n === 2 || rot.source !== 'manual') return avail.map((x) => x.name);
      return (rot.names || []).filter((nm) => avail.some((x) => x.name === nm)).slice(0, 5);
    }

    // Данные вкладки для сохранения и живого предпросмотра (снимки обновляются по актуальным сохранённым стилям)
    function readExtras(p) {
      const ex = state.extras[p];
      ex.userStyles.forEach((u) => {
        const r = resolveStyle(u.styleKey);
        if (r) { u.appearance = r.appearance; u.styleName = r.name; }
      });
      const n = rotatablePresets().length;
      const names = effectiveRotationNames(p);
      const enabled = !!ex.rotation.enabled && n >= 2 && (n === 2 || ex.rotation.source !== 'manual' || names.length >= 3);
      ex.rotation.enabled = enabled;
      const random = !!ex.rotation.random && n >= 3 && names.length >= 3;
      const pool = names.map((nm) => ({ name: nm, appearance: Object.assign({}, state.customPresets.find((x) => x.name === nm).appearance) }));
      return {
        userStyles: ex.userStyles.map((u) => ({ nick: u.nick, styleKey: u.styleKey, styleName: u.styleName, appearance: u.appearance })),
        rotation: { source: n === 2 ? 'all' : ex.rotation.source, enabled, random, pool }
      };
    }

    function normalizeNick(v) {
      const name = String(v || '').trim().replace(/^[#@]/, '').toLowerCase();
      return /^[a-z0-9_]{1,25}$/.test(name) ? name : '';
    }

    function openExtraModal(kind, p, trigger) {
      state.extraTarget = p;
      const tabName = tr(p === 'o_' ? 'ui.tabOverlay' : 'ui.tabWidget');
      if (kind === 'userstyles') {
        state.usEditing = null; state.usPendingDup = null; state.usPendingDelete = null;
        $('us-nick').value = '';
        $('us-error').classList.add('hidden');
        $('us-title').textContent = `${tr('ui.userStylesTitle')} — ${tabName}`;
        renderUserStyles();
      } else {
        $('rot-title').textContent = `${tr('ui.rotationTitle')} — ${tabName}`;
        const rot = state.extras[p].rotation;
        const nFree = rotatablePresets().length;
        const manual = nFree >= 3 && rot.source === 'manual';
        state.rotDraft = {
          enabled: !!rot.enabled && nFree >= 2,
          source: manual ? 'manual' : 'all',
          order: rot.random && nFree >= 3 ? 'random' : 'seq',
          names: manual ? effectiveRotationNames(p).slice() : []
        };
        state.rotPreviewCfg = state.defaultAppearance;
        renderRotation();
      }
      $(`modal-${kind}`).classList.remove('hidden');
      modalFocus.open(`modal-${kind}`, trigger);
    }

    function closeExtraModal(kind) {
      if (kind === 'userstyles') { state.usEditing = null; state.usPendingDup = null; state.usPendingDelete = null; }
      if (kind === 'rotation') state.rotDraft = null;
      $(`modal-${kind}`).classList.add('hidden');
      modalFocus.close(`modal-${kind}`);
    }

    function renderUserStyles() {
      const ex = state.extras[state.extraTarget];
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
      addGroup('ui.userStylesStyleCustom', state.customPresets.map((cp) => [`custom:${cp.name}`, cp.name]));
      if (prev && Array.from(sel.options).some((o) => o.value === prev)) sel.value = prev;

      $('us-assign').textContent = tr(state.usEditing ? 'ui.userStylesSaveChanges' : 'ui.userStylesAssign');
      $('us-cancel-edit').classList.toggle('hidden', !state.usEditing);
      $('us-nick').disabled = !!state.usEditing;

      // Защита: замена существующего пользователя и удаление — только после подтверждения
      const bar = $('us-confirm');
      bar.classList.toggle('hidden', !state.usPendingDup && !state.usPendingDelete);
      if (state.usPendingDup) {
        const old = ex.userStyles.find((u) => u.nick === state.usPendingDup.nick);
        const oldRes = old ? resolveStyle(old.styleKey) : null;
        const nw = resolveStyle(state.usPendingDup.key);
        $('us-confirm-text').textContent = trf('ui.userStylesDupConfirm', {
          nick: state.usPendingDup.nick,
          old: oldRes ? oldRes.name : (old ? old.styleName : ''),
          name: nw ? nw.name : ''
        });
        $('us-confirm-ok').textContent = tr('ui.userStylesDupYes');
      } else if (state.usPendingDelete) {
        $('us-confirm-text').textContent = trf('ui.userStylesDeleteConfirm', { nick: state.usPendingDelete });
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
        item.className = 'preset-item' + (state.usEditing === u.nick ? ' active' : '');
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
          state.usEditing = u.nick; state.usPendingDup = null; state.usPendingDelete = null;
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
          state.usPendingDup = null; state.usPendingDelete = u.nick;
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
      while (state.customPresets.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
        const suffix = ` (${i++})`;
        name = base.slice(0, 40 - suffix.length) + suffix;
      }
      state.customPresets.push({ name, locked: false, appearance: Object.assign({}, u.appearance) });
      const oldKey = u.styleKey;
      state.extras[state.extraTarget].userStyles.forEach((x) => {
        if (x.styleKey === oldKey) { x.styleKey = `custom:${name}`; x.styleName = name; }
      });
      renderPresetsLists();
      renderUserStyles();
      await save({ forceReconnect: false });
    }

    async function commitUserStyle(nick, key) {
      const ex = state.extras[state.extraTarget];
      const r = resolveStyle(key);
      if (!r) return;
      const entry = { nick, styleKey: key, styleName: r.name, appearance: r.appearance };
      const idx = ex.userStyles.findIndex((u) => u.nick === nick);
      if (idx >= 0) ex.userStyles[idx] = entry; else ex.userStyles.push(entry);
      state.usEditing = null; state.usPendingDup = null;
      $('us-nick').value = '';
      renderUserStyles();
      await save({ forceReconnect: false });
    }

    async function assignUserStyle() {
      const ex = state.extras[state.extraTarget];
      const err = $('us-error');
      err.classList.add('hidden');
      const nick = state.usEditing || normalizeNick($('us-nick').value);
      const key = $('us-style').value;
      if (!nick || !key) {
        err.textContent = tr('ui.userStylesBadNick');
        err.classList.remove('hidden');
        return;
      }
      if (!state.usEditing && ex.userStyles.some((u) => u.nick === nick)) {
        state.usPendingDelete = null;
        state.usPendingDup = { nick, key };
        renderUserStyles();
        return;
      }
      await commitUserStyle(nick, key);
    }

    async function confirmUserStylesAction() {
      const ex = state.extras[state.extraTarget];
      if (state.usPendingDup) {
        const { nick, key } = state.usPendingDup;
        await commitUserStyle(nick, key);
      } else if (state.usPendingDelete) {
        const nick = state.usPendingDelete;
        ex.userStyles = ex.userStyles.filter((u) => u.nick !== nick);
        state.usPendingDelete = null;
        if (state.usEditing === nick) { state.usEditing = null; $('us-nick').value = ''; }
        renderUserStyles();
        await save({ forceReconnect: false });
      }
    }

    function cancelUserStylesConfirm() {
      state.usPendingDup = null; state.usPendingDelete = null;
      renderUserStyles();
    }

    function cancelUserStylesEdit() {
      state.usEditing = null; state.usPendingDup = null; state.usPendingDelete = null;
      $('us-nick').value = '';
      renderUserStyles();
    }

    // Окно ротации работает с черновиком state.rotDraft: в конфиг попадает только после «Сохранить»
    function renderRotation() {
      if (!state.rotDraft) return;
      const d = state.rotDraft;
      const n = rotatablePresets().length;
      const locked = state.customPresets.length - n;
      const manual = n >= 3 && d.source === 'manual';
      const helpText = tr('ui.rotationIntro') + '\n\n' + tr(state.extraTarget === 'o_' ? 'ui.rotationMentionOverlay' : 'ui.rotationMentionWidget');
      $('rot-help').dataset.tip = helpText;
      $('rot-help').setAttribute('aria-label', helpText);
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
        paintMiniPlate($('rot-plate'), state.rotPreviewCfg || state.defaultAppearance, ['mini-preview-plate']);
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
        state.customPresets.forEach((cp) => {
          const inPool = d.names.includes(cp.name);
          const row = document.createElement('div');
          row.className = 'rot-row' + (cp.locked ? ' locked' : '');
          row.onmouseenter = () => { state.rotPreviewCfg = cp.appearance; paintMiniPlate($('rot-plate'), cp.appearance, ['mini-preview-plate']); };
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
      if (!state.rotDraft) return;
      const p = state.extraTarget;
      const d = state.rotDraft;
      const n = rotatablePresets().length;
      const rot = state.extras[p].rotation;
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
        btn.addEventListener('click', () => openExtraModal(btn.dataset.openExtra, btn.dataset.prefix, btn));
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
      $('rot-enable').addEventListener('change', () => { state.rotDraft.enabled = $('rot-enable').checked; renderRotation(); });
      $('rot-src-all').addEventListener('change', () => { state.rotDraft.source = 'all'; renderRotation(); });
      $('rot-src-manual').addEventListener('change', () => { state.rotDraft.source = 'manual'; renderRotation(); });
      $('rot-ord-seq').addEventListener('click', () => { state.rotDraft.order = 'seq'; renderRotation(); });
      $('rot-ord-random').addEventListener('click', () => { state.rotDraft.order = 'random'; renderRotation(); });
      $('rot-cancel').addEventListener('click', () => closeExtraModal('rotation'));
      $('rot-save').addEventListener('click', saveRotationModal);
    }



      function wirePresetControls() {
        $('btn-save-custom-preset').addEventListener('click', saveCurrentAsCustomPreset);
        $('btn-preset-overwrite-ok').addEventListener('click', confirmPresetOverwrite);
        $('btn-preset-overwrite-cancel').addEventListener('click', cancelPresetConfirms);
        $('btn-preset-delete-ok').addEventListener('click', confirmPresetDelete);
        $('btn-preset-delete-cancel').addEventListener('click', cancelPresetConfirms);
        $('m_presetNameInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); saveCurrentAsCustomPreset(); }
        });
      }

      return {
        renderPresetsLists, saveCurrentAsCustomPreset, toggleStyleLock,
        renderPresetConfirmBars, cancelPresetConfirms, confirmPresetOverwrite, confirmPresetDelete,
        resolveStyle, normalizeNick, renderUserStyles, assignUserStyle, commitUserStyle,
        saveUserStyleCopyAsPreset, confirmUserStylesAction, cancelUserStylesConfirm, cancelUserStylesEdit,
        rotatablePresets, effectiveRotationNames, readExtras, openExtraModal, closeExtraModal,
        renderRotation, saveRotationModal, updateRotationDots, wireExtraModals, wirePresetControls
      };
    }
  };
})();
