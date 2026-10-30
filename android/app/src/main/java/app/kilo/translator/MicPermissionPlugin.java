package app.kilo.translator;

import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * 麥克風權限三態 + 系統字級 + 開啟系統設定。
 *
 * 為什麼要自己寫（ANDROID_APP.md §2.3 失敗分支表）：
 * WebView 的 Permissions API 對 microphone 支援不一致，而且 web 層無法區分
 * 「拒絕一次」與「永久拒絕」——沒有 rationale 概念，使用者會卡死無指引。
 * 這裡直接讀 Android 的權限狀態，做到「先判後要」：
 *   prompt   → 先出 App 內說明，再請求系統權限
 *   denied   → 不彈框，deep-link 到系統 App 詳情頁
 *
 * 實作為 Java（非文件範例的 Kotlin）：本專案使用 Capacitor 的 Java-only 模板，
 * 引入 Kotlin 需要額外的 Gradle 插件與工具鏈，對 40 行插件不划算。
 */
@CapacitorPlugin(
    name = "MicPermission",
    permissions = {
        @Permission(alias = "microphone", strings = { android.Manifest.permission.RECORD_AUDIO })
    }
)
public class MicPermissionPlugin extends Plugin {

    /** 下限不能是 1.0：Android 有 "Smaller" 0.85，強制拉回等於改掉使用者的選擇。 */
    private static final float MIN_FONT_SCALE = 0.85f;
    private static final float MAX_FONT_SCALE = 2.0f;

    /** 供 MainActivity 在 onConfigurationChanged 時廣播字級變化。 */
    private static MicPermissionPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    public static void notifyFontScaleChanged(float fontScale) {
        if (instance == null) return;
        JSObject ret = new JSObject();
        ret.put("fontScale", (double) clampFontScale(fontScale));
        instance.notifyListeners("fontScaleChanged", ret, true);
    }

    @PluginMethod
    public void check(PluginCall call) {
        call.resolve(toResult(getPermissionState("microphone")));
    }

    @PluginMethod
    public void request(PluginCall call) {
        PermissionState state = getPermissionState("microphone");
        // 已授權或永久拒絕都不該再彈系統框：前者沒必要，後者彈了也不會出現
        if (state == PermissionState.GRANTED || state == PermissionState.DENIED) {
            call.resolve(toResult(state));
            return;
        }
        requestPermissionForAlias("microphone", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        call.resolve(toResult(getPermissionState("microphone")));
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", context.getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("無法開啟系統設定", error);
        }
    }

    @PluginMethod
    public void getFontScale(PluginCall call) {
        Configuration configuration = getContext().getResources().getConfiguration();
        JSObject ret = new JSObject();
        ret.put("fontScale", (double) clampFontScale(configuration.fontScale));
        ret.put("rawFontScale", (double) configuration.fontScale);
        call.resolve(ret);
    }

    /**
     * PROMPT_WITH_RATIONALE 對外一律回報 "prompt"：
     * 「拒絕一次」不是永久拒絕，但每一次請求都必須先出 App 內說明，
     * 所以 JS 端看到 prompt 就一定會先開說明視窗，不會自動彈系統框。
     */
    private JSObject toResult(PermissionState state) {
        JSObject ret = new JSObject();
        boolean canAskAgain = true;
        String value;

        switch (state) {
            case GRANTED:
                value = "granted";
                break;
            case DENIED:
                value = "denied";
                canAskAgain = false;
                break;
            case PROMPT_WITH_RATIONALE:
            case PROMPT:
            default:
                value = "prompt";
                break;
        }

        ret.put("state", value);
        ret.put("canAskAgain", canAskAgain);
        return ret;
    }

    private static float clampFontScale(float value) {
        if (value <= 0f) return 1f;
        return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
    }
}
