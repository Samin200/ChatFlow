package com.chatflow.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    private val appUrl = "https://chatflow-live.vercel.app"

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        PushNotifications.createChannel(this)
        askNotificationPermission()

        webView = findViewById(R.id.webView)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Respect the site's viewport meta tag so we get the true
            // mobile layout (overview mode squeezed the desktop layout in).
            useWideViewPort = true
            loadWithOverviewMode = false
            builtInZoomControls = false
            setSupportZoom(false)
            // Voice/video calls need audio without an extra tap.
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }

        // Default client keeps all navigation inside the WebView.
        webView.webViewClient = WebViewClient()
        // window.ChatFlowNative.getPushToken() etc. for the web app.
        webView.addJavascriptInterface(PushBridge(this), "ChatFlowNative")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Let the page close menus/drawers first (they listen for Escape),
                // then WebView history, then exit the app at the root.
                webView.evaluateJavascript(
                    "(function(){try{" +
                        "var e=new KeyboardEvent('keydown',{key:'Escape',keyCode:27,which:27,bubbles:true});" +
                        "window.dispatchEvent(e);document.dispatchEvent(e);" +
                        "}catch(_){}return 1;})();",
                    null
                )
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        webView.loadUrl(appUrl)
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
