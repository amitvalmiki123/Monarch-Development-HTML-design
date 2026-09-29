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
if [ -n "${TG_APP_ID:-}" ] && [ "$TG_APP_ID" != "4" ]; then
  echo "    using real API credentials from secrets (login will work)"
else
  echo "::warning::TG_APP_ID secret not set — using Telegram's public sample values. The APK compiles and runs, but LOGIN WILL NOT WORK until TG_APP_ID / TG_APP_HASH secrets are configured in the repo."
  echo "    WARNING: TG_APP_ID secret not set — login will NOT work."
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
