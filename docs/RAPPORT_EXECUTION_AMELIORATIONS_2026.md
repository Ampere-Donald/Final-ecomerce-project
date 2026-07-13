# Rapport d’exécution des améliorations Newoteg

**Dernière mise à jour :** 13 juillet 2026

## État des phases

| Phase | État | Preuve principale |
|---|---|---|
| 0 — Baseline | Terminée | Branche dédiée et points de restauration Git |
| 1 — Sécurité | Terminée | Build backend et tests d’authentification |
| 2 — Intégrité caisse | Terminée | Séquences atomiques, transactions et migrations |
| 3 — Epson boutique | Logiciel prêt, test physique requis | Diagnostic et profil TM-T20II 58 mm |
| 4 — Performance | Terminée | Builds mesurés et lint client propre |
| 5 — Caisse Express | Terminée | Raccourcis, retour scanner et impression automatique |
| 6 — Hors ligne | Terminée | IndexedDB, idempotence backend et écran de contrôle |
| 7 — Design system et UX mobile | Terminée | Tokens, accessibilité, zones tactiles et récupération d’erreur |
| 8 — Tableau de bord actionnable | Terminée | Alertes reliées aux écrans de résolution et KPI documentés |
| 9 — Dépendances et observabilité | Terminée | Audits, corrélation, santé et CI multi-projets |
| 10 — Android et impression mobile | Logiciel terminé, recette boutique requise | Hôte QZ réseau, WSS, guide et build Android CI |

## Résultats mesurés

### Panneau admin

- Bundle initial moderne avant découpage : environ **2,57 Mo**.
- Bundle initial moderne après découpage : environ **483 Ko**.
- Réduction du bundle initial : environ **81 %**.
- Temps de build observé avant : **2 min 54 s**.
- Temps de build après : environ **1 min 31 s**.
- Précache PWA avant optimisation : environ **8,11 Mo**.
- Précache PWA final : environ **4,11 Mo**, incluant les écrans hors ligne, audit d’impression et diagnostic.

### Site client

- ESLint avant : 11 erreurs et 3 avertissements.
- ESLint après : **0 erreur et 0 avertissement**.
- Bundle moderne initial avant découpage : environ **518 Ko**.
- Bundle moderne initial après découpage : environ **377 Ko**.
- Build de production : réussi.

### Backend

- Build NestJS/Prisma : réussi.
- Suites de tests : **21 réussies**.
- Tests : **104 réussis**.
- Tests hors ligne frontend : **5 réussis**.

## Fonctions livrées à ce stade

- limitation globale et ciblée des requêtes d’authentification ;
- verrouillage temporaire après cinq échecs de connexion ;
- suppression de la route publique de création du premier super-administrateur ;
- suppression des JWT dans les URL des flux temps réel ;
- révocation immédiate des sessions après changement de mot de passe, réinitialisation, rôle ou désactivation ;
- numérotation atomique des tickets, factures et proformas ;
- factures créées dans les transactions d’encaissement ;
- annulation de vente traçable avec restitution du stock ;
- remboursement client distinct de l’annulation, avec sortie de caisse et mouvement de stock RETOUR atomiques ;
- diagnostic Epson TM-T20II et ticket de test ;
- journal central des impressions : original, duplicata, échec, poste, utilisateur et imprimante ;
- routes admin et client chargées à la demande ;
- modules lourds PWA chargés et mis en cache à la demande ;
- catalogue paginé côté serveur et recherche distante dans le POS et l’autocomplétion publique ;
- raccourcis Caisse Express : `/`, F2, F3, F4 et F8 ;
- retour automatique au champ scanner après une vente directe ou un bon vendeur.
- paniers suspendus/repris, avertissement avant fermeture et mesure locale du temps et des interactions ;
- file persistante IndexedDB pour ventes, bons et tickets hors ligne ;
- identifiants idempotents contrôlés par des index uniques en base ;
- synchronisation automatique au retour du réseau et écran de traitement des conflits.
- distinction automatique entre nouvelle tentative et conflit de stock, avec cinq scénarios réseau automatisés ;
- design system sémantique, focus clavier et cibles tactiles de 44 px ;
- actions de caisse mobiles compatibles avec la zone sûre Android ;
- tableau de bord relié à la caisse, aux tickets, au stock, au hors-ligne et à l’impression.
- tableau de bord et appels API adaptés à SUPER_ADMIN, ADMIN, CAISSIER et VENDEUR ;
- audits de production ramenés à 3 alertes modérées backend, 1 faible admin et 0 côté client ;
- remplacement de la dépendance Excel sans correctif et mise à niveau de Nodemailer ;
- identifiant de corrélation HTTP, route de santé API/base/stockage et CI sur les trois applications.
- diagnostics d’impression et de synchronisation centralisés sans panier, client, montant, PIN, jeton ou mot de passe ;
- configuration Android d’un poste QZ distant avec reconnexion et diagnostic sécurisé ;
- guide de certificat, pare-feu, IP fixe et recette Epson sur réseau local ;
- assistant PowerShell administrateur pour installer un pilote `.inf`, préparer QZ et contrôler le poste ;
- build PWA et synchronisation Capacitor validés ; compilation APK automatisée en CI avec Java 21 et Android SDK.

## Validation externe encore nécessaire

- test réel sur l’Epson TM-T20II en boutique ;
- vérification du pilote Windows et du nom exact de la file d’impression ;
- validation de la coupe, des accents et des tickets longs ;
- mesure sur un téléphone Android représentatif du parc boutique.
