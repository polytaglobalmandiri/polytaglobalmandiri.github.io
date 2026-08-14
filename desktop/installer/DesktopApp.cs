using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

#if ADMIN
[assembly: System.Reflection.AssemblyTitle("POLYTA GLOBAL MANDIRI Administrator")]
[assembly: System.Reflection.AssemblyDescription("Aplikasi administrator POLYTA GLOBAL MANDIRI")]
[assembly: System.Reflection.AssemblyProduct("POLYTA GLOBAL MANDIRI Administrator")]
#else
[assembly: System.Reflection.AssemblyTitle("POLYTA GLOBAL MANDIRI Portal")]
[assembly: System.Reflection.AssemblyDescription("Aplikasi portal internal POLYTA GLOBAL MANDIRI")]
[assembly: System.Reflection.AssemblyProduct("POLYTA GLOBAL MANDIRI Portal")]
#endif
[assembly: System.Reflection.AssemblyCompany("POLYTA GLOBAL MANDIRI")]
[assembly: System.Reflection.AssemblyVersion("2.0.0.0")]
[assembly: System.Reflection.AssemblyFileVersion("2.0.0.0")]

internal static class DesktopApp
{
#if ADMIN
    internal const string AppName = "POLYTA GLOBAL MANDIRI Administrator";
    internal const string PortalUrl = "https://polytaglobalmandiri.github.io/pages/admin/";
    private const string AppUserModelId = "PolytaGlobalMandiri.Administrator";
#else
    internal const string AppName = "POLYTA GLOBAL MANDIRI Portal";
    internal const string PortalUrl = "https://polytaglobalmandiri.github.io/";
    private const string AppUserModelId = "PolytaGlobalMandiri.Portal";
#endif

    [DllImport("shell32.dll", SetLastError = true)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(
        [MarshalAs(UnmanagedType.LPWStr)] string appId);

    [STAThread]
    private static void Main()
    {
        SetCurrentProcessExplicitAppUserModelID(AppUserModelId);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new PortalWindow());
    }
}

internal sealed class PortalWindow : Form
{
    // Sama dengan --pgm-status-canvas terang pada assets/css/status.css.
    private static readonly Color CanvasColor = Color.FromArgb(232, 233, 230);

    private readonly WebView2 webView;
    private Icon applicationIcon;
    private bool showingStatusPage;

    internal PortalWindow()
    {
        Text = DesktopApp.AppName;
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(960, 640);
        BackColor = CanvasColor;

        try
        {
            applicationIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            if (applicationIcon != null)
            {
                Icon = applicationIcon;
            }
        }
        catch
        {
            applicationIcon = null;
        }

        // Tulisan "Memuat aplikasi" yang dulu ada di sini sudah dilepas.
        // Halaman yang dimuat kini menggambar layar pemuatannya sendiri
        // lengkap dengan cincin kemajuan, sehingga dua pemberitahuan yang
        // saling menimpa hanya membuat pembukaan terasa berkedip. Warna
        // dasarnya disamakan dengan kanvas layar pemuatan itu supaya jeda
        // sebelum halaman tampil tidak terlihat sebagai kilatan warna lain.
        webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = CanvasColor
        };

