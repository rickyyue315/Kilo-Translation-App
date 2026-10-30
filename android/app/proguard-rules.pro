# Kilo 翻譯 — R8 keep 規則
#
# 為什麼需要「自己寫」這一條：
# Capacitor 的插件方法是 JS 端用字串反射呼叫的（window.Capacitor.Plugins.MicPermission.request），
# R8 預設會把類名與方法名混淆甚至移除，結果是「Debug 正常、Release 一按麥克風就 no such method」。
# com.getcapacitor.** 由官方 consumer rules 保護，但 app.kilo.translator.** 是我們自己的，必須自己 keep。

# 自訂插件（MicPermission）
-keep class app.kilo.translator.MicPermissionPlugin { *; }
-keep class app.kilo.translator.MainActivity { *; }

# 所有 Capacitor 插件的 @PluginMethod 不得被移除或改名
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}

# 保留註解（@CapacitorPlugin / @Permission 在執行期讀取）
-keepattributes *Annotation*, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations

# 保留行號，crash 堆疊才對得上原始碼
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
