<p align="center">
  <b>English</b> | <a href="README.ru.md">Русский</a>
</p>

# Twitch Transparent Chat Overlay

A minimalist, lightweight and fully transparent Twitch chat overlay that sits on top of any window or game. No login needed: it connects to chat anonymously and barely touches your system resources while you stream. The same chat can also be shown on stream as an OBS widget.

<p align="center">
  <img src="screenshots/preview_chat.jpg" alt="Chat overlay on top of a game" width="700">
</p>

> **Game display mode.** For the overlay to appear over a game, set the game to **Borderless Windowed** (or Borderless Fullscreen). In classic **Exclusive Fullscreen** the GPU bypasses the Windows compositor, so no regular window can be drawn on top.

---

## Features

**Overlay**
* Fully transparent window above borderless games. **`Ctrl+Alt+F9`** switches click-through mode: the mouse passes through the chat into the game. **`Ctrl+Alt+F11`** hides or shows the overlay.
* No taskbar button and no Alt+Tab entry, so Win+D can't hide it. Controlled from the tray icon or the **Click-through** button in the window header.
* One copy at a time, and a "lost window" rescue if the saved position is off every screen.
* The settings window stays on top of other windows, so it never gets lost behind a borderless game.
* A thin purple frame marks the window edges while click-through is off, so it is easy to place and resize. It disappears in click-through mode.

**Chat**
* Official Twitch badges and emotes, plus **7TV, BetterTTV and FrankerFaceZ** emotes (animated and zero-width included).
* Highlights for mentions, replies and channel point rewards. Optional one-line events: subscriptions, gifts and raids. Rewards and events keep their own fixed look (system font, a warm reward plate, a compact purple event line), so styles, saved styles and rotation never change them. Only the font size and the text alignment are shared.
* Moderation sync: deleted messages, bans, timeouts and `/clear` disappear from the overlay at once.
* Filters for `!commands`, bots and chosen users. `/me` actions are handled properly.
* Reliable connection with automatic reconnects and optional **SOCKS5** proxy (chat, emotes and update checks). Late events from an old connection can no longer leak into a new one when you switch channels or proxy quickly.

**Look**
* **Message plate**: solid or gradient background in 7 directions, rounded or square shape, borders with animated effects (neon, pulse, RGB shift, running contour, breathing).
* **Card image**: a picture layer on the plate. Choose a built-in sticker or upload your own (PNG, JPEG or WebP, up to 8 MB; pictures larger than 1920 px are reduced automatically). Uploaded pictures are stored as `card-images/<name>.webp` under the name you give them. Before a picture is deleted you see where it is used (styles and users), and it is removed everywhere only after you confirm.
* **Appear animations** with a preview, smooth shifting of older messages and an optional **solid ribbon** mode where plates fade only at the very edge.
* **Text and nicknames**: colors, outlines, size, alignment (one setting for every message type) and 13 fonts (bundled in `fonts/`, no internet needed).
* **Styles & presets**: 9 built-in themes and your own saved styles, shared between the overlay and the OBS widget. Each saved style has an **Overwrite** button that stores the current look of the tab under the same name (with a confirmation) and a **padlock** that keeps it out of rotation and out of the “All my saved styles” count. A locked style can still be applied and assigned to users. Deleting a style that is assigned to users warns you who keeps a copy.
* **Styles for users**: give chosen Twitch users their own plate style (built-in or saved). Set separately for the overlay and the widget; it has priority over rotation. Replacing or deleting a user asks for confirmation. If a style is deleted, its users keep a copy together with its picture, and the list offers **Save as style** to bring the copy back.
* **Style rotation**: messages take turns using your saved styles. The **Rotation** button shows a status dot (green when rotation is on). With 2 saved styles they alternate automatically; with 3 or more you choose **All my saved styles** (new styles join automatically) or **Choose manually** (3 to 5 styles with a pinned live preview), in turn or in random order (never the same style twice in a row). Locked styles don't take part. If fewer than 2 unlocked styles remain, rotation turns off and tells you why. Channel point rewards are never restyled. Mentions and replies are restyled in the widget always, and in the overlay only when **Highlight mentions and replies** is off.
* A live preview in every settings dialog (including the preview under **Play animation**, which always shows the current style, border and layout), and **Reset to defaults** buttons. Resetting a whole tab asks for confirmation first.

