package app.hesabyar

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.util.Base64
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val dbFile: File by lazy { File(filesDir, "hesabyar.sqlite") }
    // last window insets in CSS px, so we can re-apply after every page (re)load
    private var insetTop = 0; private var insetRight = 0; private var insetBottom = 0; private var insetLeft = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)

        // Edge-to-edge: draw behind the system bars, then feed their sizes to the web
        // layer as CSS vars so nothing is hidden under the status bar or the
        // navigation / back-home bar (the Samsung overlap issue). targetSdk 35 forces
        // edge-to-edge anyway, so we opt in explicitly and handle the insets ourselves.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, webView).isAppearanceLightStatusBars = true
        WindowCompat.getInsetsController(window, webView).isAppearanceLightNavigationBars = true
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            insetTop = (bars.top / d).toInt(); insetRight = (bars.right / d).toInt()
            insetBottom = (bars.bottom / d).toInt(); insetLeft = (bars.left / d).toInt()
            applyInsetsToWeb()
            insets
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
            textZoom = 100
        }
        WebView.setWebContentsDebuggingEnabled(true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
            override fun onPageFinished(view: WebView, url: String?) {
                applyInsetsToWeb() // the SPA reloads the page on navigation; re-apply each time
            }
        }

        webView.addJavascriptInterface(HesabYarBridge(), "HesabYar")

        // in-app back navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl("https://appassets.androidplatform.net/index.html?hpa_tab=dashboard")
        }
    }

    private fun applyInsetsToWeb() {
        val js = "window.__applyInsets && window.__applyInsets($insetTop,$insetRight,$insetBottom,$insetLeft)"
        webView.evaluateJavascript(js, null)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); webView.saveState(outState) }
    override fun onRestoreInstanceState(savedInstanceState: Bundle) { super.onRestoreInstanceState(savedInstanceState); webView.restoreState(savedInstanceState) }

    inner class HesabYarBridge {
        @JavascriptInterface
        fun loadDb(): String {
            return try {
                if (dbFile.exists()) Base64.encodeToString(dbFile.readBytes(), Base64.NO_WRAP) else ""
            } catch (e: Exception) { "" }
        }

        @JavascriptInterface
        fun saveDb(base64: String) {
            try { dbFile.writeBytes(Base64.decode(base64, Base64.NO_WRAP)) } catch (_: Exception) {}
        }

        @JavascriptInterface
        fun saveText(name: String, content: String) {
            try {
                val dir = getExternalFilesDir(null) ?: filesDir
                val out = File(dir, name)
                out.writeText(content)
                runOnUiThread { Toast.makeText(this@MainActivity, "ذخیره شد: " + out.absolutePath, Toast.LENGTH_LONG).show() }
            } catch (_: Exception) {}
        }

        @JavascriptInterface
        fun exportPdf(name: String, html: String) {
            runOnUiThread { printHtmlToPdf(name, html) }
        }
    }

    private fun printHtmlToPdf(name: String, html: String) {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        val printWeb = WebView(this)
        printWeb.settings.javaScriptEnabled = true
        printWeb.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
            override fun onPageFinished(view: WebView, url: String?) {
                view.postDelayed({
                    try {
                        val jobName = "HesabYar-" + name
                        val pm = getSystemService(PRINT_SERVICE) as PrintManager
                        val adapter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
                            view.createPrintDocumentAdapter(jobName) else @Suppress("DEPRECATION") view.createPrintDocumentAdapter()
                        pm.print(jobName, adapter, PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build())
                    } catch (_: Exception) {}
                }, 350)
            }
        }
        // keep a reference so it isn't GC'd during the print job
        (webView.parent as? ViewGroup)?.addView(printWeb, 1, 1)
        printWeb.loadDataWithBaseURL("https://appassets.androidplatform.net/", html, "text/html", "utf-8", null)
    }
}
