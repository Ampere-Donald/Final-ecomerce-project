# Installation de l’impression Epson depuis Android

## Architecture retenue

L’Epson TM-T20II reste branchée en USB au PC de la boutique. QZ Tray, installé sur ce PC, sert de pont d’impression sécurisé. L’application Android envoie les commandes ESC/POS 58 mm au PC par le réseau local.

Cette architecture évite un pilote USB spécifique sur chaque téléphone. Le PC doit être allumé, QZ Tray actif et le téléphone connecté au même réseau local.

## 1. Préparer le PC boutique

1. Installer le pilote Windows **Epson Advanced Printer Driver (APD)** compatible TM-T20II.
2. Installer physiquement le guide papier 58 mm et régler la largeur 58 mm dans la mémoire de l’imprimante, puis vérifier une impression Windows. Epson précise que le retour à 80 mm n’est plus recommandé après utilisation en 58 mm : [guide technique officiel TM-T20II](https://download4.epson.biz/sec_pubs/bs/pdf/TM-T20II_trg_en_revG.pdf).
3. Installer QZ Tray 2.2 ou plus récent ; cette version se lance normalement à l’ouverture de session Windows.
4. Attribuer au PC une adresse IP locale fixe ou une réservation DHCP, par exemple `192.168.1.20`.
5. Régénérer le certificat QZ avec **exactement** cette IP ou ce nom DNS, puis relancer QZ Tray.
6. Autoriser uniquement le port sécurisé WSS 8181 dans le pare-feu Windows sur le profil réseau privé.
7. Limiter l’origine autorisée à `https://admin.newoteg.com` lorsque la configuration QZ le permet.

QZ documente l’option de connexion distante `qz.websocket.connect({ host: "192.168.1.2" })`, la génération `certgen --host`, les ports WSS sécurisés et la copie de `root-ca.crt` : [guide officiel Print Server](https://qz.io/docs/print-server), [API WebSocket officielle](https://qz.io/api/qz.websocket), [déploiement QZ](https://qz.io/docs/deployment).

## 2. Installer le certificat sur Android

Le site admin est en HTTPS ; Android doit donc établir une connexion WSS de confiance vers QZ.

1. Dans QZ Tray sur le PC : **Advanced > Troubleshooting/Diagnostics > Browse Shared Folder**.
2. Copier `root-ca.crt` vers le téléphone par un moyen privé.
3. Sur Android, ouvrir les réglages de sécurité et installer ce fichier comme **certificat d’autorité de certification (CA)**. Le libellé exact varie selon la marque du téléphone.
4. Supprimer la copie téléchargée après l’installation.
5. Ne conserver ce certificat que sur les appareils Newoteg autorisés.

L’APK Newoteg déclare explicitement la confiance envers les autorités installées par l’utilisateur, exigée sur Android récent pour ce certificat local, tout en interdisant le trafic HTTP/WS non chiffré. La configuration suit le mécanisme Android officiel `Network Security Configuration` : [documentation Android](https://developer.android.com/privacy-and-security/security-config).

Ne pas utiliser le port WS non chiffré 8182 et ne pas désactiver la vérification TLS dans l’application.

## 3. Configurer l’application

1. Ouvrir **Paramètres > Impression**.
2. Dans **Poste QZ Tray**, saisir l’IP fixe du PC, sans `http://`, sans `wss://` et sans port.
3. Appuyer sur **Enregistrer et tester**.
4. Sélectionner l’Epson TM-T20II si plusieurs imprimantes sont visibles.
5. Imprimer le ticket de diagnostic.

Sur le PC auquel l’imprimante est directement branchée, laisser le champ **Poste QZ Tray** vide.

## 4. Recette

- imprimer cinq tickets courts consécutifs ;
- imprimer un ticket long avec accents et gros montants ;
- vérifier le centrage, les 32 colonnes, la coupe et le papier 58 mm ;
- couper puis rétablir le Wi-Fi du téléphone et relancer un test ;
- redémarrer le PC et vérifier que QZ Tray repart automatiquement ;
- confirmer qu’un échec d’impression ne recrée jamais la vente.

## Diagnostic rapide

| Symptôme | Vérification |
|---|---|
| QZ inaccessible | Même Wi-Fi, bonne IP, PC allumé, QZ actif |
| Erreur de certificat | Certificat QZ installé et approuvé sur Android |
| Aucune imprimante | Pilote Epson, câble USB, alimentation et file Windows |
| Ticket coupé | Profil Epson TM-T20II, 58 mm, 32 colonnes |
| Fonctionne sur PC mais pas Android | Pare-feu privé, port WSS 8181 et origine autorisée |

Un navigateur ou une APK ne peut pas installer silencieusement un pilote Windows : cette opération exige les droits administrateur du poste. Après l’installation initiale du pilote et de QZ Tray, Newoteg détecte et mémorise automatiquement l’imprimante.

## Assistant Windows fourni

Depuis la racine du projet, ouvrir PowerShell **en tant qu’administrateur** puis exécuter, en remplaçant l’IP par la réservation DHCP réelle du PC :

```powershell
.\scripts\Install-NewotegPrintStation.ps1 `
  -EpsonDriverInf "C:\Pilotes\EpsonTM-T20II\driver.inf" `
  -QzInstaller "C:\Installateurs\qz-tray.exe" `
  -SilentQzInstall `
  -QzServerHost "192.168.1.20" `
  -AllowPrivateQzPort
```

Le script installe le `.inf` avec l’outil Windows officiel, installe QZ silencieusement si demandé, génère le certificat pour l’hôte déclaré, lance QZ Tray, démarre le spooler et limite le port 8181 au profil privé et au sous-réseau local. Omettre `-SilentQzInstall` pour voir l’assistant QZ. Omettre les deux options réseau sur un poste qui imprime uniquement en local.

Les fichiers Epson et QZ doivent être obtenus et vérifiés avant l’exécution ; ils ne sont pas intégrés à l’application. Un navigateur ou une APK ne peut pas franchir silencieusement la demande d’administration Windows.

## Recette probante et rapport

Sur le poste boutique, après installation et avec l’Epson branchée, lancer :

```powershell
.\scripts\Invoke-NewotegShopAcceptance.ps1 `
  -ExpectedPrinterName "EPSON TM-T20II Receipt" `
  -QzServerHost "192.168.1.20" `
  -RequireRemotePrint `
  -RunWindowsTestPage
```

Remplacer `EPSON TM-T20II Receipt` par le nom exact affiché par le premier script. La recette contrôle automatiquement le spooler, le pilote, la file, QZ, le démarrage déclaré, le réseau privé, le pare-feu, WSS 8181 et le certificat. Elle demande ensuite une confirmation explicite pour les observations physiques, le lecteur, le mode hors ligne, les rôles et l’affichage mobile, puis exige la durée chronométrée d’une vente standard. Elle produit un rapport Markdown et JSON dans `Documents\Newoteg-Recette` et renvoie un code non nul tant qu’un contrôle échoue ou reste non exécuté.

Ne jamais éditer manuellement ce rapport pour transformer un échec en réussite. Après un changement d’IP du PC, régénérer le certificat, le réinstaller sur Android et refaire toute la recette.
