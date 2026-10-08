#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Applies FairyChat branding to a freshly-cloned Telegram-Android source tree.
#
# Usage:
#   ./apply-branding.sh <telegram-source-root> <fairychat-icons-res-root>
#
# Environment:
#   TG_APP_ID   / TG_APP_HASH   — your Telegram API credentials from
#                                 my.telegram.org (injected as GitHub
#                                 secrets in CI). If unset, Telegram's
#                                 public sample values are left in place so
#                                 the build still compiles (login won't work
#                                 with the sample values, though).
#   FAIRY_APP_NAME / FAIRY_APP_PACKAGE — overrides, default
#                                 FairyChat / com.fairychat.app
#
# What this deliberately does NOT do (yet):
#   - rename the Java namespace (org.telegram.messenger stays — the standard
#     fork approach; only the applicationId changes, so the app installs as
#     its own package and can coexist with the real Telegram app)
#   - replace google-services.json (Telegram's own Firebase config ships in
#     the repo; push notifications won't be ours until you swap in your own
#     Firebase project's file)
#   - replace the alternate launcher icons (icon_2..icon_6 "app icon" presets)
# ---------------------------------------------------------------------------
set -euo pipefail

SRC="$1"
ICONS="$2"

APP_NAME="${FAIRY_APP_NAME:-FairyChat}"
APP_PACKAGE="${FAIRY_APP_PACKAGE:-com.fairychat.app}"
APP_ID="${TG_APP_ID:-4}"
APP_HASH="${TG_APP_HASH:-014b35b6184100b085b0d0572f9b5103}"

if [ ! -f "$SRC/gradle.properties" ] || [ ! -d "$SRC/TMessagesProj" ]; then
  echo "apply-branding.sh: '$SRC' does not look like the Telegram-Android source root" >&2
  exit 1
fi

echo "==> applicationId -> $APP_PACKAGE"
sed -i.bak "s/^APP_PACKAGE=.*/APP_PACKAGE=$APP_PACKAGE/" "$SRC/gradle.properties"

# The google-services plugin fails the build ("Package Name in
# google-services.json doesn't match...") when the applicationId changes,
# because Telegram's bundled config only lists their own package names.
# Rewrite the client package_name entries to ours. (The Firebase project
# behind it stays Telegram's for now — compiles and runs fine, just no
# working push until you swap in your own Firebase config: Stage 2.)
GS="$SRC/TMessagesProj_App/google-services.json"
if [ -f "$GS" ]; then
  echo "==> google-services.json package_name -> $APP_PACKAGE(.beta/.web)"
  sed -i.bak "s/\"package_name\": \"org\.telegram\.messenger\.beta\"/\"package_name\": \"$APP_PACKAGE.beta\"/g" "$GS"
  sed -i.bak "s/\"package_name\": \"org\.telegram\.messenger\.web\"/\"package_name\": \"$APP_PACKAGE.web\"/g" "$GS"
  sed -i.bak "s/\"package_name\": \"org\.telegram\.messenger\"/\"package_name\": \"$APP_PACKAGE\"/g" "$GS"
fi

echo "==> BuildVars: APP_ID/APP_HASH (from secrets, or sample fallback)"
BUILDVARS="$SRC/TMessagesProj/src/main/java/org/telegram/messenger/BuildVars.java"
sed -i.bak "s/public static int APP_ID = .*/public static int APP_ID = $APP_ID;/" "$BUILDVARS"
sed -i.bak "s|public static String APP_HASH = .*|public static String APP_HASH = \"$APP_HASH\";|" "$BUILDVARS"
if [ -n "${TG_APP_ID:-}" ] && [ "$TG_APP_ID" != "4" ] && [ -n "${TG_APP_HASH:-}" ] && [ "$TG_APP_HASH" != "014b35b6184100b085b0d0572f9b5103" ]; then
  echo "    using real API credentials from secrets (login will work)"
  echo "real" > "$SRC/.fairychat-creds-status"
else
  echo "::warning::TG_APP_ID secret not set — using Telegram's public sample values. The APK compiles and runs, but LOGIN WILL NOT WORK until TG_APP_ID / TG_APP_HASH secrets are configured in the repo."
  echo "    WARNING: TG_APP_ID secret not set — login will NOT work."
  echo "sample" > "$SRC/.fairychat-creds-status"
