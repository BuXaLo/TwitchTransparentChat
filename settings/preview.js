(function () {
  window.SettingsPreview = {
    create(deps) {
      const {
        $, readAppearance, getActiveModalTarget,
        SYSTEM_FONT, DEFAULT_TWITCH_NICK_SHADOW, DEFAULT_TWITCH_SAMPLE_COLOR,
        CARD_RESET_KEYS, CARD_RESET_DEFAULTS, STYLE_KEYS
      } = deps;

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

function refreshAnimPreviews() {
      ['o_', 'w_'].forEach((p) => {
        const btn = document.querySelector(`[data-anim-preview="${p}"]`);
        const plate = btn && btn.parentElement ? btn.parentElement.querySelector('[data-anim-plate]') : null;
        if (plate && $(p + 'fontSize')) paintMiniPlate(plate, readAppearance(p), ['anim-preview-plate', 'mini-preview-plate']);
      });
    }

function updateMiniPreviews(prefix) {
      const cfg = readAppearance(prefix || getActiveModalTarget() || 'o_');
      document.querySelectorAll('[data-mini-preview]').forEach((el) => paintMiniPlate(el, cfg, ['mini-preview-plate']));
      refreshAnimPreviews();
    }

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

function hoverPreviewStyle(styleObj) {
      const el = document.querySelector('#modal-styles [data-mini-preview]');
      if (!el || !styleObj) return;
      const cfg = Object.assign({}, readAppearance(getActiveModalTarget()));
      CARD_RESET_KEYS.forEach((k) => { cfg[k] = styleObj[k] !== undefined ? styleObj[k] : CARD_RESET_DEFAULTS[k]; });
      STYLE_KEYS.concat(['fontFamily', 'textAlign', 'layoutMode']).forEach((k) => {
        if (styleObj[k] !== undefined) cfg[k] = styleObj[k];
      });
      paintMiniPlate(el, cfg, ['mini-preview-plate']);
    }

function restorePreviewStyle() {
      const el = document.querySelector('#modal-styles [data-mini-preview]');
      if (el) paintMiniPlate(el, readAppearance(getActiveModalTarget()), ['mini-preview-plate']);
    }

function wirePresetHover(item, styleObj) {
      item.addEventListener('mouseenter', () => hoverPreviewStyle(styleObj));
      item.addEventListener('mouseleave', restorePreviewStyle);
    }

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

      return {
        applyThumbStyle, paintMiniPlate, refreshAnimPreviews, updateMiniPreviews,
        playPreviewAnimation, hoverPreviewStyle, restorePreviewStyle, wirePresetHover
      };
    }
  };
})();
