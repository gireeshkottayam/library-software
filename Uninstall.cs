using System;
using System.IO;
using System.Windows.Forms;
using System.Diagnostics;
using Microsoft.Win32;
using System.Drawing;
using System.Reflection;
using System.Runtime.InteropServices;

[assembly: AssemblyTitle("Public Library Kooroppada Uninstaller")]
[assembly: AssemblyDescription("Clean Uninstaller for KPL Library Software")]
[assembly: AssemblyCompany("Public Library Kooroppada")]
[assembly: AssemblyProduct("Library Management Suite")]
[assembly: AssemblyCopyright("Copyright © 2026")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

public class KPLUninstaller : Form {
    [STAThread]
    public static void Main() {
        Application.EnableVisualStyles();
        
        DialogResult confirm = MessageBox.Show(
            "Are you sure you want to completely wipe out Public Library Kooroppada from this PC?", 
            "Professional Uninstall", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            
        if (confirm != DialogResult.Yes) return;

        string installDir = @"C:\Kooroppada_Library";
        
        // 1. Interactive Backup Location Logic
        DialogResult backup = MessageBox.Show(
            "CRITICAL: Would you like to backup your Library Database before the wipeout?", 
            "Database Backup", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

        if (backup == DialogResult.Yes) {
            try {
                // Find the database
                string[] possiblePaths = {
                    Path.Combine(installDir, "resources", "db", "library.db"),
                    Path.Combine(installDir, "db", "library.db"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "kooroppada-library", "db", "library.db"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "kooroppada-library", "library.db")
                };
                string foundDb = "";
                foreach(string p in possiblePaths) { if (File.Exists(p)) { foundDb = p; break; } }

                if (!string.IsNullOrEmpty(foundDb)) {
                    using (FolderBrowserDialog fbd = new FolderBrowserDialog()) {
                        fbd.Description = "Select the folder where you want to save your Library Database backup:";
                        if (fbd.ShowDialog() == DialogResult.OK) {
                            string backupFile = Path.Combine(fbd.SelectedPath, "KOOROPPADA_DB_BACKUP_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".db");
                            File.Copy(foundDb, backupFile, true);
                            MessageBox.Show("✅ Backup Saved Successfully!\nLocation: " + backupFile, "Safety Verified");
                        } else {
                            MessageBox.Show("Backup cancelled. Proceeding with wipeout.");
                        }
                    }
                } else {
                    MessageBox.Show("ℹ️ No active database found to backup. Proceeding with wipeout.", "Info");
                }
            } catch (Exception ex) {
                MessageBox.Show("⚠️ Backup Error: " + ex.Message + "\n\nPlease copy library.db manually before proceeding.");
                return;
            }
        }

        // 2. Complete PC Wipeout
        try {
            foreach (var process in Process.GetProcessesByName("Public Library Kooroppada")) {
                try { process.Kill(); process.WaitForExit(2000); } catch {}
            }

            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string shortcut = Path.Combine(desktopPath, "Kooroppada Library.lnk");
            if (File.Exists(shortcut)) File.Delete(shortcut);

            string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Public Library Kooroppada");
            if (Directory.Exists(startMenu)) Directory.Delete(startMenu, true);

            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\KooroppadaLibrary", false);
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\KooroppadaLibrary", false);

            string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "kooroppada-library");
            if (Directory.Exists(appData)) Directory.Delete(appData, true);

            string batchPath = Path.Combine(Path.GetTempPath(), "kpl_wipeout.bat");
            string script = "@echo off\n" +
                           "timeout /t 2 /nobreak > nul\n" +
                           ":retry\n" +
                           "rmdir /s /q \"" + installDir + "\"\n" +
                           "if exist \"" + installDir + "\" goto retry\n" +
                           "del \"%~f0\"";
            File.WriteAllText(batchPath, script);
            
            ProcessStartInfo psi = new ProcessStartInfo(batchPath);
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            Process.Start(psi);
            
            MessageBox.Show("✅ WIPE OUT COMPLETE!\n\nThe software has been totally removed from this PC.", "Uninstall Success");
            Application.Exit();
        } catch (Exception ex) {
            MessageBox.Show("Error during complete wipeout: " + ex.Message);
        }
    }
}