fi

# --- Cloud strings OFF (critical!): Telegram's server sends its own
# language pack that OVERRIDES our rebranded local strings — that's why
# "Telegram" still showed everywhere after the deep-brand pass. Also stop
# the "update Telegram" prompts our fork should never show.
echo "==> disable cloud langpack + official update prompts"
sed -i.bak "s/USE_CLOUD_STRINGS = true/USE_CLOUD_STRINGS = false/" "$BUILDVARS"
sed -i.bak "s/CHECK_UPDATES = true/CHECK_UPDATES = false/" "$BUILDVARS"

# --- Launcher adaptive-icon override (Android 8+): mipmap-anydpi-v26/
# ic_launcher.xml references Telegram's own foreground/background vectors
# and completely ignores the raster ic_launcher.png files we replace —
# deleting the XMLs makes Android fall back to OUR FairyChat rasters.
echo "==> remove adaptive-icon XMLs so our launcher rasters win"
rm -f "$SRC/TMessagesProj/src/main/res/mipmap-anydpi-v26/ic_launcher.xml" \
      "$SRC/TMessagesProj/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"

# --- In-app logo: the big logo on the intro screen (and the archived-
# stories placeholder) is the vector drawable telegram_logo — Telegram's
# plane wordmark. Swap it for our FairyChat crest under the same resource
# name, and square up the intro's 115x35dp wordmark bounds so our square
# crest isn't squashed.
LOGO_SRC="$(cd "$(dirname "$0")" && pwd)/branding/telegram_logo.png"
if [ -f "$LOGO_SRC" ]; then
  echo "==> in-app logo -> FairyChat crest"
  rm -f "$SRC/TMessagesProj/src/main/res/drawable/telegram_logo.xml" \
        "$SRC/TMessagesProj/src/main/res/drawable/telegram_logo_2.xml"
  mkdir -p "$SRC/TMessagesProj/src/main/res/drawable-nodpi"
  cp "$LOGO_SRC" "$SRC/TMessagesProj/src/main/res/drawable-nodpi/telegram_logo.png"
  cp "$LOGO_SRC" "$SRC/TMessagesProj/src/main/res/drawable-nodpi/telegram_logo_2.png"
# --- Intro screen: big logo was too large/clipped. Instead show the
# "FairyChat" wordmark as TEXT (the slide title), like our own app's
# branding. (Premium animated-icon next to the text = Stage 3.)
INTRO="$SRC/TMessagesProj/src/main/java/org/telegram/ui/IntroActivity.java"
if [ -f "$INTRO" ]; then
  echo "==> intro title -> FairyChat text wordmark"
  python3 - "$INTRO" << 'PYEOF' || echo "    ::warning::intro title patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '        SpannableStringBuilder ssb = new SpannableStringBuilder(LocaleController.getString(R.string.Page1Title));\n'
    '        ssb.setSpan(new ImageSpan(logoDrawable), 0, ssb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);\n'
    '        titles[0] = ssb;'
)
new = '        titles[0] = LocaleController.getString(R.string.AppName);'
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: intro slide 1 title is now the FairyChat text")
else:
    print("    ::warning::intro ImageSpan block not found — title left as-is")
PYEOF
else
  echo "    (IntroActivity.java not found — intro title left as-is)"
fi

# --- Service-notifications chat (Telegram's real service account 777000,
# the one that delivers login codes) shows its server-set name "Telegram"
# in the chat list, chat header and message senders. That name can't be
# changed server-side, so override the DISPLAY client-side in UserObject —
# every surface then reads "FairyChat".
UO_FILE="$SRC/TMessagesProj/src/main/java/org/telegram/messenger/UserObject.java"
if [ -f "$UO_FILE" ]; then
  echo "==> service chat (777000) display name -> FairyChat"
  python3 - "$UO_FILE" << 'PYEOF' || echo "    ::warning::777000 rename patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
