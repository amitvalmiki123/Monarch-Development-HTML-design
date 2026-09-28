package com.monarch.chat;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;

// Backs the FairyChat Premium "App Icon" perk (Settings -> FairyChat
// Premium -> App Icon). The launcher icon isn't actually MainActivity's own
// icon — see AndroidManifest.xml's <activity-alias> entries — this plugin
// just flips which one of those aliases is enabled, which is the standard
// Android technique for a switchable app icon (there's no public API to
// just "set the icon" directly).
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    private static final Map<String, String> ALIASES = new HashMap<>();
    static {
        ALIASES.put("default", ".IconDefault");
        ALIASES.put("gold", ".IconGold");
        ALIASES.put("midnight", ".IconMidnight");
        ALIASES.put("neon", ".IconNeon");
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String iconId = call.getString("iconId", "default");
        String targetAlias = ALIASES.get(iconId);
        if (targetAlias == null) {
            call.reject("Unknown icon id: " + iconId);
            return;
        }

        PackageManager pm = getContext().getPackageManager();
        String packageName = getContext().getPackageName();

        for (Map.Entry<String, String> entry : ALIASES.entrySet()) {
            ComponentName component = new ComponentName(packageName, packageName + entry.getValue());
            int state = entry.getValue().equals(targetAlias)
                ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
            try {
                pm.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP);
            } catch (Exception e) {
                // Best-effort — a single alias failing to toggle shouldn't
                // block the others or crash the app over a cosmetic feature.
            }
        }

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }
}
