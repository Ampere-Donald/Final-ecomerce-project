# Installation de l’impression Epson depuis Android

## Architecture retenue

L’Epson TM-T20II reste branchée en USB au PC de la boutique. QZ Tray, installé sur ce PC, sert de pont d’impression sécurisé. L’application Android envoie les commandes ESC/POS 58 mm au PC par le réseau local.

Cette architecture évite un pilote USB spécifique sur chaque téléphone. Le PC doit être allumé, QZ Tray actif et le téléphone connecté au même réseau local.

## 1. Préparer le PC boutique

1. Installer le pilote Windows Epson TM-T20II.
2. Vérifier une impression Windows et le papier thermique 58 mm.
3. Installer QZ Tray et activer son lancement automatique.
4. Attribuer au PC une adresse IP locale fixe ou une réservation DHCP, par exemple `192.168.1.20`.
5. Configurer QZ Tray en serveur d’impression selon le guide officiel.
6. Autoriser uniquement le port sécurisé WSS 8181 dans le pare-feu Windows sur le profil réseau privé.
7. Limiter l’origine autorisée à `https://admin.newoteg.com` lorsque la configuration QZ le permet.

QZ documente l’option de connexion distante `qz.websocket.connect({ host: "192.168.1.2" })`, les ports WSS sécurisés et l’installation du certificat sur Android : [guide officiel Print Server](https://qz.io/docs/print-server), [API WebSocket officielle](https://qz.io/api/qz.websocket), [options de sécurité QZ](https://qz.io/docs/command-line).

## 2. Installer le certificat sur Android

Le site admin est en HTTPS ; Android doit donc établir une connexion WSS de confiance vers QZ. Suivre la partie Android du guide Print Server pour copier et installer le certificat généré par QZ.

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

Depuis la racine du projet, ouvrir PowerShell **en tant qu’administrateur** puis exécuter :

```powershell
.\scripts\Install-NewotegPrintStation.ps1 `
  -EpsonDriverInf "C:\Pilotes\EpsonTM-T20II\driver.inf" `
  -QzInstaller "C:\Installateurs\qz-tray.exe"
```

Ajouter `-AllowPrivateQzPort` uniquement sur le PC qui doit recevoir les impressions Android par le réseau privé. Le script installe le `.inf` avec l’outil Windows officiel, lance QZ Tray, démarre le spooler si nécessaire et affiche le nom exact de l’imprimante détectée. Les fichiers Epson et QZ doivent être obtenus et vérifiés avant l’exécution ; ils ne sont pas intégrés à l’application.