checks = [
    ('    public static String getUserName(TLRPC.User user) {\n'
     '        if (user == null || isDeleted(user)) {\n'
     '            return LocaleController.getString(R.string.HiddenName);\n'
     '        }\n',
     '    public static String getUserName(TLRPC.User user) {\n'
     '        if (user == null || isDeleted(user)) {\n'
     '            return LocaleController.getString(R.string.HiddenName);\n'
     '        }\n'
     '        if (user.id == 777000) {\n'
     '            return "FairyChat";\n'
     '        }\n'),
    ('    public static String getFirstName(TLRPC.User user, boolean allowShort) {\n'
     '        if (user == null || isDeleted(user)) {\n'
     '            return "DELETED";\n'
     '        }\n',
     '    public static String getFirstName(TLRPC.User user, boolean allowShort) {\n'
     '        if (user == null || isDeleted(user)) {\n'
     '            return "DELETED";\n'
     '        }\n'
     '        if (user.id == 777000) {\n'
     '            return "FairyChat";\n'
     '        }\n'),
]
for old, new in checks:
    if old in s:
        s = s.replace(old, new, 1)
        print("    patched:", old.split('(')[0].split()[-1])
    else:
        print("    ::warning::pattern not found:", old.split('(')[0].split()[-1])
open(p, 'w', encoding='utf-8').write(s)
PYEOF
else
  echo "    ::warning::UserObject.java not found — service chat name not renamed"
fi

# --- Main screen title (chat list top-left, where official Telegram shows
# its wordmark): DialogsActivity built the title as an ImageSpan around
# R.drawable.telegram_logo_2 sized by INTRINSIC dimensions — with our
# 512px crest PNG that rendered huge and clipped. Replace with the plain
# "FairyChat" text title (the emoji-status drawable next to it stays —
# animated for premium users, exactly the branding pattern we want).
DLG="$SRC/TMessagesProj/src/main/java/org/telegram/ui/DialogsActivity.java"
if [ -f "$DLG" ]; then
  echo "==> main screen title -> FairyChat text (fix giant clipped logo)"
  python3 - "$DLG" << 'PYEOF' || echo "    ::warning::main title patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '                logoDrawable = context.getResources().getDrawable(R.drawable.telegram_logo_2).mutate();\n'
    '                logoDrawable.setBounds(0, dp(2), logoDrawable.getIntrinsicWidth(), dp(2) + logoDrawable.getIntrinsicHeight());\n'
    '                logoDrawable.setColorFilter(getThemedColor(Theme.key_telegram_color_dialogsLogo), PorterDuff.Mode.MULTIPLY);\n'
    '                SpannableStringBuilder ssb = new SpannableStringBuilder(getString(R.string.AppName));\n'
    '                ssb.setSpan(new ImageSpan(logoDrawable), 0, ssb.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);\n'
    '                actionBar.setTitle(ssb, statusDrawable);'
)
new = (
    '                logoDrawable = context.getResources().getDrawable(R.drawable.telegram_logo_2).mutate();\n'
    '                logoDrawable.setBounds(0, dp(2), dp(26), dp(28));\n'
    '                SpannableStringBuilder ssb = new SpannableStringBuilder("T");\n'
    '                ssb.setSpan(new ImageSpan(logoDrawable), 0, 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);\n'
    '                ssb.append(" ").append(getString(R.string.AppName));\n'
    '                actionBar.setTitle(ssb, statusDrawable);'
)
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: main title = small FairyChat logo + text")
else:
    print("    ::warning::DialogsActivity title block not found — left as-is")
PYEOF
else
  echo "    ::warning::DialogsActivity.java not found — main title left as-is"
fi

# --- Theme-switch tint: the onThemeChanged listener re-applies a
# MULTIPLY color filter to logoDrawable (meant for Telegram's flat plane
# vector). Our crest is a full-color image — clear the filter instead.
if [ -f "$DLG" ]; then
  python3 - "$DLG" << 'PYEOF2' || echo "    ::warning::tint neutralizer failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '            if (logoDrawable != null) {\n'
    '                logoDrawable.setColorFilter(getThemedColor(Theme.key_telegram_color_dialogsLogo), PorterDuff.Mode.MULTIPLY);\n'
    '            }\n'
)
new = (
    '            if (logoDrawable != null) {\n'
    '                logoDrawable.setColorFilter(null);\n'
    '            }\n'
)
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: theme-switch logo tint cleared")
else:
    print("    ::warning::theme-change tint block not found")
PYEOF2
fi

