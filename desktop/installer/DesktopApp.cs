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
    private readonly WebView2 webView;
    private readonly Label loadingLabel;
    private Icon applicationIcon;

    internal PortalWindow()
    {
        Text = DesktopApp.AppName;
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(960, 640);
        BackColor = Color.FromArgb(245, 245, 243);

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

        webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(245, 245, 243)
        };

        loadingLabel = new Label
        {
            AutoSize = false,
            Dock = DockStyle.Fill,
            Text = "Memuat aplikasi POLYTA GLOBAL MANDIRI...",
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 12F, FontStyle.Regular),
            ForeColor = Color.FromArgb(55, 58, 62),
            BackColor = Color.FromArgb(245, 245, 243)
        };

        Controls.Add(webView);
        Controls.Add(loadingLabel);
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
            ShowApplicationError(exception.Message);
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
        loadingLabel.Visible = false;
        if (!eventArgs.IsSuccess)
        {
            ShowApplicationError("Portal tidak dapat dimuat. Periksa koneksi Internet, lalu buka kembali aplikasi.");
        }
    }

    private void ShowRuntimeError()
    {
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

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (webView != null)
            {
                webView.Dispose();
            }
            if (loadingLabel != null)
            {
                loadingLabel.Dispose();
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
