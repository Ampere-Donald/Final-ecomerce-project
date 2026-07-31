# Assistant Epson TM-T20II pour Newoteg

Cet assistant est le bootstrapper téléchargé depuis **Paramètres > Imprimante tickets**. Il ne redistribue pas le pilote Epson : il télécharge l'archive APD 5.13 depuis l'URL officielle Epson, puis valide sa taille, son empreinte SHA-256 et la signature Seiko Epson de l'exécutable extrait.

## Garde-fous

- matériel accepté : Epson USB `VID_04B8&PID_0E15` uniquement ;
- archive attendue : `APD_513_T20II_EWM.zip`, 74 179 097 octets ;
- SHA-256 attendue : `CA8210C76CA8E8A5AF5F123578DD6962AFA4F3FF86F47234992882A94D747619` ;
- cache et journal limités à `%ProgramData%\Newoteg\PrinterSetup` ;
- les files `Coupon Generator`, `CGenerator` et les ports `nul:` sont toujours refusés ;
- si le pilote et le port existent déjà, la vraie file Epson est créée ou réparée automatiquement sans réinstaller le pilote ;
- aucun mot de passe administrateur n'est lu ou enregistré ;
- retour après succès : `https://admin.newoteg.com/settings?printerSetup=complete`.

La première installation Epson reste interactive : le profil silencieux officiel APD doit être généré depuis une machine Epson déjà configurée. L'assistant automatise donc le téléchargement, les contrôles, le spouleur, la détection et la vérification finale, mais laisse Epson afficher sa licence et le choix du port USB.

## Recompiler

Depuis la racine du dépôt, sur Windows :

```powershell
.\scripts\Build-NewotegPrinterSetup.ps1
```

Le résultat est écrit dans `public/downloads/Newoteg-Printer-Setup.exe` et copié tel quel par Vite dans la version de production.

Le module de réparation peut aussi être exécuté seul. Il demande l’élévation Windows si nécessaire, ne supprime aucune file existante et peut être relancé sans créer de doublon :

```powershell
.\scripts\printer-setup\Repair-NewotegEpsonPrinter.ps1
```
