# IPC и протокол OBS Widget

Документ фиксирует текущие контракты между Electron-процессами и локальным OBS Widget. Это описание существующей реализации, а не публичная гарантия совместимости для внешних клиентов. При изменении каналов или форматов обновляйте этот документ вместе с кодом.

## 1. Участники и границы ответственности

| Участник | Ответственность |
|---|---|
| Main Process (`main.js`) | Единственный координатор: конфигурация, Twitch, окна, локальный сервер, tray, updater и IPC handlers |
| Preload (`preload.js`) | Узкий API через `contextBridge`; renderer не получает прямой доступ к Node.js/Electron IPC |
| Settings Renderer (`settings.html`, `settings/settings.js`) | UI, локальное состояние форм, предпросмотр и сохранение |
| Desktop Renderer (`index.html`) | Отображение Overlay через общий `chat-view.js` |
| Widget Renderer (`widget.html`) | Отображение OBS через общий `chat-view.js`, получает данные по HTTP/SSE |
| `widget-server.js` | Loopback HTTP, статические ресурсы, JSON состояния и SSE-клиенты |

Оба Electron окна используют `preload.js` с `contextIsolation: true`. Методы доступны через `window.api`. Не добавляйте renderer прямой доступ к `ipcRenderer`, файловой системе или Node.js.

## 2. Контракт preload API

Ниже перечислены методы, фактически экспортируемые `preload.js`. Суффикс указывает транспорт: **invoke** — запрос с результатом, **send** — односторонняя команда, **on** — подписка на событие главного процесса.

| API renderer | Транспорт / IPC | Назначение |
|---|---|---|
| `loadConfig()` | invoke `load-config` | Загрузить конфигурацию и метаданные запуска |
| `testProxy(proxy)` | invoke `test-proxy` | Проверить SOCKS5-прокси |
| `saveConfig(cfg)` | invoke `save-config` | Нормализовать и сохранить настройки |
| `getOverlayState()` | invoke `get-overlay-state` | Получить конфигурацию Overlay, строки и язык |
| `previewOverlay(view)` | send `preview-overlay` | Временное обновление Overlay |
| `previewWidget(view)` | send `preview-widget` | Временное обновление Widget |
| `checkForUpdates(opts)` | invoke `check-for-updates` | Проверить обновления |
| `installUpdate(info)` | invoke `install-update` | Скачать и установить обновление |
| `skipUpdateVersion(ver)` | invoke `skip-update-version` | Запомнить пропущенную версию |
| `getStrings(lang)` | invoke `get-strings` | Получить локализацию |
| `setLanguage(lang)` | invoke `set-language` | Сменить язык приложения |
| `openSettings()` | send `open-settings-window` | Открыть настройки |
| `enableClickThrough()` | send `enable-click-through` | Включить сквозной режим Overlay |
| `getOverlayVisible()` | invoke `get-overlay-visible` | Получить видимость Overlay |
| `toggleOverlayVisibility()` | invoke `toggle-overlay-visibility` | Переключить видимость Overlay |
| `openSupportLink()` | invoke `open-support-link` | Открыть ссылку поддержки |
| `sendTestMessage(channel)` | send `send-test-message` | Тестовые сообщения в Overlay |
| `sendWidgetTest(channel)` | send `send-widget-test` | Тестовые сообщения в Widget |
| `getWidgetStatus()` | invoke `get-widget-status` | Получить состояние локального сервера |
| `copyText(text)` | invoke `copy-text` | Скопировать ограниченный текст |
| `saveCardImage(buffer, name)` | invoke `save-card-image` | Сохранить WebP изображения плашки |
| `listCardImages()` | invoke `list-card-images` | Получить список изображений |
| `renameCardImage(id, name)` | invoke `rename-card-image` | Переименовать изображение |
| `deleteCardImage(id)` | invoke `delete-card-image` | Удалить изображение |
| `getConfigDirInfo()` | invoke `get-config-dir-info` | Получить путь userData |
| `openConfigDir()` | invoke `open-config-dir` | Открыть userData |

Подписки `window.api.on...`:

