using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Management;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.ServiceProcess;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Text.RegularExpressions;

namespace Newoteg.PrinterSetup
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }

    internal sealed class SetupForm : Form
    {
        private const string EpsonUrl = "https://ftp.epson.com/drivers/pos/APD_513_T20II_EWM.zip";
        private const long EpsonZipSize = 74179097L;
        private const string EpsonZipSha256 = "CA8210C76CA8E8A5AF5F123578DD6962AFA4F3FF86F47234992882A94D747619";
        private const string EpsonUsbId = "VID_04B8&PID_0E15";
        private const string ReturnUrl = "https://admin.newoteg.com/settings?printerSetup=complete";

        private readonly Label statusLabel;
        private readonly Label detailLabel;
        private readonly ProgressBar progressBar;
        private readonly Button installButton;
        private readonly string cacheDirectory;
        private readonly string logPath;

        public SetupForm()
        {
            cacheDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Newoteg",
                "PrinterSetup");
            logPath = Path.Combine(cacheDirectory, "setup.log");

            Text = "Newoteg — Installation Epson TM-T20II";
            ClientSize = new Size(670, 490);
            MinimumSize = new Size(620, 480);
            StartPosition = FormStartPosition.CenterScreen;
            Font = new Font("Segoe UI", 9.5f);
            BackColor = Color.FromArgb(248, 250, 252);
            Icon = SystemIcons.Application;

            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 112,
                BackColor = Color.FromArgb(28, 25, 163),
                Padding = new Padding(32, 24, 32, 20)
            };
            var title = new Label
            {
                AutoSize = true,
                ForeColor = Color.White,
                Font = new Font("Segoe UI Semibold", 18f),
                Text = "Préparer l’imprimante de la caisse",
                Location = new Point(28, 22)
            };
            var subtitle = new Label
            {
                AutoSize = true,
                ForeColor = Color.FromArgb(224, 231, 255),
                Font = new Font("Segoe UI", 10f),
                Text = "Assistant sécurisé pour Epson TM-T20II (M267D) — connexion USB",
                Location = new Point(30, 62)
            };
            header.Controls.Add(title);
            header.Controls.Add(subtitle);

            var body = new Panel { Dock = DockStyle.Fill, Padding = new Padding(32, 24, 32, 24) };

            statusLabel = new Label
            {
                AutoSize = false,
                Height = 29,
                Dock = DockStyle.Top,
                Font = new Font("Segoe UI Semibold", 12f),
                ForeColor = Color.FromArgb(15, 23, 42),
                Text = "Tout est prêt pour commencer."
            };
            detailLabel = new Label
            {
                AutoSize = false,
                Height = 70,
                Dock = DockStyle.Top,
                ForeColor = Color.FromArgb(71, 85, 105),
                Text = "L’assistant vérifie le câble USB, télécharge uniquement le pilote officiel Epson et contrôle automatiquement sa création dans Windows."
            };
            progressBar = new ProgressBar
            {
                Dock = DockStyle.Top,
                Height = 11,
                Style = ProgressBarStyle.Continuous,
                Maximum = 100
            };

            var steps = new Label
            {
                AutoSize = false,
                Dock = DockStyle.Top,
                Height = 116,
                Padding = new Padding(0, 20, 0, 0),
                ForeColor = Color.FromArgb(51, 65, 85),
                Text = "1   Vérification de l’Epson branchée en USB\r\n\r\n2   Téléchargement et contrôle du pilote officiel Epson\r\n\r\n3   Installation USB, puis vérification automatique dans Newoteg"
            };

            var notice = new Label
            {
                AutoSize = false,
                Dock = DockStyle.Top,
                Height = 54,
                Padding = new Padding(12, 10, 12, 8),
                BackColor = Color.FromArgb(238, 242, 255),
                ForeColor = Color.FromArgb(49, 46, 129),
                Text = "À l’étape Epson, conservez le modèle TM-T20II et choisissez le port USB. Aucun mot de passe n’est enregistré par Newoteg."
            };

            installButton = new Button
            {
                AutoSize = false,
                Width = 230,
                Height = 44,
                Text = "Installer le pilote Epson",
                BackColor = Color.FromArgb(28, 25, 163),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI Semibold", 10f),
                Cursor = Cursors.Hand,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right,
                Location = new Point(374, 319)
            };
            installButton.FlatAppearance.BorderSize = 0;
            installButton.Click += InstallButtonClick;

            body.Controls.Add(installButton);
            body.Controls.Add(notice);
            body.Controls.Add(steps);
            body.Controls.Add(progressBar);
            body.Controls.Add(detailLabel);
            body.Controls.Add(statusLabel);
            Controls.Add(body);
            Controls.Add(header);
        }

        private async void InstallButtonClick(object sender, EventArgs e)
        {
            installButton.Enabled = false;
            try
            {
                await Task.Run((Action)Install);
            }
            catch (Exception ex)
            {
                Log("ERREUR: " + ex);
                SetStatus(
                    "L’installation n’est pas terminée.",
                    ex.Message + "\r\nLe détail technique se trouve dans : " + logPath,
                    0);
                Invoke((Action)(() => installButton.Text = "Réessayer"));
            }
            finally
            {
                Invoke((Action)(() => installButton.Enabled = true));
            }
        }

        private void Install()
        {
            Directory.CreateDirectory(cacheDirectory);
            Log("--- Démarrage de l'assistant " + DateTime.Now.ToString("s") + " ---");
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            SetStatus("Vérification de Windows…", "Recherche du pilote, du port USB et d’une vraie file Epson.", 3);
            EnsureSpoolerIsRunning();
            RunRepairScript();

            var installedPrinter = FindInstalledPrinter();
            if (!String.IsNullOrEmpty(installedPrinter))
            {
                Complete(installedPrinter);
                return;
            }

            if (!IsSupportedUsbPrinterConnected())
            {
                throw new InvalidOperationException(
                    "L’Epson TM-T20II n’est pas détectée en USB. Allumez-la, rebranchez le câble USB directement au PC, puis cliquez sur Réessayer.");
            }

            SetStatus("Epson TM-T20II reconnue en USB.", "Téléchargement du pilote officiel Epson APD 5.13…", 7);
            var zipPath = Path.Combine(cacheDirectory, "APD_513_T20II_EWM.zip");
            DownloadAndVerify(zipPath);

            SetStatus("Pilote officiel vérifié.", "Préparation de l’assistant d’installation Epson…", 82);
            var extractDirectory = Path.Combine(cacheDirectory, "APD_513_T20II");
            if (Directory.Exists(extractDirectory)) Directory.Delete(extractDirectory, true);
            ZipFile.ExtractToDirectory(zipPath, extractDirectory);

            var setupPath = Path.Combine(extractDirectory, "APD_513_T20II.exe");
            if (!File.Exists(setupPath)) throw new InvalidDataException("Le programme d’installation Epson est absent de l’archive officielle.");
            VerifyEpsonSignature(setupPath);

            SetStatus(
                "L’assistant officiel Epson va s’ouvrir.",
                "Dans Epson : acceptez la licence, gardez TM-T20II, choisissez USB puis terminez l’installation.",
                88);
            var process = Process.Start(new ProcessStartInfo
            {
                FileName = setupPath,
                WorkingDirectory = extractDirectory,
                UseShellExecute = true
            });
            if (process == null) throw new InvalidOperationException("Windows n’a pas pu lancer l’assistant officiel Epson.");
            process.WaitForExit();
            Log("Programme Epson terminé avec le code " + process.ExitCode + ".");

            SetStatus("Réparation automatique de la file…", "Association du pilote Epson au port USB réel ; les files Coupon Generator sont ignorées.", 93);
            installedPrinter = WaitForPrinter(TimeSpan.FromMinutes(3));
            if (String.IsNullOrEmpty(installedPrinter))
            {
                throw new InvalidOperationException(
                    "Le pilote Epson est présent, mais Windows n’a pas pu créer une vraie file TM-T20II sur le port USB. Consultez le journal puis relancez l’assistant.");
            }

            Complete(installedPrinter);
        }

        private void EnsureSpoolerIsRunning()
        {
            using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Service WHERE Name='Spooler'"))
            {
                foreach (ManagementObject service in searcher.Get())
                {
                    service.InvokeMethod("ChangeStartMode", new object[] { "Automatic" });
                }
            }

            using (var spooler = new ServiceController("Spooler"))
            {
                if (spooler.Status != ServiceControllerStatus.Running)
                {
                    spooler.Start();
                    spooler.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));
                }
            }
            Log("Spouleur Windows actif et automatique.");
        }

        private bool IsSupportedUsbPrinterConnected()
        {
            using (var searcher = new ManagementObjectSearcher("SELECT DeviceID, Name FROM Win32_PnPEntity"))
            {
                foreach (ManagementObject device in searcher.Get())
                {
                    var id = Convert.ToString(device["DeviceID"]);
                    if (!String.IsNullOrEmpty(id) && id.IndexOf(EpsonUsbId, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        Log("Périphérique USB trouvé: " + id);
                        return true;
                    }
                }
            }
            return false;
        }

        private int RunRepairScript()
        {
            var scriptPath = Path.Combine(cacheDirectory, "Repair-NewotegEpsonPrinter.ps1");
            using (var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("Newoteg.RepairPrinter.ps1"))
            {
                if (resource == null) throw new InvalidDataException("Le module de réparation Epson est absent de l’assistant Newoteg.");
                using (var output = new FileStream(scriptPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    resource.CopyTo(output);
                }
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = Path.Combine(Environment.SystemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe"),
                Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + scriptPath + "\" -NoElevation -Json",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var process = Process.Start(startInfo))
            {
                if (process == null) throw new InvalidOperationException("Le module de réparation Epson n’a pas pu démarrer.");
                var standardOutput = process.StandardOutput.ReadToEnd();
                var standardError = process.StandardError.ReadToEnd();
                if (!process.WaitForExit(90000))
                {
                    try { process.Kill(); } catch { }
                    Log("Réparation Epson interrompue après 90 secondes.");
                    return 21;
                }
                Log("Réparation Epson (code " + process.ExitCode + "): " + standardOutput.Trim());
                if (!String.IsNullOrWhiteSpace(standardError)) Log("Réparation Epson stderr: " + standardError.Trim());
                return process.ExitCode;
            }
        }

        private string FindInstalledPrinter()
        {
            using (var searcher = new ManagementObjectSearcher("SELECT Name, DriverName, PortName FROM Win32_Printer"))
            {
                foreach (ManagementObject printer in searcher.Get())
                {
                    var name = Convert.ToString(printer["Name"]);
                    var driver = Convert.ToString(printer["DriverName"]);
                    var port = Convert.ToString(printer["PortName"]);
                    var identity = (name + " " + driver).ToUpperInvariant();
                    var validDriver = Regex.IsMatch(driver, "^EPSON TM-T20II\\s+Receipt\\d*$", RegexOptions.IgnoreCase);
                    var validPort = Regex.IsMatch(port, "^(ESDPRT|USB)\\d+$", RegexOptions.IgnoreCase);
                    var invalidQueue = identity.Contains("COUPON GENERATOR") || identity.Contains("CGENERATOR") || String.Equals(port, "nul:", StringComparison.OrdinalIgnoreCase);
                    if (validDriver && validPort && !invalidQueue)
                    {
                        Log("Vraie file d'impression trouvée: " + name + " / " + driver + " / " + port);
                        return name;
                    }
                    if (identity.Contains("EPSON") && (identity.Contains("TM-T20II") || identity.Contains("TM-T20")))
                        Log("File Epson ignorée car non physique: " + name + " / " + driver + " / " + port);
                }
            }
            return null;
        }

        private string WaitForPrinter(TimeSpan timeout)
        {
            var deadline = DateTime.UtcNow.Add(timeout);
            var attempt = 0;
            while (DateTime.UtcNow < deadline)
            {
                var printer = FindInstalledPrinter();
                if (!String.IsNullOrEmpty(printer)) return printer;
                if (attempt++ % 3 == 0) RunRepairScript();
                Thread.Sleep(4000);
            }
            return null;
        }

        private void DownloadAndVerify(string destination)
        {
            if (File.Exists(destination) && new FileInfo(destination).Length == EpsonZipSize)
            {
                SetStatus("Téléchargement déjà disponible.", "Contrôle de l’intégrité du pilote officiel Epson…", 78);
                if (ComputeSha256(destination) == EpsonZipSha256) return;
                File.Delete(destination);
            }

            for (var attempt = 1; attempt <= 5; attempt++)
            {
                try
                {
                    DownloadWithResume(destination);
                    if (new FileInfo(destination).Length != EpsonZipSize)
                    {
                        throw new InvalidDataException("Le téléchargement Epson est incomplet.");
                    }
                    SetStatus("Téléchargement terminé.", "Contrôle de l’intégrité SHA-256 du fichier Epson…", 78);
                    if (ComputeSha256(destination) != EpsonZipSha256)
                    {
                        File.Delete(destination);
                        throw new InvalidDataException("Le contrôle de sécurité du fichier Epson a échoué.");
                    }
                    Log("Archive Epson téléchargée et SHA-256 validé.");
                    return;
                }
                catch (Exception ex)
                {
                    Log("Tentative de téléchargement " + attempt + " échouée: " + ex.Message);
                    if (attempt == 5) throw new InvalidOperationException(
                        "Le pilote Epson n’a pas pu être téléchargé après plusieurs essais. Vérifiez Internet puis cliquez sur Réessayer.", ex);
                    Thread.Sleep(1500 * attempt);
                }
            }
        }

        private void DownloadWithResume(string destination)
        {
            var existing = File.Exists(destination) ? new FileInfo(destination).Length : 0L;
            if (existing > EpsonZipSize)
            {
                File.Delete(destination);
                existing = 0;
            }

            var request = (HttpWebRequest)WebRequest.Create(EpsonUrl);
            request.UserAgent = "Newoteg-Printer-Setup/1.0";
            request.Timeout = 60000;
            request.ReadWriteTimeout = 60000;
            request.KeepAlive = true;
            if (existing > 0) request.AddRange(existing);

            using (var response = (HttpWebResponse)request.GetResponse())
            {
                var append = existing > 0 && response.StatusCode == HttpStatusCode.PartialContent;
                if (!append) existing = 0;
                using (var input = response.GetResponseStream())
                using (var output = new FileStream(destination, append ? FileMode.Append : FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    var buffer = new byte[1024 * 128];
                    int read;
                    long total = existing;
                    while (input != null && (read = input.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        output.Write(buffer, 0, read);
                        total += read;
                        var percent = Math.Max(8, Math.Min(75, 8 + (int)(67L * total / EpsonZipSize)));
                        SetStatus(
                            "Téléchargement du pilote officiel Epson…",
                            String.Format("{0:0.0} Mo sur {1:0.0} Mo", total / 1048576d, EpsonZipSize / 1048576d),
                            percent);
                    }
                }
            }
        }

        private static string ComputeSha256(string path)
        {
            using (var stream = File.OpenRead(path))
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", String.Empty);
            }
        }

        private void VerifyEpsonSignature(string setupPath)
        {
            try
            {
                var certificate = new X509Certificate2(X509Certificate.CreateFromSignedFile(setupPath));
                if (certificate.Subject.IndexOf("Seiko Epson", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    throw new InvalidDataException("La signature du programme n’appartient pas à Seiko Epson Corporation.");
                }
                Log("Signature Epson trouvée: " + certificate.Subject);
            }
            catch (CryptographicException ex)
            {
                throw new InvalidDataException("La signature numérique du programme Epson est absente ou invalide.", ex);
            }
        }

        private void Complete(string printerName)
        {
            SetStatus(
                "Imprimante prête pour Newoteg.",
                "Windows a créé « " + printerName + " ». Retour automatique aux paramètres d’impression…",
                100);
            Log("Installation terminée: " + printerName);
            Thread.Sleep(1200);
            Process.Start(new ProcessStartInfo { FileName = ReturnUrl, UseShellExecute = true });
            Invoke((Action)(() =>
            {
                installButton.Text = "Terminé — fermer";
                installButton.Click -= InstallButtonClick;
                installButton.Click += delegate { Close(); };
            }));
        }

        private void SetStatus(string title, string detail, int progress)
        {
            if (InvokeRequired)
            {
                Invoke((Action)(() => SetStatus(title, detail, progress)));
                return;
            }
            statusLabel.Text = title;
            detailLabel.Text = detail;
            progressBar.Value = Math.Max(0, Math.Min(100, progress));
        }

        private void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(cacheDirectory);
                File.AppendAllText(logPath, DateTime.Now.ToString("s") + " " + message + Environment.NewLine);
            }
            catch
            {
                // La journalisation ne doit jamais bloquer l'installation.
            }
        }
    }
}
