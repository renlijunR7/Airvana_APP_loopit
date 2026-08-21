package ai.airvana.demo;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 2408;
    private static final int MICROPHONE_PERMISSION_REQUEST = 2409;
    private WebView webView;
    private LocalAssetServer localServer;
    private int localServerPort;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingPermissionRequest;
    private int nativeTopInsetPx;
    private int nativeBottomInsetPx;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(242, 242, 247));
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );

        try {
            localServer = new LocalAssetServer(getAssets(), 0);
            localServer.start();
            localServerPort = localServer.getPort();
        } catch (IOException error) {
            Toast.makeText(this, "无法启动本地演示服务", Toast.LENGTH_LONG).show();
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(242, 242, 247));
        webView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                int topInset = Math.max(insets.getSystemWindowInsetTop(), insets.getStableInsetTop());
                int bottomInset = Math.max(insets.getSystemWindowInsetBottom(), insets.getStableInsetBottom());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Insets statusBars = insets.getInsetsIgnoringVisibility(
                            WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout());
                    Insets navigationBars = insets.getInsetsIgnoringVisibility(WindowInsets.Type.navigationBars());
                    Insets systemGestures = insets.getInsets(
                            WindowInsets.Type.systemGestures() | WindowInsets.Type.mandatorySystemGestures());
                    topInset = Math.max(topInset, statusBars.top);
                    bottomInset = Math.max(bottomInset, Math.max(navigationBars.bottom, systemGestures.bottom));
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    bottomInset = Math.max(bottomInset, insets.getSystemGestureInsets().bottom);
                    bottomInset = Math.max(bottomInset, insets.getMandatorySystemGestureInsets().bottom);
                }
                nativeTopInsetPx = topInset;
                nativeBottomInsetPx = bottomInset;
                injectNativeSafeArea();
                return insets;
            }
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectNativeSafeArea();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("127.0.0.1".equals(uri.getHost()) && uri.getPort() == localServerPort) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException error) {
                    Toast.makeText(MainActivity.this, "暂时无法打开外部链接", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    Uri origin = request.getOrigin();
                    boolean trustedLocalOrigin = origin != null
                        && "127.0.0.1".equals(origin.getHost())
                        && origin.getPort() == localServerPort;
                    boolean requestsAudioOnly = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            requestsAudioOnly = true;
                        } else {
                            requestsAudioOnly = false;
                            break;
                        }
                    }
                    if (!trustedLocalOrigin || !requestsAudioOnly) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        return;
                    }
                    if (pendingPermissionRequest != null) {
                        pendingPermissionRequest.deny();
                    }
                    pendingPermissionRequest = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                });
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingPermissionRequest == request) {
                    pendingPermissionRequest = null;
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent chooser;
                try {
                    chooser = params.createIntent();
                } catch (Exception error) {
                    chooser = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    chooser.addCategory(Intent.CATEGORY_OPENABLE);
                    chooser.setType("*/*");
                }
                try {
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "未找到文件选择器", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.clearCache(true);
        setContentView(webView);
        webView.requestApplyInsets();
        if (localServerPort > 0) {
            webView.loadUrl("http://127.0.0.1:" + localServerPort + "/?native-shell=1&app-version=20");
        } else {
            webView.loadData("<h2>Airvana 本地资源启动失败</h2><p>请完全退出应用后重试。</p>", "text/html; charset=utf-8", "UTF-8");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MICROPHONE_PERMISSION_REQUEST || pendingPermissionRequest == null) {
            return;
        }
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            pendingPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingPermissionRequest.deny();
        }
        pendingPermissionRequest = null;
    }

    private void injectNativeSafeArea() {
        if (webView == null) {
            return;
        }
        float density = getResources().getDisplayMetrics().density;
        float topCssPx = density > 0 ? nativeTopInsetPx / density : nativeTopInsetPx;
        float reportedBottomCssPx = density > 0 ? nativeBottomInsetPx / density : nativeBottomInsetPx;
        float bottomCssPx = Math.max(48.0f, reportedBottomCssPx);
        String topValue = Float.toString(topCssPx) + "px";
        String bottomValue = Float.toString(bottomCssPx) + "px";
        String script = "(function(){"
            + "var root=document.documentElement;"
            + "if(!root){return;}"
            + "root.style.setProperty('--native-safe-top','" + topValue + "');"
            + "root.style.setProperty('--safe-top','var(--native-safe-top)');"
            + "root.style.setProperty('--native-safe-bottom','" + bottomValue + "');"
            + "root.style.setProperty('--safe-bottom','var(--native-safe-bottom)');"
            + "})();";
        webView.evaluateJavascript(script, null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) {
            return;
        }
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (pendingPermissionRequest != null) {
            pendingPermissionRequest.deny();
            pendingPermissionRequest = null;
        }
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        if (localServer != null) {
            localServer.stop();
        }
        super.onDestroy();
    }
}