| Подписка | IPC event | Данные / назначение |
|---|---|---|
| `onNewMessage(cb)` | `new-message` | Новое сообщение для Overlay |
| `onMessageRemoved(cb)` | `message-removed` | Удаление сообщения |
| `onStatusUpdate(cb)` | `status-update` | Состояние подключения/ошибка Twitch |
| `onModeChanged(cb)` | `mode-changed` | Изменение click-through |
| `onHotkeyStatus(cb)` | `hotkey-status` | Результат регистрации горячей клавиши |
| `onConfigApplied(cb)` | `config-applied` | Новое представление оформления Overlay |
| `onStringsUpdated(cb)` | `strings-updated` | Обновлённые строки и язык |
| `onWidgetStatus(cb)` | `widget-status` | Состояние Widget-сервера |
| `onOverlayVisibility(cb)` | `overlay-visibility` | Видимость Overlay |
| `onUpdateAvailable(cb)` | `update-available` | Информация об обновлении |
| `onUpdateProgress(cb)` | `update-progress` | Прогресс установки |

## 3. Правила IPC

- `ipcRenderer.invoke()` соответствует `ipcMain.handle()`; возвращаемое значение — часть контракта.
- `ipcRenderer.send()` соответствует `ipcMain.on()`; отправитель не получает результата выполнения.
- События из Main в renderer отправляются через `webContents.send()`; preload преобразует их в callback без передачи объекта Electron event.
- Передача конфигурации должна проходить через `config.js` normalizers/views, а не обходить проверку.
- При добавлении/переименовании IPC-метода синхронно проверяйте `preload.js`, handler в `main.js`, все вызовы и подписки в renderer.
- Не передавайте в renderer секреты и внутренние объекты хранилища, если конкретному экрану нужен только подготовленный view.

## 4. Основной жизненный цикл и синхронизация

### Запуск

1. Electron получает single-instance lock.
2. После `app.whenReady()` выполняется миграция пользовательских изображений, регистрируются `emote://` и `card://`.
3. Создаются Overlay и tray.
4. Загружается нормализованная конфигурация, применяется автозапуск и запускается Widget-сервер, если он включён.
5. Запускается Twitch-подключение, если задан канал; иначе открывается окно настроек.

### Сообщения и модерация

`twitch.js` формирует сообщения и события удаления. `main.js` отправляет новое сообщение Overlay через `new-message` и одновременно Widget через SSE `chat`. Удаление передаётся как `message-removed` в Overlay и `remove` в SSE.

### Сохранение и preview

- Preview Overlay: `preview-overlay` → `sanitizePreview()` → `config-applied`.
- Preview Widget: `preview-widget` → `sanitizePreview()` → SSE `state`.
- Save: `save-config` → `normalizeConfig()` → `electron-store` → обновление Overlay → применение Widget settings → SSE `state`.
- При закрытии окна настроек без сохранения временный preview заменяется последним сохранённым состоянием.

## 5. Локальный HTTP API Widget