        Controls.Add(webView);
        Shown += OnWindowShown;
    }

    private async void OnWindowShown(object sender, EventArgs eventArgs)
    {
        Shown -= OnWindowShown;

        try
        {
            await webView.EnsureCoreWebView2Async(null);
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;
            webView.NavigationCompleted += OnNavigationCompleted;
            webView.Source = new Uri(DesktopApp.PortalUrl);
            webView.BringToFront();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowRuntimeError();
        }
        catch (Exception exception)
        {
            ShowStatusPage(
                "Aplikasi gagal dijalankan",
                "Portal belum dapat disiapkan pada perangkat ini. Tutup aplikasi, " +
                "lalu buka kembali. Bila berulang, hubungi Tim PPIC.",
                exception.Message);
        }
    }

    private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs eventArgs)
    {
        eventArgs.Handled = true;
        if (!String.IsNullOrWhiteSpace(eventArgs.Uri))
        {
            webView.CoreWebView2.Navigate(eventArgs.Uri);
        }
    }

    private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs eventArgs)
    {
        if (eventArgs.IsSuccess)
        {
            showingStatusPage = false;
            return;
        }

        // Halaman status digambar sendiri lewat NavigateToString. Tanpa
        // penjagaan ini, kegagalan yang dilaporkan atas halaman status itu
        // sendiri akan memasang halaman status lagi tanpa henti.
        if (showingStatusPage)
        {
            return;
        }

        ShowStatusPage(
            "Portal tidak dapat dimuat",
            "Sambungan ke portal POLYTA GLOBAL MANDIRI gagal. Periksa koneksi Internet " +
            "atau Wi-Fi pada perangkat ini, lalu coba lagi.",
            DescribeWebError(eventArgs.WebErrorStatus));
    }

    private static string DescribeWebError(CoreWebView2WebErrorStatus status)
    {
        switch (status)
        {
            case CoreWebView2WebErrorStatus.HostNameNotResolved:
                return "Nama host portal tidak dapat diterjemahkan. Perangkat kemungkinan tidak tersambung ke jaringan.";
            case CoreWebView2WebErrorStatus.ConnectionAborted:
            case CoreWebView2WebErrorStatus.ConnectionReset:
            case CoreWebView2WebErrorStatus.Disconnected:
                return "Sambungan terputus di tengah pemuatan.";
            case CoreWebView2WebErrorStatus.CannotConnect:
                return "Server portal tidak dapat dihubungi.";
            case CoreWebView2WebErrorStatus.Timeout:
                return "Waktu tunggu sambungan habis.";
            case CoreWebView2WebErrorStatus.ServerUnreachable:
                return "Server portal sedang tidak dapat dijangkau.";
            default:
                return "Kode kegagalan: " + status;
        }
    }

    /// <summary>
    /// Menampilkan kegagalan sebagai halaman di dalam jendela aplikasi,
    /// bukan sebagai kotak pesan Windows. Rupanya dibuat sama dengan panel
    /// status pada versi web supaya pengguna melihat bentuk yang sama di
    /// kedua tempat. Seluruh gaya ditulis sebaris karena pada saat halaman
    /// ini dibutuhkan justru tidak ada berkas yang bisa diunduh.
    /// </summary>
    private void ShowStatusPage(string title, string message, string detail)
    {
        if (webView == null || webView.CoreWebView2 == null)
        {
            ShowApplicationError(message);
            return;
        }

        showingStatusPage = true;

        string html = StatusPageTemplate
            .Replace("__JUDUL__", System.Net.WebUtility.HtmlEncode(title))
            .Replace("__PESAN__", System.Net.WebUtility.HtmlEncode(message))
            .Replace("__RINCIAN__", System.Net.WebUtility.HtmlEncode(detail ?? String.Empty))
            .Replace("__ALAMAT__", System.Net.WebUtility.HtmlEncode(DesktopApp.PortalUrl));

        webView.CoreWebView2.NavigateToString(html);
        webView.BringToFront();
    }

    private void ShowRuntimeError()
    {
        // WebView2 belum ada, sehingga tidak ada yang bisa menggambar
        // halaman status. Hanya pada keadaan inilah kotak pesan Windows
        // masih dipakai.
        MessageBox.Show(
            "Komponen Microsoft Edge WebView2 Runtime belum tersedia. Perbarui Microsoft Edge atau pasang WebView2 Runtime, lalu buka kembali aplikasi.",
            DesktopApp.AppName,
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
        Close();
    }

    private void ShowApplicationError(string message)
    {
        MessageBox.Show(
            message,
            DesktopApp.AppName,
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
    }

    private const string StatusPageTemplate = @"<!DOCTYPE html>
<html lang=""id"">
<head>
<meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<meta name=""color-scheme"" content=""light dark"">
<title>POLYTA GLOBAL MANDIRI</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    --canvas-a: #fafafb; --canvas-b: #d9d9df;
    --panel-a: #ffffff; --panel-b: #ececef; --panel-edge: #bfbfc8;
    --ink: #15151a; --ink-soft: #4c4c56; --ink-mute: #7c7c88;
    --accent: #c8102e; --accent-hi: #e63b52; --accent-lo: #8a0b1f;
    --shadow: 0 20px 44px rgba(12,12,18,.28), 0 2px 0 rgba(255,255,255,.7) inset;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --canvas-a: #1b1b1f; --canvas-b: #08080a;
      --panel-a: #26262b; --panel-b: #17171b; --panel-edge: #09090b;
      --ink: #f6f6f8; --ink-soft: #b6b6c0; --ink-mute: #85858f;
      --accent: #ff4757; --accent-hi: #ff8892; --accent-lo: #a3101f;
      --shadow: 0 22px 48px rgba(0,0,0,.62), 0 1px 0 rgba(255,255,255,.07) inset;
    }
  }
  html, body { height: 100%; }
  body {
    display: flex; align-items: center; justify-content: center;
    margin: 0; padding: clamp(16px, 4vw, 40px);
    color: var(--ink);
    background: radial-gradient(circle at 50% 0%, var(--canvas-a), var(--canvas-b));
    font-family: 'Segoe UI', Inter, system-ui, Arial, sans-serif;
  }
  .plate {
    position: relative; width: min(520px, 100%); margin: auto;
    padding: clamp(22px, 5vw, 36px) clamp(20px, 5vw, 38px) clamp(18px, 4vw, 28px);
    border: 1px solid var(--panel-edge); border-radius: 20px;
    background: linear-gradient(180deg, var(--panel-a), var(--panel-b));
    box-shadow: var(--shadow); text-align: center; overflow: hidden;
  }
  .plate::before {
    position: absolute; inset: 0; content: ''; pointer-events: none;
    background: linear-gradient(122deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,.05) 32%, transparent 55%);
  }
  @media (prefers-color-scheme: dark) {
    .plate::before { background: linear-gradient(122deg, rgba(255,255,255,.08) 0%, transparent 48%); }
  }
  .plate > * { position: relative; }
  .mark {
    display: grid; place-items: center; width: 62px; height: 62px;
    margin: 0 auto 15px; padding: 8px;
    border: 1px solid var(--panel-edge); border-radius: 16px;
    background: linear-gradient(145deg, #f8f8fa, #c8c8d1 55%, #9a9aa7);
    box-shadow: inset 0 1px 0 #fff, 0 3px 8px rgba(12,12,18,.22);
  }
  .mark svg { width: 100%; height: 100%; }
  .eyebrow {
    margin: 0 0 6px; color: var(--ink-mute); font-size: .62rem;
    font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  }
  h1 { margin: 0 0 10px; font-size: clamp(1.12rem, 1rem + 1vw, 1.42rem); font-weight: 800; line-height: 1.25; }
  p.message { margin: 0; color: var(--ink-soft); font-size: clamp(.82rem, .78rem + .2vw, .9rem); line-height: 1.65; }
  .detail {
    margin: 14px 0 0; padding: 9px 12px; border-radius: 10px;
    color: var(--ink-mute); background: rgba(127,127,140,.12);
    font-family: Consolas, 'Cascadia Mono', monospace; font-size: .7rem;
    line-height: 1.55; text-align: left; word-break: break-word;
  }
  .detail:empty { display: none; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 9px; margin-top: 20px; }
  .button {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 40px; padding: 10px 18px;
    border: 1px solid var(--panel-edge); border-radius: 10px;
    color: var(--ink); background: linear-gradient(180deg, var(--panel-a), var(--panel-b));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 2px 4px rgba(12,12,18,.16);
    font: inherit; font-size: .76rem; font-weight: 700; cursor: pointer;
  }
  .button:active { transform: translateY(1px); }
  .button.is-primary {
    border-color: var(--accent-lo); color: #fff;
    background: linear-gradient(180deg, var(--accent-hi), var(--accent) 55%, var(--accent-lo));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 2px 5px rgba(140,15,28,.35);
  }
  .foot { margin: 18px 0 0; color: var(--ink-mute); font-size: .6rem; letter-spacing: .07em; }
  .foot strong { color: var(--ink-soft); font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
  @media (max-width: 380px) {
    .actions { flex-direction: column; align-items: stretch; }
    .button { width: 100%; }
  }
</style>
</head>
<body>
  <div class=""plate"" role=""alert"">
    <div class=""mark"" aria-hidden=""true"">
      <svg viewBox=""0 0 120 120"" focusable=""false"">
        <path d=""M14 12h50v43h42v53h-8V63H64v45H14V55h42V20H14z"" fill=""#111216""/>
        <rect x=""15"" y=""22"" width=""41"" height=""12"" rx=""6"" fill=""#4563b3""/>
        <rect x=""22"" y=""63"" width=""34"" height=""37"" fill=""#ef2631""/>
        <rect x=""84"" y=""64"" width=""11"" height=""44"" rx=""5.5"" fill=""#40b84e""/>
      </svg>
    </div>
    <p class=""eyebrow"">POLYTA GLOBAL MANDIRI</p>
    <h1>__JUDUL__</h1>
    <p class=""message"">__PESAN__</p>
    <p class=""detail"">__RINCIAN__</p>
    <div class=""actions"">
      <button type=""button"" class=""button is-primary"" id=""retryButton"">Coba lagi</button>
    </div>
    <p class=""foot"">Dikembangkan dan dikelola oleh: <strong>Team POLYTA GLOBAL MANDIRI</strong></p>
  </div>
<script>
  document.getElementById('retryButton').addEventListener('click', function () {
    window.location.replace('__ALAMAT__');
  });
</script>
</body>
</html>";

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (webView != null)
            {
                webView.Dispose();
            }
            if (applicationIcon != null)
            {
                applicationIcon.Dispose();
                applicationIcon = null;
            }
        }
        base.Dispose(disposing);
    }
}
