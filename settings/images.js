(function () {
  const CARD_IMAGE_BASE = {
    'hearts-tile':  { fit: 'tile',  posX: 50, posY: 50, opacity: 45,  scale: 100 },
    'clouds':       { fit: 'tile',  posX: 50, posY: 50, opacity: 80,  scale: 100 },
    'stars-shape':  { fit: 'tile',  posX: 50, posY: 50, opacity: 70,  scale: 100 },
    'confetti':     { fit: 'tile',  posX: 50, posY: 50, opacity: 60,  scale: 100 }
  };
  const CARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
  const CARD_IMAGE_MAX_SIDE = 1920;
  const CARD_IMAGE_MAX_SOURCE_SIDE = 8000;
  const CARD_IMAGE_RESULT_MAX_BYTES = 5 * 1024 * 1024;

  function create({ $, tr, trf, notify, state, updateMiniPreviews, triggerTargetPreview }) {
    let cardImages = [];

    function activeAppearance() {
      return state.appearanceState[state.activeModalTarget];
    }

    async function syncImageModalCustomOption() {
      const st = activeAppearance();
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
      $('m_cardImageSource').value = st.cardImageCustom ? `img:${st.cardImageCustom}` : (st.cardImagePreset || 'none');
      $('m_cardImageManageRow').style.display = st.cardImageCustom ? '' : 'none';
    }

    function remapCardRefsInState(oldId, newId) {
      const appearanceState = state.appearanceState;
      Object.keys(appearanceState).forEach((k) => {
        if (appearanceState[k] && appearanceState[k].cardImageCustom === oldId) appearanceState[k].cardImageCustom = newId;
      });
      (state.customPresets || []).forEach((p) => {
        if (p.appearance && p.appearance.cardImageCustom === oldId) p.appearance.cardImageCustom = newId;
      });
      ['o_', 'w_'].forEach((pfx) => {
        state.extras[pfx].userStyles.forEach((u) => {
          if (u.appearance && u.appearance.cardImageCustom === oldId) u.appearance.cardImageCustom = newId;
        });
      });
    }

    function findCardImageUsage(id) {
      const use = { tabs: [], styles: [], nicks: [] };
      const appearanceState = state.appearanceState;
      ['o_', 'w_'].forEach((pfx) => {
        if (appearanceState[pfx] && appearanceState[pfx].cardImageCustom === id) use.tabs.push(pfx);
        state.extras[pfx].userStyles.forEach((u) => {
          if (u.appearance && u.appearance.cardImageCustom === id && !use.nicks.includes(u.nick)) use.nicks.push(u.nick);
        });
      });
      (state.customPresets || []).forEach((cp) => {
        if (cp.appearance && cp.appearance.cardImageCustom === id) use.styles.push(cp.name);
      });
      return use;
    }

    function findCardImageByValue(srcVal) {
      if (!srcVal || !srcVal.startsWith('img:')) return null;
      const id = srcVal.slice(4);
      return cardImages.find((i) => i.id === id) || null;
    }

    async function handleCardImageUpload(file) {
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return;
      if (file.size > CARD_IMAGE_MAX_BYTES) {
        notify(tr('ui.cardImageTooBig'), 'warning');
        return;
      }

      const buf = await file.arrayBuffer();
      const blob = new Blob([buf], { type: file.type });
      const bitmap = await createImageBitmap(blob).catch(() => null);
      if (!bitmap) {
        notify(tr('ui.cardImageAnimated'), 'warning');
        return;
      }
      const longSide = Math.max(bitmap.width, bitmap.height);
      if (longSide > CARD_IMAGE_MAX_SOURCE_SIDE) {
        bitmap.close && bitmap.close();
        notify(tr('ui.cardImageBadSize'), 'warning');
        return;
      }

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
        notify(tr('ui.cardImageResultTooBig'), 'error');
        return;
      }
      const webpBuf = await webpBlob.arrayBuffer();
      const name = ($('m_cardImageName').value || '').trim() || (file.name || 'Picture').replace(/\.[^.]+$/, '');
      const res = await window.api.saveCardImage(webpBuf, name);
      if (!res || !res.ok) {
        notify(tr(res && res.error === 'size' ? 'ui.cardImageResultTooBig' : 'ui.cardImageSaveFailed'), 'error');
        return;
      }

      const st = activeAppearance();
      st.cardImageCustom = res.id;
      st.cardImagePreset = 'none';
      st.cardImageFit = 'width';
      st.cardImagePosX = 50;
      st.cardImagePosY = 50;
      st.cardImageOpacity = 60;
      st.cardImageScale = 100;
      await syncImageModalCustomOption();
      notify(tr('ui.cardImageUploaded'), 'success');
      $('m_cardImageSource').value = `img:${res.id}`;
      $('m_cardImageName').value = res.name;
      $('m_cardImageManageRow').style.display = '';
      $('m_cardImageFit').value = 'width';
      $('m_cardImagePosX').value = 50; $('m_cardImagePosXVal').textContent = '50%';
      $('m_cardImagePosY').value = 50; $('m_cardImagePosYVal').textContent = '50%';
      $('m_cardImageOpacity').value = 60; $('m_cardImageOpacityVal').textContent = '60%';
      $('m_cardImageScale').value = 100; $('m_cardImageScaleVal').textContent = '100%';
      updateMiniPreviews(state.activeModalTarget);
      triggerTargetPreview(state.activeModalTarget);
    }

    function hideImageDeleteConfirm() {
      $('img-delete-confirm').classList.add('hidden');
    }

    function populateModalInputs(st) {
      hideImageDeleteConfirm();
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
    }

    function resetToDefaults(st, defaults) {
      Object.assign(st, {
        cardImagePreset: defaults.cardImagePreset || 'none',
        cardImageCustom: '',
        cardImageFit: defaults.cardImageFit || 'width',
        cardImagePosX: defaults.cardImagePosX !== undefined ? defaults.cardImagePosX : 50,
        cardImagePosY: defaults.cardImagePosY !== undefined ? defaults.cardImagePosY : 50,
        cardImageOpacity: defaults.cardImageOpacity !== undefined ? defaults.cardImageOpacity : 60,
        cardImageScale: defaults.cardImageScale !== undefined ? defaults.cardImageScale : 100
      });
    }

    function readModalIntoState(st) {
      const prevSrc = st.cardImageCustom ? `img:${st.cardImageCustom}` : st.cardImagePreset;
      const srcVal = $('m_cardImageSource').value;
      const changed = srcVal !== prevSrc;
      const isCustom = srcVal.startsWith('img:');
      st.cardImagePreset = isCustom ? 'none' : srcVal;
      st.cardImageCustom = isCustom ? srcVal.slice(4) : '';
      if (changed) {
        if (isCustom) {
          st.cardImageFit = 'width'; st.cardImagePosX = 50; st.cardImagePosY = 50;
          st.cardImageOpacity = 60; st.cardImageScale = 100;
          $('m_cardImageFit').value = 'width';
          $('m_cardImagePosX').value = 50; $('m_cardImagePosXVal').textContent = '50%';
          $('m_cardImagePosY').value = 50; $('m_cardImagePosYVal').textContent = '50%';
          $('m_cardImageOpacity').value = 60; $('m_cardImageOpacityVal').textContent = '60%';
          $('m_cardImageScale').value = 100; $('m_cardImageScaleVal').textContent = '100%';
        } else {
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
      if (changed) {
        const entry = st.cardImageCustom ? findCardImageByValue(srcVal) : null;
        $('m_cardImageName').value = entry ? entry.name : '';
      }
    }

    function wire() {
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
        e.target.value = '';
      });
      $('m_cardImageRename').addEventListener('click', async () => {
        const st = activeAppearance();
        if (!st.cardImageCustom) return;
        const name = ($('m_cardImageName').value || '').trim();
        if (!name) return;
        const res = await window.api.renameCardImage(st.cardImageCustom, name);
        if (!res || !res.ok) {
          notify(tr('ui.cardImageSaveFailed'), 'error');
          return;
        }
        remapCardRefsInState(res.oldId, res.id);
        notify(tr('ui.cardImageRenamed'), 'success');
        await syncImageModalCustomOption();
        $('m_cardImageSource').value = `img:${res.id}`;
        $('m_cardImageName').value = res.name;
        updateMiniPreviews(state.activeModalTarget);
        triggerTargetPreview(state.activeModalTarget);
      });
      $('m_cardImageSource').addEventListener('change', hideImageDeleteConfirm);
      $('m_cardImageDelete').addEventListener('click', () => {
        const st = activeAppearance();
        if (!st.cardImageCustom) return;
        const id = st.cardImageCustom;
        const use = findCardImageUsage(id);
        const otherTabs = use.tabs.filter((pfx) => pfx !== state.activeModalTarget);
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
        const st = activeAppearance();
        const deletedId = st.cardImageCustom;
        if (!deletedId) return;
        const res = await window.api.deleteCardImage(deletedId);
        if (!res || !res.ok) {
          notify(tr('ui.cardImageSaveFailed'), 'error');
          return;
        }
        remapCardRefsInState(deletedId, '');
        notify(tr('ui.cardImageDeleted'), 'success');
        st.cardImageCustom = '';
        st.cardImagePreset = 'none';
        await syncImageModalCustomOption();
        $('m_cardImageSource').value = 'none';
        $('m_cardImageName').value = '';
        $('m_cardImageManageRow').style.display = 'none';
        updateMiniPreviews(state.activeModalTarget);
        triggerTargetPreview(state.activeModalTarget);
      });
      $('modal-image').addEventListener('input', () => {
        readModalIntoState(activeAppearance());
        triggerTargetPreview(state.activeModalTarget);
      });
      $('modal-image').addEventListener('change', () => {
        readModalIntoState(activeAppearance());
        triggerTargetPreview(state.activeModalTarget);
      });
    }

    return {
      syncImageModalCustomOption,
      populateModalInputs,
      resetToDefaults,
      readModalIntoState,
      wire
    };
  }

  window.SettingsImages = { create };
})();
