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
else
  echo "    (telegram-fork/branding/telegram_logo.png missing — skipping logo swap)"
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
