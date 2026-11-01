'use strict';

/**
 * Модуль проверки и установки обновлений.
 * 1) Проверка последнего релиза в GitHub API через сетевой слой с поддержкой SOCKS5 (emotes.fetchJson).
 * 2) Парсинг Release Notes по языку интерфейса (EN / RU), включая заголовки с эмодзи-флагами.
 * 3) Для NSIS-установщика: фоновая скачка и перезапуск через electron-updater (с фоллбеком на браузер при ошибке прокси).
 * 4) Для Portable-сборки: прямая ссылка на скачивание нового .exe файла.
 */

const { app, shell } = require('electron');
const emotes = require('./emotes');

const GITHUB_OWNER = 'BuXaLo';
const GITHUB_REPO = 'TwitchTransparentChat';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_HTML_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

function isPortableBuild() {
  return !!process.env.PORTABLE_EXECUTABLE_FILE;
}

function cleanVersion(v) {
  return String(v || '').trim().replace(/^v/i, '');
}

function isNewerVersion(current, latest) {
  const c = cleanVersion(current).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const l = cleanVersion(latest).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

/**
 * Вырезает локализованную секцию из Markdown-описания релиза (поддерживает заголовки с эмодзи-флагами,
 * например "## 🇬🇧 English" / "## 🇷🇺 Русский" / "## ru Русский"), иначе возвращает весь текст.
 */
function extractLocalizedNotes(rawBody, lang) {
  const body = String(rawBody || '').replace(/\r\n/g, '\n').trim();
  if (!body) return '';

  const lines = body.split('\n');
  const sections = { ru: [], en: [] };
  let currentLang = null;
  let foundLanguageHeaders = false;

  const isRuHeader = (line) => /^#{1,4}\s+.*(?:Русский|Russian|\bru\b)/i.test(line);
  const isEnHeader = (line) => /^#{1,4}\s+.*(?:English|\ben\b)/i.test(line);

  for (const line of lines) {
    const trimmed = line.trim();
    if (isRuHeader(trimmed)) {
      currentLang = 'ru';
      foundLanguageHeaders = true;
      continue;
    }
    if (isEnHeader(trimmed)) {
      currentLang = 'en';
      foundLanguageHeaders = true;
      continue;
    }
    // Пропускаем общий верхний заголовок версии вроде "# v1.3.1" до начала языковых секций
    if (!currentLang && /^#\s+v?\d+\.\d+/i.test(trimmed)) {
      continue;
    }
    // Горизонтальный разделитель между языковыми блоками пропускаем
    if (currentLang && /^---+$/.test(trimmed)) {
      continue;
    }
    if (currentLang) {
      sections[currentLang].push(line);
    }
  }

  if (foundLanguageHeaders) {
    const target = lang === 'ru' ? 'ru' : 'en';
    const fallback = lang === 'ru' ? 'en' : 'ru';
    const picked = sections[target].join('\n').trim() || sections[fallback].join('\n').trim();
    if (picked) return picked;
  }

  return body;
}

/**
 * Ищет подходящие бинарники среди ассетов релиза.
 */
function pickAssets(assets, htmlUrl) {
  const list = Array.isArray(assets) ? assets : [];
  const exeAssets = list.filter((a) => a && typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe'));

  const setupAsset = exeAssets.find((a) => a.name.toLowerCase().includes('setup'));
  const portableAsset = exeAssets.find((a) => !a.name.toLowerCase().includes('setup'));

  return {
    setupDownloadUrl: (setupAsset && setupAsset.browser_download_url) || htmlUrl || RELEASES_HTML_URL,
    portableDownloadUrl: (portableAsset && portableAsset.browser_download_url) || htmlUrl || RELEASES_HTML_URL
  };
}

/**
 * Проверяет наличие обновлений на GitHub.
 */
async function checkForUpdates(options = {}) {
  const { ignoredVersion = '', lang = 'en', ignoreSkipped = false } = options;
  const currentVersion = app.getVersion();
  const isPortable = isPortableBuild();

  try {
    const release = await emotes.fetchJson(RELEASES_API_URL);
    if (!release || !release.tag_name) {
      return { hasUpdate: false, currentVersion, isPortable };
    }

    const latestVersion = cleanVersion(release.tag_name);
    const newer = isNewerVersion(currentVersion, latestVersion);
    if (!newer) {
      return { hasUpdate: false, currentVersion, latestVersion, isPortable };
    }

    if (!ignoreSkipped && ignoredVersion && cleanVersion(ignoredVersion) === latestVersion) {
      return { hasUpdate: false, skipped: true, currentVersion, latestVersion, isPortable };
    }

    const urls = pickAssets(release.assets, release.html_url);
    const rawNotes = String(release.body || '');
    const notes = extractLocalizedNotes(rawNotes, lang);

    return {
      hasUpdate: true,
      currentVersion,
      latestVersion,
      releaseNotes: notes,
      rawNotes,
       notesRu: extractLocalizedNotes(rawNotes, 'ru'),
      notesEn: extractLocalizedNotes(rawNotes, 'en'),
      releaseUrl: release.html_url || RELEASES_HTML_URL,
      setupDownloadUrl: urls.setupDownloadUrl,
      portableDownloadUrl: urls.portableDownloadUrl,
      isPortable
    };
  } catch (err) {
    return {
      hasUpdate: false,
      error: err && err.message ? err.message : 'Update check failed',
      currentVersion,
      isPortable
    };
  }
}

/**
 * Запускает установку обновления:
 * - В Portable или при активном SOCKS5 с авторизацией открывает ссылку на скачивание.
 * - В NSIS-установщике пытается скачать и установить через electron-updater.
 */
function downloadAndInstallUpdate(updateInfo, callbacks = {}) {
  const { onProgress, onDownloaded, onError, useProxy } = callbacks;
  const isPortable = isPortableBuild();

  const fallbackUrl = isPortable
    ? (updateInfo && updateInfo.portableDownloadUrl) || RELEASES_HTML_URL
    : (updateInfo && updateInfo.setupDownloadUrl) || RELEASES_HTML_URL;

  if (isPortable || useProxy || !app.isPackaged) {
    shell.openExternal(fallbackUrl);
    return Promise.resolve({ mode: 'browser', url: fallbackUrl });
  }

  return new Promise((resolve) => {
    let autoUpdater;
    try {
      ({ autoUpdater } = require('electron-updater'));
    } catch (e) {
      shell.openExternal(fallbackUrl);
      return resolve({ mode: 'browser', url: fallbackUrl });
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    const cleanup = () => {
      autoUpdater.removeListener('download-progress', handleProgress);
      autoUpdater.removeListener('update-downloaded', handleDownloaded);
      autoUpdater.removeListener('error', handleError);
    };

    const handleProgress = (prog) => {
      if (onProgress) onProgress({ percent: Math.round(prog.percent || 0) });
    };

    const handleDownloaded = () => {
      cleanup();
      if (onDownloaded) onDownloaded();
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
      resolve({ mode: 'updater' });
    };

    const handleError = (err) => {
      cleanup();
      if (onError) onError(err ? err.message : 'Updater error');
      shell.openExternal(fallbackUrl);
      resolve({ mode: 'browser-fallback', url: fallbackUrl });
    };

    autoUpdater.on('download-progress', handleProgress);
    autoUpdater.on('update-downloaded', handleDownloaded);
    autoUpdater.on('error', handleError);

    autoUpdater.checkForUpdates().catch(handleError);
  });
}

module.exports = {
  isPortableBuild,
  cleanVersion,
  isNewerVersion,
  extractLocalizedNotes,
  checkForUpdates,
  downloadAndInstallUpdate
};