# --- Service chat (777000) data-level rename: chat-list rows build their
# title via ContactsController.formatName(first_name, last_name) directly,
# bypassing UserObject — so patch the cache entry point instead. Every
# consumer (dialog rows, headers, senders, mentions) then reads
# "FairyChat" from the user object itself.
MC="$SRC/TMessagesProj/src/main/java/org/telegram/messenger/MessagesController.java"
if [ -f "$MC" ]; then
  echo "==> service chat (777000) data-level rename -> FairyChat"
  python3 - "$MC" << 'PYEOF' || echo "    ::warning::putUser patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '    public boolean putUser(TLRPC.User user, boolean fromCache, boolean force) {\n'
    '        if (user == null) {\n'
    '            return false;\n'
    '        }\n'
)
new = (
    '    public boolean putUser(TLRPC.User user, boolean fromCache, boolean force) {\n'
    '        if (user == null) {\n'
    '            return false;\n'
    '        }\n'
    '        if (user.id == 777000) {\n'
    '            user.first_name = "FairyChat";\n'
    '            user.last_name = null;\n'
    '        }\n'
)
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: putUser renames 777000 to FairyChat at data level")
else:
    print("    ::warning::putUser signature not found — 777000 keeps server name")
PYEOF
else
  echo "    ::warning::MessagesController.java not found — 777000 keeps server name"
fi

# --- Stage 3.1 — "FairyChat Premium" always visible in Settings:
# the premium row now opens OUR OWN FairyChatPremiumActivity. Remove the
# guard for THAT row only — Telegram's Stars/Business/Gift rows keep
# their original regional guards so users don't confuse Telegram's
# premium surfaces with FairyChat Premium.
SA="$SRC/TMessagesProj/src/main/java/org/telegram/ui/SettingsActivity.java"
if [ -f "$SA" ]; then
  echo "==> Settings: always show OUR FairyChat Premium row"
  python3 - "$SA" << 'PYEOF' || echo "    ::warning::premium rows patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
pairs = [
    ('        if (!getMessagesController().premiumFeaturesBlocked()) {\n'
     '            items.add(SettingCell.Factory.of(11, 0xFFB659FF, 0xFF617CFF, R.drawable.settings_premium, getString(R.string.TelegramPremium)));\n'
     '        }\n',
     '        items.add(SettingCell.Factory.of(11, 0xFFB659FF, 0xFF617CFF, R.drawable.settings_premium, getString(R.string.TelegramPremium)));\n'),
]
for old, new in pairs:
    if old in s:
        s = s.replace(old, new, 1)
        print("    patched: premium row guard removed (row 11 only)")
    else:
        print("    ::warning::premium row block not found")
open(p, 'w', encoding='utf-8').write(s)
PYEOF
else
  echo "    ::warning::SettingsActivity.java not found — premium rows stay conditional"
fi

# --- Stage 3.3 — App Icon picker: SIX DISTINCT FairyChat editions.
# User feedback: every option showed the same crest on the same purple —
# only DEFAULT may show our branding crest; every other option must be
# its own FairyChat edition (own launcher raster AND own preview):
#   Default = crest, FairyChat purple #7C3AED
#   Nox     = icon_2: crest fg, black #1A1A1A bg,  launcher nox.png
#   Premium = icon_3: premium fg, deep purple #6D28D9, launcher premium.png
#   Aqua    = icon_4: crest fg, teal #17A2B8 bg,  launcher aqua.png
#   Turbo   = icon_5: turbo fg, charcoal #262626, launcher turbo.png
#   Vintage = icon_6: vintage fg, mahogany #5C3A21, launcher vintage.png
echo "==> App Icon picker -> 6 distinct FairyChat editions"
LOGO_SRC="$(cd "$(dirname "$0")" && pwd)/branding/telegram_logo.png"
BRAND_ICONS="$(cd "$(dirname "$0")" && pwd)/branding/icons"
if [ -f "$LOGO_SRC" ] && [ -d "$BRAND_ICONS" ]; then
MIPMAP_BASE="$SRC/TMessagesProj/src/main/res/mipmap"
mkdir -p "$MIPMAP_BASE" "$SRC/TMessagesProj/src/main/res/mipmap-anydpi-v26"

