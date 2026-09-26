# FairyChat

Ek Telegram-jaisa **real-time messaging app**, lekin:

- **Backend poori tarah aapke control me** — Node.js + Express + Socket.IO + SQLite, koi third-party messaging service use nahi hoti.
- **Unique visual design** — apna khud ka color palette aur branding, Telegram ke blue/white look se bilkul alag.
- **Same core functionality** jo real messaging apps me hoti hai (niche list dekhein).
- **Installable PWA** — mobile/desktop par "Add to Home Screen" karke app jaisa experience milta hai, offline shell caching ke saath.

---

## ✨ Features (is version me)

- Username + password signup & login (JWT auth). Phone number is an optional
  profile field only — there is **no real SMS/OTP verification** in this version,
  so it behaves like a normal app login rather than Telegram's phone-verified login.
  (Adding real phone OTP later requires a paid SMS provider like Twilio/MSG91.)
- 1:1 direct chats, **group chats** (admin role) and **channels** (broadcast —
  only the owner/admins can post, everyone else is a read-only subscriber)
- **Saved Messages** — a private self-chat, auto-created per user and pinned
  to the top of the chat list, exactly like Telegram's "Saved Messages"
- **Real-time messaging** via WebSockets (Socket.IO) — turant deliver hota hai
- Typing indicators ("... type kar rahe hain")
- Online / offline presence + "last seen"
- Single tick (✓ sent) / double gold tick (✓✓ read) — read receipts
- Media sharing: images, videos, audio, files (upload + preview)
- **GIF picker** in the composer (🎞️ button) — needs a free `GIF_API_KEY`,
  see [GIFs setup](#-optional-enabling-gifs) below
- **Contact sync** (mobile app only) — reads the phone's contact list and
  shows which contacts already use FairyChat, so you can start chatting
  in one tap without typing a username
- Message edit & delete (for sender)
- Reply-to-message (quoted preview)
- Unread message counters, chat list sorted by latest activity
- User search (by username / name / phone) to start new chats
- Editable profile (name, bio, avatar color)
- Fully responsive — mobile par WhatsApp/Telegram jaisa single-column view
- PWA: installable, custom app icon, offline caching of app shell & media

> Scope note: voice/video calls, stickers, bots, secret chats aur channel invite-links is version me shamil nahi hain.

---

## 🏗️ Architecture

```
telegram-clone/
├── backend/                 Node.js + Express + Socket.IO + SQLite (better-sqlite3)
│   ├── server.js            Entry point (REST API + WebSocket server)
│   ├── db.js                SQLite schema & connection
│   ├── routes/               auth, users, chats, upload REST endpoints
│   ├── services/             shared message logic (used by REST + sockets)
│   ├── socket/                real-time event handlers (typing, presence, messages)
│   ├── middleware/            JWT auth middleware
│   └── uploads/                uploaded media files (gitignored)
│
└── frontend/                 React 19 + Vite PWA
    ├── src/context/           AuthContext, ChatContext (global state + socket wiring)
    ├── src/pages/             Login, Register, ChatApp
    ├── src/components/        sidebar/ (chat list, new chat/group modal, profile)
    │                          chat/ (chat window, bubbles, input, header)
    ├── src/styles/            theme.css (purple/gold palette), auth.css, app.css
    └── vite.config.js         Dev proxy to backend + PWA manifest/service worker config
```

**Data flow:** Frontend REST calls go through Vite's dev proxy (`/api`, `/uploads`) to the backend. Real-time events (new message, typing, read receipts, presence) flow over a single Socket.IO connection authenticated with the JWT issued at login/register.

---

## 🚀 Local Development

### 1. Backend

```bash
cd telegram-clone/backend
npm install
cp .env.example .env      # already present; edit JWT_SECRET before production
npm run dev                # starts on http://localhost:8081
```

### 2. Frontend

```bash
cd telegram-clone/frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api & /socket.io to backend
```

Open `http://localhost:5173`, register two different accounts (in two browser windows/incognito) and start chatting.

### Production build

```bash
cd telegram-clone/frontend
npm run build                # outputs static PWA build to dist/
```

Serve `dist/` from any static host (Nginx, Vercel, Netlify, etc.) and point it at your deployed backend by setting `VITE_BACKEND_URL` at build time, or by configuring your production reverse-proxy to forward `/api`, `/uploads` and `/socket.io` to the backend service — the same way the Vite dev proxy does.

For the backend in production: run behind a process manager (pm2 / systemd), put it behind Nginx/Caddy with HTTPS, and swap `JWT_SECRET` for a long random value.

### 🎞️ Optional: enabling GIFs

The composer's 🎞️ button calls `GET /api/gifs/search` on the backend, which
proxies to a GIF provider. Without a key it responds with `configured: false`
and the UI shows a friendly "not set up yet" message instead of erroring.

To enable it, get a **free** API key (no credit card) from either:

- [Giphy](https://developers.giphy.com/dashboard/) — sign up, create an app,
  copy the "Beta" key. Generous free-tier rate limits.
- [Klipy](https://klipy.com) — a newer, fully free GIF/sticker API (built by
  ex-Tenor engineers, popular replacement now that Google has discontinued
  the Tenor API).

Then set these two environment variables on the backend (locally in
`telegram-clone/backend/.env`, or as Render dashboard env vars):

```
GIF_PROVIDER=giphy   # or "klipy"
GIF_API_KEY=your_key_here
```

No restart-proof caching or extra setup needed — the picker works the next
time the backend restarts with the key set.

> Note: Tenor's public GIF API was shut down by Google in mid-2026, and
> Giphy's old public "beta" demo key (`dc6zaTOxFJmzC`) has since been banned
> — both are why this app needs your own free key rather than a shared one.

### 📱 Optional: how contact sync works

The "📱 Contacts" tab in **New Chat** uses the `@capacitor/contacts` plugin to
read the phone's address book — this only works inside the installed
Android/iOS app (a website has no permission to read a phone's contacts), so
it's automatically hidden on the web build. Only phone numbers ever leave the
device; they're compared (last-10-digits match, so formatting differences
like `+91 98765 43210` vs `9876543210` don't matter) against registered users
on the backend via `POST /api/users/contacts/match`, and matches are shown so
you can start a chat in one tap. No contact names, photos or other details
are ever sent anywhere.

### Deploying the backend permanently (recommended: Render, free)

This repo ships a ready-to-use `render.yaml` blueprint at the repo root, so
deploying to [Render](https://render.com) is just a few clicks and gives you a
**permanent URL** that never changes (unlike temporary sandbox preview URLs):

1. Create a free Render account (GitHub login, no credit card needed).
2. Dashboard → **New +** → **Blueprint** → connect this GitHub repository.
3. Render detects `render.yaml` automatically and shows one service,
   `monarch-chat-backend` → click **Apply**.
4. Wait for the build to finish (~1-2 minutes). You'll get a URL like
   `https://monarch-chat-backend.onrender.com` — this is permanent.
5. Send that URL back so the frontend build / Android APK can be pointed at it
   (update `BACKEND_URL` in `.github/workflows/build-android-apk.yml`, or set
   `VITE_API_BASE_URL` when self-building).

**⚠️ Free-tier data persistence caveat:** Render's free web services don't
include a persistent disk — the SQLite database file can be wiped whenever the
free instance restarts (e.g. after ~15 minutes of inactivity it "sleeps" and
respins). This is fine for testing/demo use. For production data that must
never be lost, either upgrade to a Render paid instance with a persistent
disk, or migrate storage from SQLite to Render's managed Postgres (ask for
help with this migration when you're ready to go fully production).

---

## 🎨 Design system

| Token | Color | Usage |
|---|---|---|
| `--bg-app` | `#120a26` | App background |
| `--bg-sidebar` / `--bg-panel` | `#19103a` / `#201347` | Sidebar & headers |
| `--bubble-out-from → --bubble-out-to` | `#6d3fc7 → #9457d6` | Outgoing message bubbles (violet gradient) |
| `--bubble-in` | `#241a4d` | Incoming message bubbles |
| `--gold` / `--gold-light` | `#d9b64c` / `#f0d888` | Accents, unread badges, buttons, read-ticks |
| `--online` | `#4fd1a5` | Online presence dot |

This "Royal Violet + Gold" palette keeps the entire experience visually distinct from Telegram's blue/white theme while preserving a familiar two-pane messenger layout.

---

## 📱 Real Android APK (not just PWA)

The `frontend/android` folder is a full Capacitor Android project wrapping the same
React app — this produces a genuine, installable `.apk`, not just a home-screen PWA
shortcut. **No Flutter/rewrite needed** — it's the same codebase, just packaged as a
native Android shell (Capacitor's WebView) instead of running inside a mobile browser.

### Is it free?

Yes, entirely:
- JDK, Android SDK, Gradle, Capacitor — all free/open source.
- Installing the APK on your own phone ("sideloading") — free, no store needed.
- The only *optional* cost is a one-time **$25 Google Play Developer fee**, and only
  if you want to publish it on the Play Store. You never have to do that.

### How the APK gets built

This sandbox itself has no Android SDK/JDK and restricted network access, so the APK
is built by **GitHub Actions** (free, GitHub's own infrastructure — their standard
Ubuntu runners ship with the Android SDK + JDK preinstalled):

1. Workflow: `.github/workflows/build-android-apk.yml`
2. It builds the React app with `VITE_API_BASE_URL` pointing at your backend, runs
   `npx cap sync android`, then `./gradlew assembleDebug`.
3. The resulting `app-debug.apk` is uploaded as a workflow artifact — download it from
   the **Actions** tab of the GitHub repo (or it's fetched into the workspace for you).
4. Install on an Android phone: transfer the `.apk` file to the phone and open it
   (you'll need to allow "Install unknown apps" for whichever app you used to open it —
   this is normal for any app installed outside the Play Store).

### ⚠️ About the backend URL baked into the APK

`BACKEND_URL` in the workflow currently points at **this sandbox session's temporary
preview URL**. That works for testing right now, but sandbox URLs are not permanent —
once this session ends, the app in the APK won't be able to reach the backend anymore.

For a phone app that works long-term, deploy `telegram-clone/backend` to a real host
with a stable URL (a small VPS, Railway, Render, Fly.io, etc. — several have free
tiers), then update `BACKEND_URL` in the workflow (or re-run it with a different value
via "Run workflow" → input) and re-download the APK.

### Rebuilding locally (optional, needs Android Studio)

```bash
cd telegram-clone/frontend
npm install
VITE_API_BASE_URL=https://your-backend-host npm run build
npx cap sync android
npx cap open android      # opens Android Studio, or run ./gradlew assembleDebug directly
```

---

## 🔐 Security notes before going live

- Change `JWT_SECRET` in `backend/.env` to a strong random value.
- Put the backend behind HTTPS (WSS for sockets) — required for PWA install & camera/mic features if added later.
- Consider rate-limiting `/api/auth/*` and `/api/upload` in production.
- SQLite file (`backend/data/monarch_chat.sqlite`) holds all users/messages — back it up, or swap `db.js` for Postgres/MySQL if you need multi-instance scaling.
