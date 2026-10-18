<p align="center">
  <b>English</b> | <a href="README.ru.md">Русский</a>
</p>

# Twitch Transparent Chat Overlay

A minimalist, lightweight and fully transparent Twitch chat overlay that sits on top of any window or game. No OAuth login needed: it connects over IRC/TLS as an anonymous `justinfan` user and barely touches your system resources while you stream.

<p align="center">
  <img src="preview.jpg" alt="Chat overlay on top of a game" width="700">
</p>

## ⚠️ Important: game display mode

For the overlay to appear on top of a game, set the game to **Borderless Windowed** (or Borderless Fullscreen) in its graphics settings.

In classic **Exclusive Fullscreen** the GPU takes over the game output and bypasses the Windows compositor (DWM), so no regular transparent window can be drawn on top of it.

---

## Features

* **Full transparency and click-through mode**: the window stays on the `screen-saver` level above borderless windows. Press `Ctrl+Alt+F9` to enable click-through: the overlay stops catching the mouse, hides its title bar and doesn't get in the way of gameplay.
* **Readable in any scene**: a multi-direction text outline (`text-shadow`) keeps text crisp and contrasty even on bright game scenes.
* **Native emotes and badges**: official Twitch badges (Broadcaster, Mod, VIP, Sub, etc.) and emotes, positioned by Unicode code points so emojis never shift them.
* **7TV, BetterTTV and FrankerFaceZ emotes**: global and channel emotes (the channel ID comes from the `room-id` tag), animated and zero-width (overlay) emotes included. With SOCKS5 enabled, emotes and their images are loaded through the proxy; otherwise they load directly.
* **Mention and reply highlight**: messages that mention `@your_channel` and replies to your messages get a blue background, a blue side line, a short flash and a highlighted `@name`. Your nickname is taken from the channel you entered, so there is nothing extra to configure. Optionally, mentions can stay on screen twice as long.
* **Channel point reward highlight**: rewards with text input (`custom-reward-id`) get a thin golden side line and a points icon. A reward that also mentions you keeps the golden line and gets the blue background.
* **Moderation sync**: when a moderator deletes a message, or bans / times out a user, their messages disappear from the overlay at once. A cleared chat (`/clear`) clears the overlay too. This works out of the box, no setting required.
* **Optional chat event lines**: compact one-line notices for new subscriptions, resubscriptions, gifted subscriptions and raids. Each event type has its own checkbox and all of them are **off by default**. A mass gift is shown as a single line instead of one line per recipient.
* **Test messages button**: one click closes the settings and plays every scenario in a row (regular, moderator, reward, `/me`, mention, reply, reward + mention, long message, all event types, and a message that gets deleted by a "moderator") without connecting to a chat. Appearance settings apply instantly.
* **Tray icon**: show/hide the overlay, toggle click-through, open settings, hide from the taskbar, quit.
* **Two interface languages**: English (default) and Русский, switchable in settings without a restart.
* **Proper `/me` handling**: action messages (`\x01ACTION ...\x01`) are cleaned up, tinted with the author's color and never break emote positions.
* **Custom typography**: fonts (Inter, Montserrat, Roboto, Impact or system UI), font size, message background opacity and text alignment.
* **Memory-leak protection**: configurable message lifetime plus a hard cap of 150 messages in the DOM when the timer is off (`0 sec`), so long streams never drop FPS.
* **SOCKS5 support**: built-in client with username/password authentication for bypassing network blocks.
* **Chat filters**: hide commands (starting with `!`) and ignore bots and individual users with a configurable list (Nightbot, StreamElements, etc.). Entries are matched against the user's login as well as the display name, so non-Latin nicknames work too.
* **Reliable networking**: exponential backoff, a 60-second watchdog, handling of Twitch's scheduled `RECONNECT` and TLS/TCP timeouts. Connection status is shown by an indicator, never as messages in the chat.

---

## Controls

| Element | Action |
| :--- | :--- |
| **`Ctrl+Alt+F9`** | Toggle click-through game mode (mouse clicks pass through the chat into the game) |
| **Bottom-right corner** | Resize handle (visible in settings mode) |
| **"⚙ Settings" button** | Channel, language, proxy, font, animation, filters and chat events settings |
| **"Test messages" button** | Closes the settings and plays all message scenarios in the overlay |
| **Tray icon** | Left click: show/hide the overlay. Right click: click-through mode, settings, hide from taskbar, quit |

> If `Ctrl+Alt+F9` is already taken by another program, a yellow ⚠ appears next to the connection indicator.

---

## Good to know

* **Mentions follow the channel name.** The overlay assumes you watch your own chat, so the channel you enter is also the name it looks for in `@mentions` and replies. If you connect to someone else's channel, highlights are for that channel's owner.
* **Chat events come from the regular chat connection.** Subscriptions, gifts and raids are shown when Twitch sends them to the chat. Rewards without text and follows are not available without logging in, so they are not shown.
* **Messages held by AutoMod** are never delivered to an anonymous connection, so they never appear in the overlay in the first place.

---

## Where settings are stored

Settings, window position and size persist between launches via `electron-store`:

* **Windows**: `%APPDATA%\TwitchOverlay\config.json`  
  *(full path: `C:\Users\<UserName>\AppData\Roaming\TwitchOverlay\config.json`)*
* **Linux**: `~/.config/TwitchOverlay/config.json`
* **macOS**: `~/Library/Application Support/TwitchOverlay/config.json`

> When running from source with `npm start`, the folder is named `twitch-overlay` instead of `TwitchOverlay`.

---

## Tech stack

* **Runtime**: Electron
* **Platform**: Node.js
* **Networking**: `tls`, `net`, `https`, `socks` (SOCKS5), Twitch IRC v3 tags parser, 7TV / BTTV / FFZ APIs
* **Storage**: `electron-store`
* **Packaging**: `electron-builder` (Portable)

---

## Running from source

1. Clone the repository and open the project folder:
   ```bash
   git clone https://github.com/BuXaLo/TwitchTransparentChat.git
   cd TwitchTransparentChat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   npm start
   ```

---

## Building the portable .exe

To build a standalone executable that doesn't require Node.js:

1. Run the build command:
   ```bash
   npm run dist
   ```

2. The result appears in the `dist/` folder:
   ```text
   dist/TwitchOverlay 1.2.0.exe
   ```

> **Note**: Without a paid code-signing certificate, Windows SmartScreen may show a blue warning on first launch. Click **"More info"** → **"Run anyway"**.

---

## License

[MIT](LICENSE)
