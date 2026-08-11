using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

#if ADMIN
[assembly: AssemblyTitle("POLYTA GLOBAL MANDIRI Administrator Installer")]
[assembly: AssemblyDescription("Installer panel administrator POLYTA GLOBAL MANDIRI")]
[assembly: AssemblyProduct("POLYTA GLOBAL MANDIRI Administrator")]
#else
[assembly: AssemblyTitle("POLYTA GLOBAL MANDIRI Portal Installer")]
[assembly: AssemblyDescription("Installer portal internal POLYTA GLOBAL MANDIRI")]
[assembly: AssemblyProduct("POLYTA GLOBAL MANDIRI Portal")]
#endif
[assembly: AssemblyCompany("POLYTA GLOBAL MANDIRI")]
[assembly: AssemblyVersion("2.0.0.0")]
[assembly: AssemblyFileVersion("2.0.0.0")]

internal static class Installer
{
    private const string Publisher = "POLYTA GLOBAL MANDIRI";
#if ADMIN
    private const string AppName = "POLYTA GLOBAL MANDIRI Administrator";
    private const string PortalUrl = "https://polytaglobalmandiri.github.io/pages/admin/";
    private const string UninstallKeyName = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PolytaGlobalMandiriAdministrator";
    private const string InstallFolderName = "Polyta Global Mandiri Admin";
    private const string InstalledExecutableName = "Polyta Administrator.exe";
    private const string UninstallerExecutableName = "Hapus Polyta Administrator.exe";
    private const string ShortcutDescription = "Buka panel administrator POLYTA GLOBAL MANDIRI";
#else
    private const string AppName = "POLYTA GLOBAL MANDIRI Portal";
    private const string PortalUrl = "https://polytaglobalmandiri.github.io/";
    private const string UninstallKeyName = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PolytaGlobalMandiriPortal";
    private const string InstallFolderName = "Polyta Global Mandiri";
    private const string InstalledExecutableName = "Polyta Portal.exe";
    private const string UninstallerExecutableName = "Hapus Polyta Portal.exe";
    private const string ShortcutDescription = "Buka portal internal POLYTA GLOBAL MANDIRI";
#endif

    private const string AppResourceName = "Polyta.DesktopApp.exe";
    private const string WebViewCoreResourceName = "Polyta.WebView2.Core.dll";
    private const string WebViewWinFormsResourceName = "Polyta.WebView2.WinForms.dll";
    private const string WebViewLoaderX64ResourceName = "Polyta.WebView2Loader.x64.dll";
    private const string WebViewLoaderX86ResourceName = "Polyta.WebView2Loader.x86.dll";

