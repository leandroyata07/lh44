package com.lh44.game;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configuração de Tela Cheia e Performance
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        hideSystemUI();

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(0xFF000000);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(0xFF000000);

        // Habilita aceleração gráfica de hardware
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        // Carrega o jogo dos assets locais
        webView.loadUrl("file:///android_asset/index.html");

        layout.addView(webView);
        setContentView(layout);

        // Garante foco para captura de controles e toque
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            View decorView = getWindow().getDecorView();
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                      | View.SYSTEM_UI_FLAG_FULLSCREEN
                      | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            decorView.setSystemUiVisibility(flags);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (webView != null) {
            webView.dispatchKeyEvent(event);
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if (webView != null) {
            webView.onGenericMotionEvent(event);
        }
        return super.onGenericMotionEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("if (window.onAndroidBackPressed) { window.onAndroidBackPressed(); } else if (window.game && window.game.togglePause) { window.game.togglePause(); }", null);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUI();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}