**Convenience**
* Settings in a separate dark-styled window: **General**, **Overlay**, **OBS widget**. Options are grouped into clear sections (on the General tab: Connection, Filtering, Startup, Application), and an **EN | RU** language switch sits in the tab bar.
* **Save** with a status line in the footer: **● Unsaved changes** or **✓ All changes saved**. A wrong widget port is caught before saving, and the cursor goes to that field.
* **Test connection** button under the SOCKS5 fields checks the proxy before you save.
* Pop-up notifications inside the settings window (picture processing, uploaded, renamed, deleted) instead of system alert boxes.
* Keyboard-friendly dialogs: Tab stays inside an open dialog, and focus returns to the button that opened it. Tooltips also appear when an option gets keyboard focus.
* Test buttons play every message type without connecting to a chat.
* Built-in update checker with release notes in your language. The current version is shown on the General tab next to the **Check for updates** button. It runs once at every launch (and on the button), never in the background while you play. If the GitHub API is rate-limited, the version is taken from the release file instead. Setup updates in one click, Portable opens the download page.
* **Spacing between plates** slider under the nickname layout setting.
* **Hide overlay / Show overlay** button on the Overlay tab, in sync with the tray menu and the **`Ctrl+Alt+F11`** hotkey.
* A small decorative mascot picture fills the free space on the Overlay and OBS widget tabs. It sits under the controls and doesn't catch clicks.
* Start with Windows, tray menu, English and Русский interface (switch **EN | RU** in the settings).
* A discreet **Support the author** link at the bottom of the General tab.

---

## Controls

| Element | Action |
| :--- | :--- |
| **`Ctrl+Alt+F9`** | Toggle click-through mode |
| **`Ctrl+Alt+F10`** | Open settings |
| **`Ctrl+Alt+F11`** | Hide or show the overlay |
| **Click-through button** | In the window header, left of Settings |
| **⚙ Settings** | Opens General, Overlay and OBS widget tabs |
| **Bottom-right corner** | Resize handle (settings mode) |
| **Tray icon** | Show/hide overlay, click-through, settings, quit |
| **Hide overlay button** | Overlay tab, above Reset. Works like the tray item and stays in sync with it |

> If `Ctrl+Alt+F9` is taken by another program, a yellow ⚠ appears next to the connection indicator.

---

## OBS widget

The chat can also appear **only on stream** as a Browser source, with its own size and look. It is off by default.

1. Open **Settings → OBS widget**, tick **Enable OBS widget** (the port, link and widget look appear below the switch) and press **Save**. Change the port if `8769` is busy.
2. Press **Copy link**.
3. In OBS add a **Browser** source, paste the link as the URL and set the size you need.
4. Press **Test messages (widget only)** to check it. It never sends anything to the overlay.

The widget shares the channel, proxy, filters and saved styles with the overlay. In the widget, mentions and replies are shown as regular text.

> **After updating the app, press Refresh Cache** in the OBS Browser source properties (or restart OBS), so the widget picks up the new files.

---

## Good to know

* **Mentions follow the channel name.** The channel you enter is also the name searched in `@mentions` and replies, so highlights make sense when you watch your own chat.
* **Channel field** accepts `name`, `#name`, `@name` or a channel link.
* **Save reconnects only when needed.** The chat connection restarts when the channel or the proxy settings change. Styles, filters and widget options apply at once without dropping the connection.
* **Events come from the regular chat connection.** Rewards without text, follows and AutoMod-held messages aren't available without logging in.
* **The settings window has a fixed width**, so long texts in both languages fit without a horizontal scrollbar.
* **The widget works only while the app is running** and only on this computer (`127.0.0.1`).
* **Settings folder.** The General tab shows it and opens it in one click.

Settings are stored in `%APPDATA%\TwitchOverlay\config.json` (Windows), `~/.config/TwitchOverlay/config.json` (Linux) or `~/Library/Application Support/TwitchOverlay/config.json` (macOS). When running from source the folder is named `twitch-overlay`.

---

## Running from source

```bash
git clone https://github.com/BuXaLo/TwitchTransparentChat.git
cd TwitchTransparentChat
npm install
npm start
```

## Building the installer and portable .exe

```bash
npm run dist
```

*(or `npm run dist:nsis` / `npm run dist:portable` for a single target)*

The files appear in `dist/`, named after the version in `package.json`:

```text
dist/TwitchOverlay-Setup-x.x.x.exe
dist/TwitchOverlay-Portable-x.x.x.exe
```

> Without a paid code-signing certificate, Windows SmartScreen may warn on first launch: click **More info → Run anyway**. The **Setup** version is recommended: it adds shortcuts and updates itself in one click.

---

## Tech stack

Electron, Node.js, `electron-store`, `electron-builder` (NSIS and Portable), `electron-updater`, `socks`. Twitch IRC over TLS, 7TV / BTTV / FFZ APIs and a local HTTP server with SSE for the OBS widget.

## License

[MIT](LICENSE)
