# Notes de version — programme d’amélioration 2026

## Sécurité et données

- limitation des tentatives et verrouillage temporaire des connexions ;
- suppression de la création anonyme du super-administrateur ;
- JWT retirés des URL temps réel ;
- sessions révoquées après changement de mot de passe, rôle, réinitialisation ou désactivation ;
- numérotation atomique des tickets, factures et proformas ;
- ventes, stock, caisse et factures traités dans des transactions ;
- annulation auditée avec restitution du stock.
- remboursement distinct avec sortie de caisse et retour de stock.

## Caisse et impression

- profil Epson TM-T20II ESC/POS, 58 mm et 32 colonnes ;
- détection des imprimantes physiques et ticket diagnostic ;
- impression automatique après vente, sans recréer la transaction en cas d’échec ;
- original/duplicata et journal d’impression par poste, utilisateur et résultat ;
- raccourcis Caisse Express et retour automatique au scanner ;
- paniers suspendus, avertissement de sortie et mesure locale du parcours ;
- serveur QZ configurable pour imprimer depuis Android sur le PC boutique.

## Continuité

- file IndexedDB persistante pour ventes, bons et tickets ;
- identifiants idempotents uniques côté serveur ;
- synchronisation automatique, erreurs et conflits visibles ;
- écran de contrôle permettant relance et retrait supervisé.
- cinq tests automatisés de coupure, reprise, conflit et diagnostic.

## Expérience et performance

- chargement des routes à la demande ;
- pagination serveur du catalogue et recherche distante limitée dans les caisses ;
- bundle initial admin réduit d’environ 81 % ;
- lint client ramené à zéro erreur et zéro avertissement ;
- design system, cibles tactiles, focus clavier, zones sûres Android ;
- récupération après erreur d’affichage ;
- tableau de bord relié aux actions quotidiennes.
- indicateurs et appels réseau adaptés au rôle connecté.

## Exploitation

- audits de production fortement réduits ;
- `xlsx` remplacé et Nodemailer mis à niveau ;
- identifiants de corrélation dans les requêtes et erreurs ;
- route de santé API, base et stockage ;
- CI backend, admin, site client et Android.
- assistant Windows pour préparer le pilote Epson, QZ Tray, le spooler et le pare-feu privé.
