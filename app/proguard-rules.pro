# Keep the JavaScript bridge intact.
-keepclassmembers class app.hesabyar.MainActivity$HesabYarBridge {
    @android.webkit.JavascriptInterface <methods>;
}