# 1) Kill the adaptive-icon XMLs + density rasters for icon_2..6 so our
#    baseline-mipmap edition rasters actually apply when picked.
for N in 2 3 4 5 6; do
  find "$SRC/TMessagesProj/src/main/res/mipmap-anydpi-v26" -name "icon_${N}_launcher*.xml" -delete 2>/dev/null
  find "$SRC/TMessagesProj/src/main/res" -name "icon_${N}_launcher*.png" -delete 2>/dev/null
done

# 2) Each edition's launcher raster (square + round alias) into the
#    baseline mipmap bucket (Android density-scales as needed).
place_mipmap_png() {
  find "$SRC/TMessagesProj/src/main/res" -name "$1.*" -delete 2>/dev/null
  cp "$2" "$MIPMAP_BASE/$1.png"
}
place_mipmap_png icon_2_launcher       "$BRAND_ICONS/nox.png"
place_mipmap_png icon_2_launcher_round "$BRAND_ICONS/nox.png"
place_mipmap_png icon_3_launcher       "$BRAND_ICONS/premium.png"
place_mipmap_png icon_3_launcher_round "$BRAND_ICONS/premium.png"
place_mipmap_png icon_4_launcher       "$BRAND_ICONS/aqua.png"
place_mipmap_png icon_4_launcher_round "$BRAND_ICONS/aqua.png"
place_mipmap_png icon_5_launcher       "$BRAND_ICONS/turbo.png"
place_mipmap_png icon_5_launcher_round "$BRAND_ICONS/turbo.png"
place_mipmap_png icon_6_launcher       "$BRAND_ICONS/vintage.png"
place_mipmap_png icon_6_launcher_round "$BRAND_ICONS/vintage.png"

# 3) Preview foregrounds: Default/Nox/Aqua keep the crest; Premium/
#    Turbo/Vintage preview their own artwork.
for FG in icon_foreground_sa icon_2_foreground_sa icon_4_foreground_sa; do
  find "$SRC/TMessagesProj/src/main/res" -name "$FG.*" -delete 2>/dev/null
  cp "$LOGO_SRC" "$MIPMAP_BASE/$FG.png"
done
for PAIR in "icon_3_foreground_sa:premium.png" "icon_5_foreground_sa:turbo.png" "icon_6_foreground_sa:vintage.png"; do
  FG="${PAIR%%:*}"
  find "$SRC/TMessagesProj/src/main/res" -name "$FG.*" -delete 2>/dev/null
  cp "$BRAND_ICONS/${PAIR#*:}" "$MIPMAP_BASE/$FG.png"
done

# 4) Preview backgrounds: one solid color per edition.
shape_bg() {
  find "$SRC/TMessagesProj/src/main/res" -name "$1.*" -delete 2>/dev/null
  mkdir -p "$SRC/TMessagesProj/src/main/res/$3"
  printf '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="%s"/>\n</shape>\n' "$2" > "$SRC/TMessagesProj/src/main/res/$3/$1.xml"
}
shape_bg icon_background_sa   "#7C3AED" drawable
shape_bg icon_2_background_sa "#1A1A1A" mipmap
shape_bg icon_3_background_sa "#6D28D9" drawable
shape_bg icon_4_background_sa "#17A2B8" drawable
shape_bg icon_5_background_sa "#262626" drawable
shape_bg icon_6_background_sa "#5C3A21" drawable
else
  echo "    (branding assets missing — App Icon picker left as Telegram's)"
fi

# --- Stage 3.4 — Unlock ALL 6 icon editions (they're ours now):
# Telegram's LauncherIconController marks the Premium/Turbo/Nox slots as
# premium (premium=true), so applying them shows a Telegram-Premium
# upsell and fails. These are OUR FairyChat editions now — remove the
# premium flag from all three so every FairyChat user can switch icons
# freely, no premium needed.
LIC_FILE="$SRC/TMessagesProj/src/main/java/org/telegram/ui/LauncherIconController.java"
if [ -f "$LIC_FILE" ]; then
  echo "==> unlock all 6 icon editions (remove TG premium locks)"
  python3 - "$LIC_FILE" << 'PYEOF4' || echo "    ::warning::icon unlock patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
