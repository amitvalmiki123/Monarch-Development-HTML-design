# FairyChat — Telegram-source build (Stage 1)

This directory contains the build pipeline for the **Telegram-source-based
FairyChat** client (the direction discussed in the shared ChatGPT plan):
the real Telegram Android app, rebranded as FairyChat and built by our CI.

## What this is (and isn't) right now

**Stage 1 (this):** a CI pipeline that
1. clones the official [Telegram-Android](https://github.com/DrKLO/Telegram)
   source at build time (never vendored into this repo — it's ~750MB),
2. applies `apply-branding.sh`:
   - applicationId → `com.fairychat.app` (debug build becomes
     `com.fairychat.app.beta`, so it installs next to the real Telegram app)
   - app name → **FairyChat** (every locale)
   - launcher icons → our FairyChat icons
   - `BuildVars.APP_ID`/`APP_HASH` → your credentials from secrets
3. builds `assembleAfatDebug` on GitHub's free runners and publishes the
   APK to `mobile-builds/fairychat-telegram-debug.apk` (plus a workflow
   artifact).

**What the resulting APK does:** it is the *real Telegram client*. Users
log in with their Telegram accounts (phone + SMS code) and chat on the
Telegram network — messages, groups, channels, stickers, calls, everything
Telegram supports, visible to and from normal Telegram users.

**What it does NOT do yet:**
- it is **not** connected to the FairyChat Node backend at all;
- FairyChat Premium / themes / profile customisation from the React app are
  **not** integrated yet (later stage: custom layer inside this client);
- push notifications still use Telegram's own bundled Firebase config
  (swap `TMessagesProj_App/google-services.json` for your own Firebase
  project later);
- the alternate in-app "change app icon" presets still look Telegram-ish.

## Required setup (one time)

Add two GitHub repository **secrets** (Settings → Secrets and variables →
Actions), from [my.telegram.org](https://my.telegram.org) → API development
tools:

| Secret        | Value                              |
|---------------|------------------------------------|
| `TG_APP_ID`   | your numeric `api_id`              |
| `TG_APP_HASH` | your `api_hash`                    |

Without them the APK still **compiles** (using Telegram's public sample
values), but **login will not work** — so set them before installing on a
phone. Never commit the hash to the repo.

> The workflow has a hard gate: if no usable api_id/api_hash secret is
> found, the build **fails at the "Verify API credentials" step** instead
> of publishing a sample-credentials APK. If that happens, re-check the
> secrets page (the **Secrets** tab, not Variables; repository scope, not
> an Environment) and push any change under `telegram-fork/` to rebuild.

## Triggering a build

- Push any change under `telegram-fork/` (or this workflow) → automatic.
- Or run manually: Actions → **Build FairyChat Telegram APK** → Run
  workflow.
- First build takes roughly 30–90 minutes (native C/C++ compilation);
  later builds reuse the Gradle cache.

## Licence note

Telegram-Android is **GPL-2.0**. Builds from it must keep the source
available — this repo is public, and the pipeline clones the full
GPL source at build time, which satisfies that for our builds. If you ever
close-source anything, revisit this.

## Roadmap

- **Stage 1 — this:** rebranded debug APK building in CI. ✅
- **Stage 2:** own Firebase config, release signing, alternate icon set,
  "FairyChat" about-screen branding, version naming.
- **Stage 3:** FairyChat custom layer — port the React app's premium
  features (animated emoji pack, stickers, profile colour) into this
  client as Telegram-message-compatible custom entities (only rendered
  by FairyChat, degrade gracefully on other clients).
- **Stage 4:** FairyChat Premium entitlement inside this client, wired to
  the existing FairyChat backend (codes/subscriptions).