    [STAThread]
    private static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        try
        {
            if (HasArgument(args, "--uninstall"))
            {
                Uninstall();
                return 0;
            }

            string testRoot = GetArgumentValue(args, "--test-root");
            bool testMode = !String.IsNullOrWhiteSpace(testRoot);

            if (!testMode)
            {
                DialogResult confirmation = MessageBox.Show(
                    "Pasang portal pada Desktop dan Start Menu komputer ini?",
                    AppName,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (confirmation != DialogResult.Yes)
                {
                    return 0;
                }
            }

            Install(testRoot, testMode);
            return 0;
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                "Instalasi tidak dapat diselesaikan.\n\n" + exception.Message,
                AppName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void Install(string testRoot, bool testMode)
    {
        string installDirectory;
        string desktopDirectory;
        string startMenuDirectory;

        if (testMode)
        {
            string root = Path.GetFullPath(testRoot);
            installDirectory = Path.Combine(root, "Programs", InstallFolderName);
            desktopDirectory = Path.Combine(root, "Desktop");
            startMenuDirectory = Path.Combine(root, "Start Menu", "Programs", Publisher);
        }
        else
        {
            installDirectory = GetInstallDirectory();
            desktopDirectory = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            startMenuDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
                "Programs",
                Publisher);
        }

        Directory.CreateDirectory(installDirectory);
        Directory.CreateDirectory(desktopDirectory);
        Directory.CreateDirectory(startMenuDirectory);

        string installedExecutable = Path.Combine(installDirectory, InstalledExecutableName);
        string uninstallerExecutable = Path.Combine(installDirectory, UninstallerExecutableName);
        string currentExecutable = Assembly.GetExecutingAssembly().Location;
        ExtractEmbeddedResource(AppResourceName, installedExecutable);
        ExtractEmbeddedResource(
            WebViewCoreResourceName,
            Path.Combine(installDirectory, "Microsoft.Web.WebView2.Core.dll"));
        ExtractEmbeddedResource(
            WebViewWinFormsResourceName,
            Path.Combine(installDirectory, "Microsoft.Web.WebView2.WinForms.dll"));
        ExtractEmbeddedResource(
            Environment.Is64BitOperatingSystem
                ? WebViewLoaderX64ResourceName
                : WebViewLoaderX86ResourceName,
            Path.Combine(installDirectory, "WebView2Loader.dll"));

        if (!String.Equals(currentExecutable, uninstallerExecutable, StringComparison.OrdinalIgnoreCase))
        {
            File.Copy(currentExecutable, uninstallerExecutable, true);
        }

        // Pintasan menargetkan aplikasi desktop POLYTA yang menjadi pemilik
        // jendela WebView2. Ikon bilah tugas karena itu tidak lagi diwarisi
        // dari Edge atau browser bawaan Windows.
        ShortcutTarget target = new ShortcutTarget(installedExecutable, "");
        string desktopShortcut = Path.Combine(desktopDirectory, AppName + ".lnk");
        string startMenuShortcut = Path.Combine(startMenuDirectory, AppName + ".lnk");
        CreateShortcut(desktopShortcut, target, installDirectory, installedExecutable);
        CreateShortcut(startMenuShortcut, target, installDirectory, installedExecutable);

        if (!testMode)
        {
            RegisterUninstaller(uninstallerExecutable, installedExecutable);
            MessageBox.Show(
                AppName + " berhasil dipasang. Pintasan tersedia di Desktop dan Start Menu.",
                AppName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            Process.Start(new ProcessStartInfo(installedExecutable) { UseShellExecute = true });
        }
    }

    private static void ExtractEmbeddedResource(string resourceName, string destination)
    {
        using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
        {
            if (input == null)
            {
                throw new InvalidOperationException("Komponen installer tidak lengkap: " + resourceName);
            }

            using (FileStream output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                input.CopyTo(output);
            }
        }
    }

    private static void Uninstall()
    {
        DialogResult confirmation = MessageBox.Show(
            "Hapus portal dan seluruh pintasannya dari komputer ini?",
            "Hapus " + AppName,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (confirmation != DialogResult.Yes)
        {
            return;
        }

        string installDirectory = GetInstallDirectory();
        string expectedDirectory = Path.GetFullPath(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            InstallFolderName));

        if (!String.Equals(Path.GetFullPath(installDirectory), expectedDirectory, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Lokasi instalasi tidak aman untuk dihapus.");
        }

        string desktopShortcut = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
            AppName + ".lnk");
        string startMenuDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
            "Programs",
            Publisher);

        DeleteFileIfPresent(desktopShortcut);
        string startMenuShortcut = Path.Combine(startMenuDirectory, AppName + ".lnk");
        DeleteFileIfPresent(startMenuShortcut);
        if (Directory.Exists(startMenuDirectory) && Directory.GetFileSystemEntries(startMenuDirectory).Length == 0)
        {
            Directory.Delete(startMenuDirectory);
        }

        Registry.CurrentUser.DeleteSubKeyTree(UninstallKeyName, false);

        string escapedDirectory = installDirectory.Replace("'", "''");
        string cleanupCommand = "Start-Sleep -Milliseconds 900; Remove-Item -LiteralPath '" +
            escapedDirectory + "' -Recurse -Force -ErrorAction SilentlyContinue";
        Process.Start(new ProcessStartInfo("powershell.exe")
        {
            Arguments = "-NoProfile -WindowStyle Hidden -Command \"" + cleanupCommand + "\"",
            UseShellExecute = false,
            CreateNoWindow = true
        });

        MessageBox.Show(
            AppName + " telah dihapus dari komputer ini.",
            "Uninstall selesai",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static void CreateShortcut(string path, ShortcutTarget target, string workingDirectory, string iconExecutable)
    {
        Type shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null)
        {
            throw new InvalidOperationException("Windows Script Host tidak tersedia.");
        }

        object shellObject = Activator.CreateInstance(shellType);
        try
        {
            dynamic shell = shellObject;
            dynamic shortcut = shell.CreateShortcut(path);
            shortcut.TargetPath = target.Executable;
            shortcut.Arguments = target.Arguments;
            shortcut.WorkingDirectory = workingDirectory;
            shortcut.IconLocation = iconExecutable + ",0";
            shortcut.Description = ShortcutDescription;
            shortcut.Save();
            Marshal.FinalReleaseComObject(shortcut);
        }
        finally
        {
            Marshal.FinalReleaseComObject(shellObject);
        }
    }

    private static void RegisterUninstaller(string uninstallerExecutable, string installedExecutable)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(UninstallKeyName))
        {
            if (key == null)
            {
                throw new InvalidOperationException("Entri uninstaller tidak dapat dibuat.");
            }

            key.SetValue("DisplayName", AppName);
            key.SetValue("DisplayVersion", "2.0.0");
            key.SetValue("Publisher", Publisher);
            key.SetValue("DisplayIcon", installedExecutable);
            key.SetValue("UninstallString", "\"" + uninstallerExecutable + "\" --uninstall");
            key.SetValue("URLInfoAbout", PortalUrl);
            key.SetValue("NoModify", 1, RegistryValueKind.DWord);
            key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
    }

    private static string GetInstallDirectory()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            InstallFolderName);
    }

    private static bool HasArgument(string[] args, string expected)
    {
        foreach (string argument in args)
        {
            if (String.Equals(argument, expected, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static string GetArgumentValue(string[] args, string expected)
    {
        for (int index = 0; index < args.Length - 1; index++)
        {
            if (String.Equals(args[index], expected, StringComparison.OrdinalIgnoreCase))
            {
                return args[index + 1];
            }
        }
        return null;
    }

    private static void DeleteFileIfPresent(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private sealed class ShortcutTarget
    {
        internal ShortcutTarget(string executable, string arguments)
        {
            Executable = executable;
            Arguments = arguments;
        }

        internal string Executable { get; private set; }
        internal string Arguments { get; private set; }
    }
}