n = 0
for name in ('AppIconPremium', 'AppIconTurbo', 'AppIconNox'):
    old = 'R.string.' + name + ', true)'
    new = 'R.string.' + name + ')'
    if old in s:
        s = s.replace(old, new, 1)
        n += 1
open(p, 'w', encoding='utf-8').write(s)
if n:
    print("    patched: %d icon premium locks removed" % n)
else:
    print("    ::warning::no icon premium flags found")
PYEOF4
else
  echo "    ::warning::LauncherIconController.java not found — icon locks stay"
fi

# --- Stage 3.2 — OUR OWN FairyChat Premium page (INR 99/month, 599/year):
# the settings row previously opened Telegram's PremiumPreviewFragment
# (Telegram's features, Telegram's billing). Ship our own branded premium
# page instead — features list, INR pricing cards, UPI payment steps and
# a code-redemption field (backend verification lands in Stage 4). The
# app is sideloaded (not Play Store), so direct UPI is allowed.
PREM_SRC="$(cd "$(dirname "$0")" && pwd)/branding/FairyChatPremiumActivity.java"
if [ -f "$PREM_SRC" ] && [ -f "$SA" ]; then
  echo "==> FairyChat Premium: apna premium page (INR 99/mo, 599/yr)"
  cp "$PREM_SRC" "$SRC/TMessagesProj/src/main/java/org/telegram/ui/FairyChatPremiumActivity.java"
  python3 - "$SA" << 'PYEOF' || echo "    ::warning::premium row click patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '            case 11:\n'
    '                presentSettingFragment(new PremiumPreviewFragment("settings"));\n'
    '                break;\n'
)
new = (
    '            case 11:\n'
    '                presentSettingFragment(new FairyChatPremiumActivity());\n'
    '                break;\n'
)
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: FairyChat Premium row opens OUR premium page")
else:
    print("    ::warning::case 11 click handler not found — row still opens Telegram premium")
PYEOF
  # Redirect Telegram's remaining premium entry points (tg://premium_offer
  # deep link + the gift flow in LaunchActivity) to OUR Advanced page too,
  # so no surface in the app ever shows Telegram's premium content.
  LA_FILE="$SRC/TMessagesProj/src/main/java/org/telegram/ui/LaunchActivity.java"
  if [ -f "$LA_FILE" ]; then
    python3 - "$LA_FILE" << 'PYEOF2' || echo "    ::warning::LaunchActivity premium redirect failed"
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
# Nesting-aware: matches the full constructor call even when args contain
# nested parens like uri.getQueryParameter("ref") — a flat [^)]* pattern
# leaves a stray ')' behind and breaks javac (build 37615564461 failed
# exactly like that).
s2, n = re.subn(r'new PremiumPreviewFragment\((?:[^()]|\([^()]*\))*\)', 'new FairyChatPremiumActivity()', s)
bad = [ln for ln in s2.splitlines() if 'FairyChatPremiumActivity' in ln and ln.count('(') != ln.count(')')]
if n and not bad:
    open(p, 'w', encoding='utf-8').write(s2)
    print("    patched: %d LaunchActivity premium entry point(s) -> our page" % n)
elif bad:
    print("    ::warning::unbalanced parens after patch — left Telegram's page in place")
else:
    print("    ::warning::no PremiumPreviewFragment in LaunchActivity")
PYEOF2
  fi
else
  echo "    ::warning::premium page source or SettingsActivity missing — skipped"
fi
else
  echo "    (telegram-fork/branding/telegram_logo.png missing — skipping logo swap)"
fi

