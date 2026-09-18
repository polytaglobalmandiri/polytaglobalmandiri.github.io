package com.polyta.mobile;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.*;
import android.print.PrintManager;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;

/** Native Android shell with an in-app WebView for live operational pages. */
public final class MainActivity extends Activity {
    private static final int RED = 0xffc8102e, RED_HI = 0xffe63b52, INK = 0xff15151a, MUTED = 0xff7c7c88;
    private static final int BG = 0xffe3e3e8, PANEL = 0xfffafafb, PANEL_EDGE = 0xffbfbfc8;
    private static final int FILE_PICK = 41, CAMERA = 42, STORAGE = 43;
    private WebView web;
    private FrameLayout content;
    private ScrollView home;
    private LinearLayout errorPanel;
    private ProgressBar progress;
    private TextView title, back;
    private final TextView[] tabs = new TextView[3];
    private boolean onHome = true, failed = false, isAdmin;
    private String lastUrl = RoutePolicy.ORIGIN + "/", currentTitle = "Polyta";
    private ValueCallback<Uri[]> files;
    private PermissionRequest camera;
    private String[] pendingDownload;
    private String mobileStyle = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        isAdmin = getPackageName().endsWith(".admin");
        try (InputStream input = getAssets().open("mobile.css")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(); byte[] block = new byte[4096]; int count;
            while ((count = input.read(block)) != -1) bytes.write(block, 0, count);
            mobileStyle = bytes.toString("UTF-8");
        } catch (Exception ignored) { /* Operational pages still work with their own responsive styles. */ }
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Build.VERSION.SDK_INT >= 26 ? Color.WHITE : INK);
        int systemIcons = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= 26) systemIcons |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(systemIcons);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        // Android 15 uses edge-to-edge: keep toolbar, bottom navigation and keyboard clear.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(root);
        root.requestApplyInsets();
        LinearLayout toolbar = row();
        toolbar.setBackground(metal());
        toolbar.setPadding(dp(8), dp(4), dp(8), dp(4));
        back = action("‹", "Kembali", v -> goBack());
        toolbar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));
        title = text("POLYTA", 19, INK, true);
        title.setSingleLine(true);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        toolbar.addView(action("⋮", "Menu aplikasi", this::menu), new LinearLayout.LayoutParams(dp(48), dp(48)));
        root.addView(toolbar);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setProgressTintList(ColorStateList.valueOf(RED));
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        configureWeb();
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        makeHome();
        makeError();
        LinearLayout navigation = row();
        navigation.setBackground(panel());
        navigation.setPadding(dp(12), dp(8), dp(12), dp(8));
        String[] labels = {"Beranda", "SPK", isAdmin ? "Admin" : "Persetujuan"};
        int[] icons = {android.R.drawable.ic_menu_view, android.R.drawable.ic_menu_agenda,
                android.R.drawable.ic_lock_lock};
        for (int i = 0; i < tabs.length; i++) {
            final int index = i;
            tabs[i] = text(labels[i], 12, MUTED, true);
            tabs[i].setGravity(Gravity.CENTER);
            tabs[i].setPadding(dp(8), dp(6), dp(8), dp(6));
            android.graphics.drawable.Drawable icon = getDrawable(icons[i]);
            icon.setTint(MUTED); icon.setBounds(0, 0, dp(22), dp(22));
            tabs[i].setCompoundDrawables(null, icon, null, null);
            tabs[i].setCompoundDrawablePadding(dp(4));
            tabs[i].setOnClickListener(v -> {
                if (index == 0) showHome();
                else open(index == 1 ? "/apps/spk-automation/" :
                        (isAdmin ? "/pages/admin/" : "/apps/spk-automation/approval/"), labels[index], index);
            });
            navigation.addView(tabs[i], new LinearLayout.LayoutParams(0, dp(60), 1));
        }
        root.addView(navigation);
        showHome();
        if (state != null && !state.getBoolean("home", true)) {
            Bundle saved = state.getBundle("web");
            String url = state.getString("url", lastUrl);
            if (RoutePolicy.internal(url)) {
                lastUrl = url;
                showWeb(state.getString("title", "Polyta"), state.getInt("tab", 1));
                if (saved == null || web.restoreState(saved) == null) web.loadUrl(url);
            }
        }
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
    }

    private int selectedTab = 0;
    private void selectTab(int selected) {
        selectedTab = selected;
        for (int i = 0; i < tabs.length; i++) {
            if (tabs[i] == null) continue;
            int color = i == selected ? RED : MUTED;
            tabs[i].setTextColor(color);
            tabs[i].getCompoundDrawables()[1].setTint(color);
            tabs[i].setBackground(ripple(i == selected ? 0xffffe8ec : PANEL, 10));
        }
    }
    private void makeHome() {
        home = new ScrollView(this);
        home.setFillViewport(true);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(20), dp(20), dp(20), dp(28));
        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setPadding(dp(24), dp(24), dp(24), dp(24));
        hero.setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{RED_HI, RED, 0xff8a0b1f}));
        ((GradientDrawable) hero.getBackground()).setCornerRadius(dp(20));
        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("polyta", "drawable", getPackageName()));
        hero.addView(logo, new LinearLayout.LayoutParams(dp(52), dp(52)));
        TextView welcome = text(isAdmin ? "Ruang Administrator" : "Selamat datang di Polyta", 25, Color.WHITE, true);
        welcome.setPadding(0, dp(16), 0, dp(8)); hero.addView(welcome);
        hero.addView(text("Akses pekerjaan Anda, langsung dari satu aplikasi.", 14, 0xffffe9ed, false));
        page.addView(hero, new LinearLayout.LayoutParams(-1, -2));
        TextView section = text("Akses cepat", 19, INK, true);
        section.setPadding(0, dp(26), 0, dp(14)); page.addView(section);
        String[][] entries = {
                {"Dashboard SPK", "Pantau pekerjaan", "/apps/spk-automation/"},
                {"Buat SPK", "Input pekerjaan baru", "/apps/spk-automation/create-spk/"},
                {"Persetujuan", "Tinjau dan setujui", "/apps/spk-automation/approval/"},
                {"Bahan & tinta", "Kelola material", "/apps/spk-automation/material-management/"},
                {"Serah terima", "Pindai dan serahkan", "/apps/spk-automation/handover/"},
                {"Portal lengkap", "Semua departemen", "/"},
                {"Download", "Pembaruan aplikasi", "/unduh/"},
                {isAdmin ? "Administrator" : "Bantuan", isAdmin ? "Kelola portal" : "Panduan penggunaan",
                        isAdmin ? "/pages/admin/" : "/dokumentasi/"}
        };
        int[] icons = {android.R.drawable.ic_menu_agenda, android.R.drawable.ic_input_add,
                android.R.drawable.checkbox_on_background, android.R.drawable.ic_menu_manage,
                android.R.drawable.ic_menu_camera, android.R.drawable.ic_menu_view,
                android.R.drawable.stat_sys_download_done, android.R.drawable.ic_menu_help};
        for (int i = 0; i < entries.length; i += 2) {
            LinearLayout line = row();
            for (int j = i; j < i + 2; j++) {
                final String[] entry = entries[j];
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(dp(16), dp(18), dp(12), dp(18));
                card.setBackground(ripplePanel(14));
                card.setElevation(dp(1));
                ImageView icon = new ImageView(this);
                icon.setImageResource(icons[j]); icon.setImageTintList(ColorStateList.valueOf(RED));
                card.addView(icon, new LinearLayout.LayoutParams(dp(27), dp(27)));
                TextView name = text(entry[0], 15, INK, true);
                name.setPadding(0, dp(12), 0, dp(4)); card.addView(name);
                card.addView(text(entry[1], 12, MUTED, false));
                card.setFocusable(true); card.setClickable(true);
                card.setContentDescription(entry[0] + ". " + entry[1]);
                card.setOnClickListener(v -> open(entry[2], entry[0], entry[2].contains("approval") ||
                        entry[2].contains("admin") ? 2 : 1));
                LinearLayout.LayoutParams item = new LinearLayout.LayoutParams(0, -1, 1);
                item.setMargins(j % 2 == 0 ? 0 : dp(6), 0, j % 2 == 0 ? dp(6) : 0, 0);
                line.addView(card, item);
            }
            LinearLayout.LayoutParams lineParams = new LinearLayout.LayoutParams(-1, -2);
            lineParams.bottomMargin = dp(12); page.addView(line, lineParams);
        }
        TextView note = text("POLYTA GLOBAL MANDIRI\nVersi 1.2.0 · Terhubung ke portal perusahaan", 12, MUTED, false);
        note.setPadding(0, dp(16), 0, 0); note.setGravity(Gravity.CENTER); page.addView(note);
        home.addView(page); content.addView(home, new FrameLayout.LayoutParams(-1, -1));
    }
    private void makeError() {
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL); errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(32), dp(24), dp(32), dp(24)); errorPanel.setBackgroundColor(BG);
        TextView heading = text("Halaman belum dapat dimuat", 22, INK, true);
        heading.setGravity(Gravity.CENTER); errorPanel.addView(heading);
        TextView detail = text("Periksa koneksi internet Anda, lalu coba lagi.", 15, MUTED, false);
        detail.setGravity(Gravity.CENTER); detail.setPadding(0, dp(12), 0, dp(24)); errorPanel.addView(detail);
        Button retry = new Button(this); retry.setText("Coba lagi"); retry.setAllCaps(false);
        retry.setTextColor(Color.WHITE); retry.setBackground(raisedButton());
        retry.setOnClickListener(v -> { failed = false; errorPanel.setVisibility(View.GONE); web.loadUrl(lastUrl); });
        errorPanel.addView(retry); content.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
        errorPanel.setVisibility(View.GONE);
    }
    private void showHome() {
        cancelCamera(); onHome = true; web.onPause(); home.setVisibility(View.VISIBLE);
        web.setVisibility(View.GONE); errorPanel.setVisibility(View.GONE); progress.setVisibility(View.INVISIBLE);
        title.setText(isAdmin ? "Polyta Admin" : "Polyta"); back.setVisibility(View.INVISIBLE); selectTab(0);
    }
    private void showWeb(String name, int tab) {
        onHome = false; currentTitle = name; title.setText(name); back.setVisibility(View.VISIBLE);
        home.setVisibility(View.GONE); web.setVisibility(View.VISIBLE); web.onResume(); selectTab(tab);
    }
    private void open(String path, String name, int tab) {
        showWeb(name, tab); failed = false; errorPanel.setVisibility(View.GONE);
        String url = RoutePolicy.ORIGIN + path;
        if (url.equals(web.getUrl())) return;
        lastUrl = url; web.loadUrl(url);
    }
    private void configureWeb() {
        WebView.setWebContentsDebuggingEnabled(false);
        web.setBackgroundColor(Color.WHITE);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(true); settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " PolytaAndroid/1.2.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return !RoutePolicy.internal(request.getUrl().toString());
                return route(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return route(url); }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                cancelCamera();
                if (files != null) { files.onReceiveValue(null); files = null; }
                failed = false;
                if (RoutePolicy.internal(url)) lastUrl = url;
                errorPanel.setVisibility(View.GONE);
                if (!onHome) progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.INVISIBLE); CookieManager.getInstance().flush();
                if (RoutePolicy.internal(url) && !failed) {
                    // Print requests open Android's print sheet; no privileged JavaScript bridge.
                    view.evaluateJavascript("(function(){var s=document.getElementById('polyta-native-style');" +
                            "if(!s){s=document.createElement('style');s.id='polyta-native-style';document.head.appendChild(s);}" +
                            "s.textContent=" + JSONObject.quote(mobileStyle) + ";" +
                            "window.print=function(){location.href='polyta-print://current';};})();", null);
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (onHome || !RoutePolicy.internal(web.getUrl()) || !RoutePolicy.internal(request.getOrigin().toString())) {
                        request.deny(); return;
                    }
                    boolean video = false;
                    for (String resource : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) video = true;
                    if (!video) { request.deny(); return; }
                    cancelCamera(); camera = request;
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) grantCamera();
                    else requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA);
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (camera == request) camera = null; }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (files != null) files.onReceiveValue(null);
                files = callback;
                Intent chooser = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                chooser.addCategory(Intent.CATEGORY_OPENABLE); chooser.setType("*/*");
                String[] types = params.getAcceptTypes();
                if (types.length > 0 && !types[0].isEmpty()) chooser.putExtra(Intent.EXTRA_MIME_TYPES, types);
                chooser.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(chooser, FILE_PICK); }
                catch (ActivityNotFoundException unavailable) { files.onReceiveValue(null); files = null; toast("Pemilih berkas tidak tersedia."); }
                return true;
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message result) {
                if (!gesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView ignored, WebResourceRequest request) {
                        handlePopup(request.getUrl().toString(), popup); return true;
                    }
                    @Override public boolean shouldOverrideUrlLoading(WebView ignored, String url) {
                        handlePopup(url, popup); return true;
                    }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup); result.sendToTarget();
                new Handler(Looper.getMainLooper()).postDelayed(() -> popup.destroy(), 10000);
                return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK", (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Lanjutkan", (d, w) -> result.confirm())
                        .setNegativeButton("Batal", (d, w) -> result.cancel()).setOnCancelListener(d -> result.cancel()).show(); return true;
            }
        });
        web.setDownloadListener((url, userAgent, disposition, mime, size) -> {
            if (!RoutePolicy.external(url) || !"https".equals(Uri.parse(url).getScheme())) { toast("Format unduhan ini belum didukung."); return; }
            pendingDownload = new String[]{url, userAgent, disposition, mime};
            if (Build.VERSION.SDK_INT <= 28 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED)
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE);
            else download();
        });
    }
    private void handlePopup(String url, WebView popup) {
        if (RoutePolicy.internal(url)) { showWeb("Polyta", selectedTab); web.loadUrl(url); }
        else external(url);
        popup.stopLoading();
    }
    private boolean route(String url) {
        if ("polyta-print://current".equals(url)) {
            if (RoutePolicy.internal(web.getUrl()) && !onHome) printPage();
            return true;
        }
        if (RoutePolicy.internal(url)) return false;
        external(url); return true;
    }
    private void external(String url) {
        if (!RoutePolicy.external(url)) { toast("Tautan ini tidak didukung."); return; }
        new AlertDialog.Builder(this).setTitle("Buka aplikasi lain?")
                .setMessage("Tautan di luar portal akan dibuka menggunakan aplikasi perangkat.")
                .setPositiveButton("Buka", (d, w) -> {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                    catch (ActivityNotFoundException error) { toast("Tidak ada aplikasi untuk membuka tautan ini."); }
                }).setNegativeButton("Batal", null).show();
    }
    private void download() {
        if (pendingDownload == null) return;
        String[] item = pendingDownload; pendingDownload = null;
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(item[0]));
            String name = URLUtil.guessFileName(item[0], item[2], item[3]);
            request.setTitle(name); request.setMimeType(item[3]);
            String cookie = CookieManager.getInstance().getCookie(item[0]);
            if (cookie != null) request.addRequestHeader("Cookie", cookie);
            request.addRequestHeader("User-Agent", item[1]);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            toast("Mengunduh ke folder Download.");
        } catch (Exception error) { toast("Unduhan gagal dimulai. Silakan coba lagi."); }
    }
    private void grantCamera() {
        PermissionRequest request = camera; camera = null;
        if (request == null) return;
        if (!onHome && RoutePolicy.internal(web.getUrl()) && RoutePolicy.internal(request.getOrigin().toString()))
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        else request.deny();
    }
    private void cancelCamera() { if (camera != null) { camera.deny(); camera = null; } }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == CAMERA) { if (granted) grantCamera(); else { cancelCamera(); toast("Izin kamera ditolak."); } }
        if (code == STORAGE) { if (granted) download(); else { pendingDownload = null; toast("Izin penyimpanan ditolak."); } }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == FILE_PICK && files != null) {
            Uri[] selected = WebChromeClient.FileChooserParams.parseResult(result, data);
            if (selected != null) for (Uri uri : selected) if (!"content".equals(uri.getScheme())) { selected = null; break; }
            if (onHome || !RoutePolicy.internal(web.getUrl())) selected = null;
            files.onReceiveValue(selected); files = null;
        }
    }
    private void menu(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        if (!onHome) { menu.getMenu().add("Muat ulang"); menu.getMenu().add("Cetak / Simpan PDF"); }
        menu.getMenu().add("Download aplikasi"); menu.getMenu().add("Tentang Polyta");
        menu.setOnMenuItemClickListener(item -> {
            String label = item.getTitle().toString();
            if (label.equals("Muat ulang")) web.reload();
            else if (label.equals("Cetak / Simpan PDF")) printPage();
            else if (label.equals("Download aplikasi")) open("/unduh/", "Download", 1);
            else new AlertDialog.Builder(this).setTitle("Polyta Android 1.2.0")
                    .setMessage("Portal pekerjaan POLYTA GLOBAL MANDIRI.\n\nHalaman operasional ditampilkan di dalam aplikasi dan memerlukan internet.")
                    .setPositiveButton("Tutup", null).show();
            return true;
        }); menu.show();
    }
    private void printPage() {
        if (onHome || failed || !RoutePolicy.internal(web.getUrl())) return;
        PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
        manager.print("Polyta", web.createPrintDocumentAdapter("Polyta"), null);
    }
    private void showError() { failed = true; progress.setVisibility(View.INVISIBLE); if (!onHome) errorPanel.setVisibility(View.VISIBLE); }
    private void goBack() {
        if (!onHome) { if (web.canGoBack()) { errorPanel.setVisibility(View.GONE); web.goBack(); } else showHome(); }
        else finish();
    }
    @Override public void onBackPressed() { goBack(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putBoolean("home", onHome); state.putString("url", lastUrl); state.putString("title", currentTitle); state.putInt("tab", selectedTab);
        Bundle saved = new Bundle(); web.saveState(saved); state.putBundle("web", saved);
    }
    @Override protected void onPause() { super.onPause(); web.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onResume() { super.onResume(); if (web != null && !onHome) web.onResume(); }
    @Override protected void onDestroy() {
        cancelCamera(); if (files != null) { files.onReceiveValue(null); files = null; }
        if (web != null) { content.removeView(web); web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout row() { LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); row.setGravity(Gravity.CENTER_VERTICAL); return row; }
    private GradientDrawable round(int color, int radius) { GradientDrawable shape = new GradientDrawable(); shape.setColor(color); shape.setCornerRadius(dp(radius)); return shape; }
    private android.graphics.drawable.Drawable ripple(int color, int radius) {
        return new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(0x22c8102e), round(color, radius), null);
    }
    private android.graphics.drawable.Drawable ripplePanel(int radius) {
        GradientDrawable shape = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{0xffffffff, PANEL});
        shape.setCornerRadius(dp(radius)); shape.setStroke(dp(1), PANEL_EDGE);
        return new android.graphics.drawable.RippleDrawable(ColorStateList.valueOf(0x22c8102e), shape, null);
    }
    private GradientDrawable panel() {
        GradientDrawable shape = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xffffffff, 0xffececef});
        shape.setStroke(dp(1), PANEL_EDGE); return shape;
    }
    private GradientDrawable metal() {
        return new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xfff8f8fa, 0xffe4e4e9, 0xffc8c8d1, 0xffe4e4e9});
    }
    private GradientDrawable raisedButton() {
        GradientDrawable shape = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{RED_HI, RED, 0xff8a0b1f});
        shape.setCornerRadius(dp(8)); return shape;
    }
    private TextView text(String label, int size, int color, boolean bold) {
        TextView view = new TextView(this); view.setText(label); view.setTextSize(size); view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return view;
    }
    private TextView action(String label, String description, View.OnClickListener listener) {
        TextView button = text(label, 30, INK, false); button.setGravity(Gravity.CENTER);
        button.setBackground(ripple(Color.TRANSPARENT, 10));
        button.setContentDescription(description); button.setOnClickListener(listener); button.setFocusable(true); return button;
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
}
