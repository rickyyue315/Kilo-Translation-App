package app.kilo.translator;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 必須在 super.onCreate 之前註冊：BridgeActivity 會在這一步把插件清單交給 Bridge
        registerPlugin(MicPermissionPlugin.class);
        super.onCreate(savedInstanceState);

        // 顯式鎖 textZoom = 100。
        // WebView 的 textZoom 預設是 100 且不追蹤 fontScale，但部分 ROM 會把它改成
        // 跟隨系統 —— 於是 root font-size × textZoom 疊乘成 400%，只在特定機型重現，
        // 測試機永遠看不到。這行不是多餘設定，請勿刪除。
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setTextZoom(100);
            }
        } catch (Exception ignored) {
            // 取不到 WebView 時退回系統預設；字級仍由 JS 端套用
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // configChanges 已含 fontScale，所以改字級不會重建 WebView，只會走到這裡。
        // 廣播給 JS，使用者在背景改完字級再回來才不會「字沒變但版面已 compact」。
        MicPermissionPlugin.notifyFontScaleChanged(newConfig.fontScale);
    }
}