# --- Stage 5.1 — Founder Premium Unlock (REAL premium visuals):
# FairyChatPremiumActivity.isPremiumActive() is our flag (founder code
# FC-FOUNDER-2026 sets it, premium page also sets it after backend
# verification in Stage 4). OR it into UserConfig.isPremium() so the
# app's premium surfaces light up on this device: premium badge next to
# the name, profile/name colors, animated emojis, premium stickers UI.
# Server-enforced limits (upload size etc.) stay as-is — this is the
# client-side visual unlock so the founder can test every premium
# feature FREE. (Activity also posts currentUserPremiumStatusChanged on
# activate/deactivate so the UI refreshes instantly.)
UC_FILE="$SRC/TMessagesProj/src/main/java/org/telegram/messenger/UserConfig.java"
if [ -f "$UC_FILE" ]; then
  echo "==> FairyChat founder unlock: premium visuals on this device"
  python3 - "$UC_FILE" << 'PYEOF3' || echo "    ::warning::founder unlock patch failed"
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
old = (
    '    public boolean isPremium() {\n'
    '        TLRPC.User user = currentUser;\n'
    '        if (user == null) {\n'
    '            return false;\n'
    '        }\n'
    '        return user.premium;\n'
    '    }\n'
)
new = (
    '    public boolean isPremium() {\n'
    '        TLRPC.User user = currentUser;\n'
    '        if (user == null) {\n'
    '            return false;\n'
    '        }\n'
    '        // FairyChat: founder/premium flag (FC-FOUNDER-2026) unlocks\n'
    '        // premium visuals on this device - badge, profile colors,\n'
    '        // animated emojis.\n'
    '        if (org.telegram.ui.FairyChatPremiumActivity.isPremiumActive(ApplicationLoader.applicationContext)) {\n'
    '            return true;\n'
    '        }\n'
    '        return user.premium;\n'
    '    }\n'
)
if old in s:
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print("    patched: UserConfig.isPremium() ORs in our premium flag")
else:
    print("    ::warning::isPremium() body not found — founder unlock skipped")
PYEOF3
else
  echo "    ::warning::UserConfig.java not found — founder unlock skipped"
fi

# --- FairyChat default palette (Stage 2.5): Telegram's blue accent family →
# FairyChat purple (#7C3AED accent / #6D28D9 text) with gold (#D9B64C)
# gradient highlights. The two TELEGRAM_COLOR constants cover most of the
# app (send button, switches, checkboxes, radio, FABs, seekbars, tabs,
# unread counters); the rest are the scattered blue text/line hexes.
# Semantic colors (name-color palette, call green/red) are left untouched.
THEME_FILE="$SRC/TMessagesProj/src/main/java/org/telegram/ui/ActionBar/ThemeColors.java"
if [ -f "$THEME_FILE" ]; then
  echo "==> default theme accent -> FairyChat purple/gold"
  sed -i.bak \
    -e 's/TELEGRAM_COLOR = 0xFF229AF0/TELEGRAM_COLOR = 0xFF7C3AED/' \
    -e 's/TELEGRAM_COLOR_TEXT = 0xFF298ACF/TELEGRAM_COLOR_TEXT = 0xFF6D28D9/' \
    -e 's/0xff2678b6/0xff6D28D9/g' \
    -e 's/0xff2f8cc9/0xff6D28D9/g' \
    -e 's/0xff3a95d5/0xff7C3AED/g' \
    -e 's/0xff348bc1/0xff6D28D9/g' \
    -e 's/0xff527da3/0xff6D28D9/g' \
    -e 's/0xff4092cd/0xff6D28D9/g' \
    -e 's/0xff4c8eca/0xff7C3AED/g' \
    -e 's/0xff3a8ccf/0xff7C3AED/g' \
    -e 's/0xff377aae/0xff6D28D9/g' \
    -e 's/0xff379de5/0xff7C3AED/g' \
    -e 's/0xff599fd8/0xff7C3AED/g' \
    -e 's/0xff278ddb/0xff6D28D9/g' \
    -e 's/0xff5695cc/0xff6D28D9/g' \
    -e 's/0xff5093d3/0xff6D28D9/g' \
    -e 's/0xff4da6ea/0xff7C3AED/g' \
    -e 's/0xFF56baf0/0xFFD9B64C/g' \
    -e 's/0xff2288d1/0xff6D28D9/g' \
    -e 's/0xFF66ade1/0xFF7C3AED/g' \
    -e 's/0xff229AF0/0xff7C3AED/g' \
    -e 's/0xff229af0/0xff7C3AED/g' \
    -e 's/0xFF168bdb/0xFF7C3AED/g' \
    -e 's/0xff168bdb/0xff7C3AED/g' \
    -e 's/0xff2b96e2/0xff7C3AED/g' \
    -e 's/0xff33a8e6/0xff7C3AED/g' \
    -e 's/0xff3A95D4/0xff7C3AED/g' \
    -e 's/0xff3a95d4/0xff7C3AED/g' \
    -e 's/0xff3fa8ef/0xff7C3AED/g' \
    -e 's/0xff359fe5/0xff7C3AED/g' \
    "$THEME_FILE"
