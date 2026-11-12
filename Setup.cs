using System;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;
using Microsoft.Win32;
using System.Reflection;
using System.Runtime.InteropServices;

[assembly: AssemblyTitle("Public Library Kooroppada Setup")]
[assembly: AssemblyDescription("Professional Installer for KPL Library Software")]
[assembly: AssemblyCompany("Public Library Kooroppada")]
[assembly: AssemblyProduct("Library Management Suite")]
[assembly: AssemblyCopyright("Copyright © 2026")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

public class KPLInstaller : Form {
    private ProgressBar pb;
    private Label lblStatus;
    private Button btnInstall;

    public KPLInstaller() {
        this.Text = "Public Library Kooroppada - Professional Setup";
        this.Size = new Size(450, 250);
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.White;

        // Load Icon if available in the same folder
        try {
            string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(icoPath)) this.Icon = new Icon(icoPath);
        } catch {}

        Label lblTitle = new Label() { Text = "Public Library Kooroppada", Font = new Font("Segoe UI", 16, FontStyle.Bold), Left = 20, Top = 20, Width = 400 };
        Label lblSub = new Label() { Text = "Library Management System v1.0", Left = 20, Top = 55, Width = 400, ForeColor = Color.Gray };
        
        lblStatus = new Label() { Text = "Ready to install...", Left = 20, Top = 100, Width = 400 };
        pb = new ProgressBar() { Left = 20, Top = 125, Width = 390, Height = 20 };
        
        btnInstall = new Button() { Text = "Install Now", Left = 310, Top = 165, Width = 100, Height = 30, FlatStyle = FlatStyle.System };
        btnInstall.Click += StartInstall;

        this.Controls.Add(lblTitle);
        this.Controls.Add(lblSub);
        this.Controls.Add(lblStatus);
        this.Controls.Add(pb);
        this.Controls.Add(btnInstall);
    }

    private void StartInstall(object sender, EventArgs e) {
        btnInstall.Enabled = false;
        
        // Safety check: ensure software is not running
        try {
            Process[] processes = Process.GetProcessesByName("Public Library Kooroppada");
            if (processes.Length > 0) {
                MessageBox.Show("The library software is currently running. Please close it before installing the update.", "Software Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                btnInstall.Enabled = true;
                lblStatus.Text = "Ready to install...";
                return;
            }
        } catch {}

        lblStatus.Text = "Installing to C:\\Kooroppada_Library...";
        
        string sourceDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data");
        string targetDir = @"C:\Kooroppada_Library";

        if (!Directory.Exists(sourceDir)) {
            MessageBox.Show("Installation data not found in 'Data' folder.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            this.Close();
            return;
        }

        Timer t = new Timer();
        t.Interval = 100;
        int progress = 0;
        t.Tick += (s, ev) => {
            progress += 5;
            if (progress <= 100) pb.Value = progress;
            if (progress == 100) {
                t.Stop();
                CompleteInstallation(sourceDir, targetDir);
            }
        };
        t.Start();
    }

    private void CompleteInstallation(string source, string target) {
        try {
            // Keep database backup in a safe temporary path if legacy database exists
            string[] possibleDbPaths = {
                Path.Combine(target, "resources", "db", "library.db"),
                Path.Combine(target, "db", "library.db")
            };
            string tempDb = Path.Combine(Path.GetTempPath(), "library_upgrade.db");
            bool hasOldDb = false;

            foreach (string p in possibleDbPaths) {
                if (File.Exists(p)) {
                    try {
                        File.Copy(p, tempDb, true);
                        hasOldDb = true;
                        break;
                    } catch {}
                }
            }

            // Perform non-destructive upgrade by overwriting files instead of deleting the directory
            if (!Directory.Exists(target)) {
                Directory.CreateDirectory(target);
            }
            CopyDirectory(source, target);

            // Restore/ensure Database is populated safely
            if (hasOldDb) {
                try {
                    // 1. Restore to AppData persistent location
                    string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "kooroppada-library", "db");
                    Directory.CreateDirectory(appDataDir);
                    // Copy if and only if persistent DB doesn't exist or we want to guarantee the upgrade sync
                    if (!File.Exists(Path.Combine(appDataDir, "library.db"))) {
                        File.Copy(tempDb, Path.Combine(appDataDir, "library.db"), true);
                    }

                    // 2. Restore to resources legacy location (as backup)
                    string oldDbDir = Path.Combine(target, "resources", "db");
                    Directory.CreateDirectory(oldDbDir);
                    File.Copy(tempDb, Path.Combine(oldDbDir, "library.db"), true);

                    File.Delete(tempDb);
                } catch (Exception ex) {
                    MessageBox.Show("Warning restoring database backup: " + ex.Message, "Upgrade Info");
                }
            }

            // Copy Uninstaller
            string uninstallerSrc = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Uninstall.exe");
            if (File.Exists(uninstallerSrc)) File.Copy(uninstallerSrc, Path.Combine(target, "Uninstall.exe"), true);

            CreateShortcut(target);
            RegisterInAddRemove(target);

            MessageBox.Show("✅ Installation Successful!\n\nKooroppada Library is now ready on your Desktop.", "Success");
            Process.Start(Path.Combine(target, "Public Library Kooroppada.exe"));
            Application.Exit();
        } catch (Exception ex) {
            MessageBox.Show("Installation Failed: " + ex.Message);
            btnInstall.Enabled = true;
        }
    }

    private void CopyDirectory(string source, string target) {
        foreach (string dirPath in Directory.GetDirectories(source, "*", SearchOption.AllDirectories)) {
            // Skip database directories in source to avoid overriding user's database path if it already has contents
            string targetDir = dirPath.Replace(source, target);
            if (!Directory.Exists(targetDir)) {
                Directory.CreateDirectory(targetDir);
            }
        }
        foreach (string newPath in Directory.GetFiles(source, "*.*", SearchOption.AllDirectories)) {
            string destPath = newPath.Replace(source, target);
            
            // CRITICAL: NEVER overwrite an existing database with a blank template!
            if (destPath.EndsWith("library.db", StringComparison.OrdinalIgnoreCase) && File.Exists(destPath)) {
                continue; // Skip copying database template if user database exists
            }
            
            try {
                File.Copy(newPath, destPath, true);
            } catch {}
        }
    }


    private void CreateShortcut(string target) {
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        string shortcutPath = Path.Combine(desktop, "Kooroppada Library.lnk");
        string exePath = Path.Combine(target, "Public Library Kooroppada.exe");
        
        string script = "Set WshShell = WScript.CreateObject(\"WScript.Shell\")\n" +
                       "Set shortcut = WshShell.CreateShortcut(\"" + shortcutPath + "\")\n" +
                       "shortcut.TargetPath = \"" + exePath + "\"\n" +
                       "shortcut.WorkingDirectory = \"" + target + "\"\n" +
                       "shortcut.IconLocation = \"" + exePath + ",0\"\n" +
                       "shortcut.Save";
        File.WriteAllText("temp.vbs", script);
        Process.Start("wscript.exe", "temp.vbs").WaitForExit();
        File.Delete("temp.vbs");
    }

    private void RegisterInAddRemove(string target) {
        try {
            string keyName = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\KooroppadaLibrary";
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyName)) {
                key.SetValue("DisplayName", "Public Library Kooroppada");
                key.SetValue("DisplayVersion", "1.0.0");
                key.SetValue("Publisher", "Public Library Kooroppada");
                key.SetValue("DisplayIcon", Path.Combine(target, "Public Library Kooroppada.exe"));
                key.SetValue("InstallLocation", target);
                key.SetValue("UninstallString", Path.Combine(target, "Uninstall.exe"));
                key.SetValue("NoModify", 1);
                key.SetValue("NoRepair", 1);
            }
        } catch {}
    }

    [STAThread]
    public static void Main() {
        Application.EnableVisualStyles();
        Application.Run(new KPLInstaller());
    }
}
