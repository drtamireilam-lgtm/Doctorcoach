package com.doctorcoach.mobile

import android.os.Bundle
import android.content.Intent
import android.content.ActivityNotFoundException
import android.net.Uri
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.webkit.SslErrorHandler
import android.net.http.SslError
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import androidx.health.connect.client.PermissionController
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity: ComponentActivity() {
    private lateinit var web: WebView
    private lateinit var reader: StepsReader
    private var scope: String? = null
    private var epoch = 0
    private var pendingPermission: (() -> Unit)? = null
    private val permissionLauncher = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
        val pending = pendingPermission; pendingPermission = null; pending?.invoke()
    }
    private fun invalidate() { epoch++; scope = null; pendingPermission = null }
    private fun trusted(url: Uri): Boolean {
        val pin = Uri.parse(BuildConfig.APP_ORIGIN)
        return url.scheme == "https" && url.host == pin.host && (if (url.port == -1) 443 else url.port) == (if (pin.port == -1) 443 else pin.port)
    }
    private fun entryUrl(launch: Intent?): String = when (launch?.action) {
        "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE", "android.intent.action.VIEW_PERMISSION_USAGE" ->
            Uri.parse(BuildConfig.APP_ORIGIN).buildUpon().appendPath("privacy-policy").build().toString()
        else -> BuildConfig.APP_ORIGIN
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent); setIntent(intent); invalidate()
        web.loadUrl(entryUrl(intent))
    }
    private fun openProvider() {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata")))
        } catch (_: ActivityNotFoundException) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")))
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        reader = StepsReader(this); web = WebView(this); setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false; web.settings.allowContentAccess = false
        web.webViewClient = object: WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!trusted(request.url)) { invalidate(); return true }; return false
            }
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) { invalidate() }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) { invalidate(); handler.cancel() }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "doctorcoach", setOf(BuildConfig.APP_ORIGIN)) { _, message, origin, main, _ ->
                if (main && trusted(origin) && trusted(Uri.parse(web.url ?: ""))) {
                    runCatching { JSONObject(message.data ?: "") }.getOrNull()?.let { receive(it) }
                }
            }
        }
        web.loadUrl(entryUrl(intent))
    }
    private fun receive(body: JSONObject) {
        val command = body.optString("command"); val id = body.optString("requestId"); val account = body.optString("accountScope")
        if (id.length !in 1..128 || account.length !in 1..128 || command !in setOf("bind", "invalidate", "connect", "sync", "disconnect")) return
        if (command == "bind") { invalidate(); scope = account }
        if (scope != account) return
        if (command == "invalidate" || command == "disconnect") { invalidate(); return }
        val ticket = epoch
        val perform: () -> Unit = {
            lifecycleScope.launch {
                if (epoch != ticket || scope != account) return@launch
                val result = JSONObject().put("requestId", id).put("accountScope", account).put("platform", "health_connect")
                try {
                    when {
                        !reader.available() -> result.put("status", reader.availability())
                        command == "bind" -> result.put("status", "available")
                        !reader.authorized() -> result.put("status", "permission-required")
                        else -> {
                            val days = reader.readDays(); result.put("days", days)
                            result.put("status", if ((0 until days.length()).any { !days.getJSONObject(it).isNull("steps") }) "ok" else "no-readable-data")
                        }
                    }
                } catch (_: Exception) { result.put("status", "error") }
                if (epoch == ticket && scope == account && trusted(Uri.parse(web.url ?: "")))
                    web.evaluateJavascript("window.dispatchEvent(new CustomEvent('doctorcoach:native-result',{detail:$result}))", null)
            }
        }
        if (command == "connect" && reader.availability() == "provider-required") {
            // A user-initiated connect opens installation/update; it never grants permission itself.
            try { openProvider() } catch (_: ActivityNotFoundException) { /* Report provider-required below. */ }
            perform()
        } else if (command == "connect" && reader.available()) {
            // The callback retains ticket; account invalidation suppresses delivery.
            pendingPermission = perform; permissionLauncher.launch(reader.permissions)
        } else perform()
    }
    override fun onDestroy() { invalidate(); web.destroy(); super.onDestroy() }
}