else
  echo "::warning::ThemeColors.java not found — theme palette not applied"
fi

# --- Size guard: GitHub blocks pushing files >100MiB into a repo, and a
# debug build with all four ABIs plus unstripped native debug symbols
# lands right around that limit (our first successful build was ~104MB
# raw and the publish step failed). Ship arm64-v8a only (every modern
# phone) and strip native debug symbols — brings the APK to roughly half
# the size and is still a fully working client. Override with FAIRY_ABIS
# (e.g. "armeabi-v7a", "arm64-v8a") if you need more ABIs back.
ABIS="${FAIRY_ABIS:-arm64-v8a}"
echo "==> ABIs -> $ABIS (native debug symbols stripped)"
for GRADLE in "$SRC/TMessagesProj_App/build.gradle" "$SRC/TMessagesProj/build.gradle"; do
  [ -f "$GRADLE" ] || continue
  sed -i.bak "s/abiFilters \"armeabi-v7a\", \"arm64-v8a\", \"x86\", \"x86_64\"/abiFilters \"$ABIS\"/g" "$GRADLE"
  sed -i.bak "s/ndk.debugSymbolLevel = 'FULL'/ndk.debugSymbolLevel = 'NONE'/g" "$GRADLE"
done

echo "==> app_name -> $APP_NAME (every locale)"
# NOTE: Telegram's launcher label resolves to @string/AppName (set in
# TMessagesProj/config/{debug,release}/AndroidManifest*.xml) — the value
# lives in strings.xml as "AppName" / "AppNameBeta", NOT "app_name" (which
# is why our first build still showed "Telegram" under the FairyChat icon).
# Patch both key styles; no-ops where a key doesn't exist.
find "$SRC/TMessagesProj/src/main/res" -name "strings.xml" -path "*/values*" -type f | while read -r f; do
  sed -i.bak "s|<string name=\"app_name\">[^<]*</string>|<string name=\"app_name\">$APP_NAME</string>|g" "$f" || true
  sed -i.bak "s|<string name=\"AppName\">[^<]*</string>|<string name=\"AppName\">$APP_NAME</string>|g" "$f" || true
  sed -i.bak "s|<string name=\"AppNameBeta\">[^<]*</string>|<string name=\"AppNameBeta\">$APP_NAME Beta</string>|g" "$f" || true
done

# --- Deep brand (Stage 2): scrub "Telegram" from every user-visible string
# VALUE, leaving resource KEYS intact (code references them) and skipping
# strings that contain links/domains/handles so nothing functional breaks.
# The user's feedback: the app is "hubahu Telegram" — inside the app the
# Telegram brand is everywhere (settings titles, descriptions, dialogs...).
# Note: each sed pass replaces (greedily) one occurrence per line, so a
# string mentioning Telegram twice needs two passes — run several.
echo "==> deep brand: Telegram -> $APP_NAME in all string values (keys & links untouched)"
find "$SRC/TMessagesProj/src/main/res" -name "strings.xml" -path "*/values*" -type f | while read -r f; do
  for pass in 1 2 3 4; do
    sed -i.bak -E '/http|telegram\.org|t\.me|@|[a-zA-Z0-9._%+-]+\.com/!s/(<string name="[^"]*"[^>]*>[^<]*)Telegram([^<]*<\/string>)/\1'"$APP_NAME"'\2/g' "$f" || true
  done
done

echo "==> launcher icons -> FairyChat (all densities)"
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  src_dir="$ICONS/mipmap-$density"
  [ -d "$src_dir" ] || continue
  for f in ic_launcher.png ic_launcher_round.png; do
    [ -f "$src_dir/$f" ] || continue
    find "$SRC/TMessagesProj/src/main/res" -type d -name "mipmap-$density" | while read -r d; do
      if [ -f "$d/$f" ]; then
        cp "$src_dir/$f" "$d/$f"
        echo "    replaced $d/$f"
      fi
    done
  done
done

# Clean the sed backup files so they don't end up scanned by gradle/aapt.
find "$SRC" -name "*.bak" -delete

echo "==> branding done: $APP_NAME ($APP_PACKAGE)"
