package com.polytaglobalmandiri.portal;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int CAMERA_PERMISSION_REQUEST = 1002;

    private WebView webView;
    private String startUrl;
    private String portalOrigin;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingCameraRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        portalOrigin = getString(R.string.portal_origin);
        startUrl = portalOrigin + getString(R.string.start_path);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebViewClient(new PortalWebViewClient());
        webView.setWebChromeClient(new PortalWebChromeClient());
        webView.setDownloadListener((url, userAgent, disposition, mimeType, length) -> openExternally(url));

        if (savedInstanceState == null) {
            webView.loadUrl(startUrl);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private boolean isTrusted(String rawUrl) {
        if (rawUrl == null) {
            return false;
        }
        Uri uri = Uri.parse(rawUrl);
        Uri origin = Uri.parse(portalOrigin);
        return origin.getScheme() != null
                && origin.getScheme().equals(uri.getScheme())
                && origin.getHost() != null
                && origin.getHost().equals(uri.getHost())
                && origin.getPort() == uri.getPort();
    }

    private void openExternally(String rawUrl) {
        if (rawUrl == null) {
            return;
        }
        String scheme = Uri.parse(rawUrl).getScheme();
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(rawUrl));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(intent);
        } catch (android.content.ActivityNotFoundException ignored) {
            // Tidak ada peramban terpasang; permintaan diabaikan.
        }
    }

    private void showOfflinePage(String description) {
        String safeMessage = description == null ? "" : description.replaceAll("[&<>\"']", "");
        String html = "<!doctype html><html lang=\"id\"><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<style>body{font:16px system-ui,sans-serif;margin:0;display:grid;place-items:center;"
                + "min-height:100vh;background:#eee;color:#202124}.box{max-width:520px;padding:32px;"
                + "background:#fff;border-radius:18px;box-shadow:0 8px 30px #0002;text-align:center}"
                + "button{padding:11px 20px;border:0;border-radius:9px;background:#b71925;color:#fff;"
                + "font-weight:700}</style><div class=\"box\"><h1>" + getString(R.string.offline_title)
                + "</h1><p>" + getString(R.string.offline_message) + "</p><p><small>" + safeMessage
                + "</small></p><button onclick=\"location.href='" + startUrl + "'\">"
                + getString(R.string.offline_retry) + "</button></div></html>";
        String encoded = Base64.encodeToString(html.getBytes(), Base64.NO_PADDING);
        webView.loadData(encoded, "text/html", "base64");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (fileCallback == null) {
            return;
        }
        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK) {
            results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        fileCallback.onReceiveValue(results);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode != CAMERA_PERMISSION_REQUEST) {
            super.onRequestPermissionsResult(requestCode, permissions, results);
            return;
        }
        if (pendingCameraRequest == null) {
            return;
        }
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            pendingCameraRequest.grant(pendingCameraRequest.getResources());
        } else {
            pendingCameraRequest.deny();
        }
        pendingCameraRequest = null;
    }

    private class PortalWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (isTrusted(url)) {
                return false;
            }
            openExternally(url);
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) {
                return;
            }
            CharSequence description = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? error.getDescription() : null;
            showOfflinePage(description == null ? null : description.toString());
        }
    }

    private class PortalWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(null);
            }
            fileCallback = callback;
            try {
                startActivityForResult(
                        Intent.createChooser(params.createIntent(),
                                getString(R.string.file_chooser_title)),
                        FILE_CHOOSER_REQUEST);
                return true;
            } catch (android.content.ActivityNotFoundException error) {
                fileCallback = null;
                return false;
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            if (!isTrusted(request.getOrigin().toString())) {
                request.deny();
                return;
            }
            boolean wantsCamera = false;
            for (String resource : request.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                    wantsCamera = true;
                }
            }
            if (!wantsCamera) {
                request.deny();
                return;
            }
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                request.grant(request.getResources());
                return;
            }
            pendingCameraRequest = request;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        }
    }
}
