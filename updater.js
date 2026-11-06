'use strict';

/**
 * Модуль проверки и установки обновлений.
 * 1) Проверка последнего релиза в GitHub API через сетевой слой с поддержкой SOCKS5 (emotes.fetchJson).
 *    Если API недоступен (лимит 60 запросов в час на IP без токена, общий IP, VPN), версия берётся из latest.yml релиза.
 * 2) Парсинг Release Notes по языку интерфейса (EN / RU), включая заголовки с эмодзи-флагами.
 * 3) Для NSIS-установщика: фоновая скачка и перезапуск через electron-updater (с фоллбеком на страницу релиза при ошибке).
 * 4) Для Portable-сборки: прямая ссылка на скачивание нового .exe файла.
 */

const { app, shell } = require('electron');
const emotes = require('./emotes');

const GITHUB_OWNER = 'BuXaLo';
const GITHUB_REPO = 'TwitchTransparentChat';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_HTML_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const LATEST_YML_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/latest.yml`;
const REPO_URL_PREFIX = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/`;

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
 * Запасной источник версии: latest.yml из последнего релиза. Это обычный файл релиза, а не API,
 * поэтому лимит GitHub API на него не распространяется. Заметок к релизу в нём нет.
 */
async function fetchLatestVersionFromYml() {
  const res = await emotes.httpGet(LATEST_YML_URL, { maxBytes: 256 * 1024 });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const m = res.body.toString('utf8').match(/^version:\s*['"]?(\d[^\s'"]*)/m);
  if (!m) throw new Error('latest.yml: version not found');
  return m[1];
}

/**
 * Проверяет наличие обновлений на GitHub.
 */
async function checkForUpdates(options = {}) {
  const { ignoredVersion = '', lang = 'en', ignoreSkipped = false } = options;
  const currentVersion = app.getVersion();
  const isPortable = isPortableBuild();

  let release = null;
  let apiError = null;
  try {
    release = await emotes.fetchJson(RELEASES_API_URL);
  } catch (err) {
    apiError = err;
  }

  let latestVersion;
  if (release && release.tag_name) {
    latestVersion = cleanVersion(release.tag_name);
  } else {
    try {
      latestVersion = cleanVersion(await fetchLatestVersionFromYml());
      release = null;
    } catch (ymlErr) {
      const err = apiError || ymlErr;
      return {
        hasUpdate: false,
        error: err && err.message ? err.message : 'Update check failed',
        currentVersion,
        isPortable
      };
    }
  }

  if (!isNewerVersion(currentVersion, latestVersion)) {
    return { hasUpdate: false, currentVersion, latestVersion, isPortable };
  }

  if (!ignoreSkipped && ignoredVersion && cleanVersion(ignoredVersion) === latestVersion) {
    return { hasUpdate: false, skipped: true, currentVersion, latestVersion, isPortable };
  }

  // Без ответа API нет ни ссылок на ассеты, ни заметок: ведём на страницу релиза, Setup скачает electron-updater.
  const urls = pickAssets(release && release.assets, release && release.html_url);
  const rawNotes = release ? String(release.body || '') : '';

  return {
    hasUpdate: true,
    currentVersion,
    latestVersion,
    releaseNotes: extractLocalizedNotes(rawNotes, lang),
    rawNotes,
    notesRu: extractLocalizedNotes(rawNotes, 'ru'),
    notesEn: extractLocalizedNotes(rawNotes, 'en'),
    releaseUrl: (release && release.html_url) || RELEASES_HTML_URL,
    setupDownloadUrl: urls.setupDownloadUrl,
    portableDownloadUrl: urls.portableDownloadUrl,
    isPortable
  };
}

function safeRepoUrl(url) {
  try {
    const href = new URL(String(url || '')).href;
    return href.startsWith(REPO_URL_PREFIX) ? href : null;
  } catch (e) {
    return null;
  }
}

function openRepoUrl(url) {
  const safe = safeRepoUrl(url) || RELEASES_HTML_URL;
  shell.openExternal(safe);
  return safe;
}

let activeInstall = null;

/**
 * Запускает установку обновления:
 * - В Portable (и в незапакованной dev-сборке) открывает в браузере ссылку на скачивание нового .exe.
 * - В NSIS-установщике скачивает и устанавливает обновление через electron-updater;
 *   если это невозможно, открывает страницу релиза и возвращает mode: 'browser-fallback'.
 * Повторный вызов во время работы возвращает тот же Promise, обработчики событий не накапливаются.
 */
function downloadAndInstallUpdate(updateInfo, callbacks = {}) {
  if (!activeInstall) {
    activeInstall = runInstall(updateInfo, callbacks).finally(() => {
      activeInstall = null;
    });
  }
  return activeInstall;
}

function runInstall(updateInfo, callbacks) {
  const { onProgress, onDownloaded, onError } = callbacks;

  if (isPortableBuild()) {
    const url = openRepoUrl(updateInfo && updateInfo.portableDownloadUrl);
    return Promise.resolve({ mode: 'browser', url });
  }

  if (!app.isPackaged) {
    const url = openRepoUrl(updateInfo && updateInfo.setupDownloadUrl);
    return Promise.resolve({ mode: 'browser', url });
  }

  const releaseUrl = (updateInfo && updateInfo.releaseUrl) || RELEASES_HTML_URL;

  return new Promise((resolve) => {
    let autoUpdater;
    try {
      ({ autoUpdater } = require('electron-updater'));
    } catch (e) {
      const url = openRepoUrl(releaseUrl);
      return resolve({ mode: 'browser-fallback', reason: 'error', error: e && e.message ? e.message : 'electron-updater unavailable', url });
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    let settled = false;

    const cleanup = () => {
      autoUpdater.removeListener('download-progress', handleProgress);
      autoUpdater.removeListener('update-downloaded', handleDownloaded);
      autoUpdater.removeListener('update-not-available', handleNotAvailable);
      autoUpdater.removeListener('error', handleError);
    };

    const fail = (reason, message) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (onError) onError(message);
      const url = openRepoUrl(releaseUrl);
      resolve({ mode: 'browser-fallback', reason, error: message, url });
    };

    const handleProgress = (prog) => {
      if (onProgress) onProgress({ percent: Math.round(prog.percent || 0) });
    };

    const handleDownloaded = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (onDownloaded) onDownloaded();
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
      resolve({ mode: 'updater' });
    };

    const handleNotAvailable = () => fail('not-available', 'No installable update found');

    const handleError = (err) => fail('error', err && err.message ? err.message : 'Updater error');

    autoUpdater.on('download-progress', handleProgress);
    autoUpdater.on('update-downloaded', handleDownloaded);
    autoUpdater.on('update-not-available', handleNotAvailable);
    autoUpdater.on('error', handleError);

    autoUpdater.checkForUpdates().then((result) => {
      if (!result) fail('error', 'Updater is not active');
    }, handleError);
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
