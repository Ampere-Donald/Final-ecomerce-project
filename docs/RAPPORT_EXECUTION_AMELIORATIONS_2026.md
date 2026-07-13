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
| 7 à 10 | À exécuter | Voir plan directeur |

## Résultats mesurés

### Panneau admin

- Bundle initial moderne avant découpage : environ **2,57 Mo**.
- Bundle initial moderne après découpage : environ **483 Ko**.
- Réduction du bundle initial : environ **81 %**.
- Temps de build observé avant : **2 min 54 s**.
- Temps de build après : environ **1 min 31 s**.
- Précache PWA avant optimisation : environ **8,11 Mo**.
- Précache PWA après optimisation : environ **3,83 Mo**.

### Site client

- ESLint avant : 11 erreurs et 3 avertissements.
- ESLint après : **0 erreur et 0 avertissement**.
- Bundle moderne initial avant découpage : environ **518 Ko**.
- Bundle moderne initial après découpage : environ **377 Ko**.
- Build de production : réussi.

### Backend

- Build NestJS/Prisma : réussi.
- Suites de tests : **15 réussies**.
- Tests : **83 réussis**.

## Fonctions livrées à ce stade

- limitation globale et ciblée des requêtes d’authentification ;
- verrouillage temporaire après cinq échecs de connexion ;
- suppression de la route publique de création du premier super-administrateur ;
- suppression des JWT dans les URL des flux temps réel ;
- numérotation atomique des tickets, factures et proformas ;
- factures créées dans les transactions d’encaissement ;
- annulation de vente traçable avec restitution du stock ;
- diagnostic Epson TM-T20II et ticket de test ;
- routes admin et client chargées à la demande ;
- modules lourds PWA chargés et mis en cache à la demande ;
- raccourcis Caisse Express : `/`, F2, F3, F4 et F8 ;
- retour automatique au champ scanner après une vente directe ou un bon vendeur.
- file persistante IndexedDB pour ventes, bons et tickets hors ligne ;
- identifiants idempotents contrôlés par des index uniques en base ;
- synchronisation automatique au retour du réseau et écran de traitement des conflits.

## Validation externe encore nécessaire

- test réel sur l’Epson TM-T20II en boutique ;
- vérification du pilote Windows et du nom exact de la file d’impression ;
- validation de la coupe, des accents et des tickets longs ;
- mesure sur un téléphone Android représentatif du parc boutique.
