# Notes de version — programme d’amélioration 2026

## Sécurité et données

- limitation des tentatives et verrouillage temporaire des connexions ;
- suppression de la création anonyme du super-administrateur ;
- JWT retirés des URL temps réel ;
- numérotation atomique des tickets, factures et proformas ;
- ventes, stock, caisse et factures traités dans des transactions ;
- annulation auditée avec restitution du stock.

## Caisse et impression

- profil Epson TM-T20II ESC/POS, 58 mm et 32 colonnes ;
- détection des imprimantes physiques et ticket diagnostic ;
- impression automatique après vente, sans recréer la transaction en cas d’échec ;
- raccourcis Caisse Express et retour automatique au scanner ;
- serveur QZ configurable pour imprimer depuis Android sur le PC boutique.

## Continuité

- file IndexedDB persistante pour ventes, bons et tickets ;
- identifiants idempotents uniques côté serveur ;
- synchronisation automatique, erreurs et conflits visibles ;
- écran de contrôle permettant relance et retrait supervisé.

## Expérience et performance

- chargement des routes à la demande ;
- bundle initial admin réduit d’environ 81 % ;
- lint client ramené à zéro erreur et zéro avertissement ;
- design system, cibles tactiles, focus clavier, zones sûres Android ;
- récupération après erreur d’affichage ;
- tableau de bord relié aux actions quotidiennes.

## Exploitation

- audits de production fortement réduits ;
- `xlsx` remplacé et Nodemailer mis à niveau ;
- identifiants de corrélation dans les requêtes et erreurs ;
- route de santé API, base et stockage ;
- CI backend, admin, site client et Android.