Сервер создаётся через `createWidgetServer()` и слушает только `127.0.0.1). По умолчанию порт — 8769; допустимый диапазон конфигурации — 1024–65535. Сервер принимает только GET и HEAD. Запросы с Host, отличным от `127.0.0.1:<port>` или `localhost:<port>`, получают 403.

| Метод | Путь | Успешный ответ | Назначение |
|---|---|---|---|
| GET/HEAD | `/` | HTML | `widget.html` |
| GET/HEAD | `/chat.css` | CSS | Общие стили чата |
| GET/HEAD | `/chat-view.js` | JavaScript | Общий движок сообщений |
| GET/HEAD | `/fonts.css` | CSS | Подключение локальных шрифтов |
| GET/HEAD | `/api/state` | JSON | Текущее состояние Widget |
| GET | `/events` | SSE | Поток событий |
| GET/HEAD | `/fonts/<file>.woff2` | WOFF2 | Разрешённые локальные шрифты |
| GET/HEAD | `/card/<id>` | WebP | Пользовательская картинка плашки |
| GET/HEAD | `/img/<host>/<path>` | image/* | Проксирование разрешённых изображений |

Для неизвестного пути возвращается 404. Для неподдерживаемого метода — 405 с `Allow: GET, HEAD`. Ошибка чтения статического файла возвращает 500; ошибка загрузки внешнего изображения — 502. Для недопустимого host изображения возвращается 403.

### Формат состояния

`GET /api/state` возвращает JSON-объект:

```json
{
  "config": { "...": "widgetView" },
  "strings": { "...": "localized strings" },
  "language": "en"
}
```

Фактические значения конфигурации формируются `widgetState()` в `main.js` и `config.js::widgetView()`. В `config` входят оформление Widget, назначения стилей и ротация, общие фильтры; подсветка упоминаний выключена.

## 6. SSE-контракт

Клиент подключается к `GET /events`. Ответ имеет тип `text/event-stream`; сервер отправляет начальную директиву `retry: 2000`. Каждые 15 секунд отправляется heartbeat-комментарий `: ping`. Heartbeat не является событием приложения и не содержит JSON.

События приложения:

| Имя SSE | Данные | Значение |
|---|---|---|
| `chat` | объект сообщения | Добавить сообщение |
| `remove` | объект информации об удалении | Удалить соответствующее сообщение |
| `state` | объект состояния `{ config, strings, language }` | Обновить конфигурацию/локализацию Widget |

Формат сообщения и удаления должен совпадать с объектами, которые использует общий `chat-view.js`; при изменении этих структур проверяйте одновременно IRC-путь, тестовую последовательность, Overlay IPC и Widget SSE.

При открытии SSE-соединения сервер регистрирует клиента и обновляет статус Widget. При закрытии запроса удаляет клиента. При остановке сервера все SSE-ответы закрываются. Повторное подключение регулируется клиентом через стандартный SSE retry.

### Локальные URL в данных

Перед отправкой состояния и событий сервер заменяет:
- `emote://host/path` на `/img/host/path`;
- `card://img/id` на `/card/id`.

Маршрут `/img/` разрешает только хосты из allowlist `emotes.ALLOWED_IMAGE_HOSTS` и получает изображение через `emotes.fetchImage()`, поэтому действует настроенный сетевой/proxy-механизм приложения. Не превращайте этот endpoint в произвольный URL-прокси.

## 7. Безопасность и эксплуатационные ограничения

- Сервер слушает loopback, не предназначен для доступа из локальной сети или интернета.
- Host проверяется на точное совпадение с текущим localhost/127.0.0.1 и портом; это защита от DNS rebinding.
- Внешние image host проверяются по allowlist.
- Для путей шрифтов используется basename и ограниченный набор символов; разрешены только WOFF2.
- Пользовательские изображения выбираются по проверенному идентификатору и отдаются из `userData/card-images`.
- Для ответов добавляется `X-Content-Type-Options: nosniff`.
- Не добавляйте CORS, произвольные методы, внешний bind address или произвольную загрузку URL без отдельного анализа угроз.

## 8. Изменения протокола: что проверять

1. Сверить preload API, main handler/sender и все renderer-вызовы.
2. Проверить тип события и форму payload на обеих сторонах.
3. Проверить начальную загрузку `/api/state` и последующие SSE `state`.
4. Проверить `chat` и `remove` на реальных и тестовых сообщениях.
5. Проверить reconnect SSE, heartbeat, отключение/повторный запуск сервера и смену порта.
6. Проверить пути изображений `/img/` и `/card/`, включая proxy и allowlist.
7. Не считать изменение локального протокола совместимым автоматически: OBS Browser Source использует URL и события, которые уже обслуживаются приложением.

## 9. Основные точки кода

| Файл | Контракт |
|---|---|
| `preload.js` | Renderer API и подписки |
| `main.js` | IPC handlers/senders, lifecycle, конфигурация и маршрутизация событий |
| `config.js` | Нормализация конфигурации и renderer views |
| `widget-server.js` | HTTP endpoints, SSE, lifecycle и переписывание URL |
| `widget.html` | Клиент Widget: загрузка состояния и SSE |
| `index.html` | Desktop renderer и IPC-подписки |
| `chat-view.js` | Общая обработка сообщений в обоих представлениях |
| `emotes.js` | Allowlist, сетевые изображения и proxy |
