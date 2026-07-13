# Recette finale des améliorations Newoteg

**Date :** 13 juillet 2026
**Branche :** `codex/newoteg-improvements-2026`

## Résultats automatisés

| Contrôle | Résultat |
|---|---|
| Backend build NestJS + Prisma | Réussi |
| Backend Jest | 21 suites, 104 tests réussis |
| `GET /api/health` sur backend local | HTTP 200 ; API, base et stockage `ok` |
| Admin TypeScript | Réussi |
| Admin build PWA moderne + legacy | Réussi |
| Admin précache PWA | Environ 4,11 Mo |
| Tests hors ligne frontend | 5 réussis : avant, pendant, après coupure, conflit stock et diagnostic |
| Site client ESLint | 0 erreur, 0 avertissement |
| Site client build | Réussi |
| Audit production backend | 3 modérées, aucune élevée/critique |
| Audit production admin | 1 faible, aucune modérée/élevée/critique |
| Audit production client | 0 |
| Capacitor `sync android` | Réussi |
| Gradle local | Code chargé sous Java 21 ; arrêté faute d’Android SDK local |
| Build APK CI | Workflow ajouté avec Java 21, Android SDK et artefact APK |

## Scénarios couverts par le code et les tests

- limitation et verrouillage de connexion ;
- idempotence d’une vente rejouée ;
- numérotation transactionnelle ;
- création atomique vente/facture/stock/caisse ;
- annulation auditée ;
- remboursement distinct, atomique et protégé contre le double traitement ;
- original/duplicata et journal d’impression par poste/utilisateur ;
- file hors ligne persistante et synchronisation ;
- conflits stock visibles, relançables et journalisés ;
- pagination serveur du catalogue et recherches POS/autocomplétion distantes ;
- paniers suspendus, avertissement de sortie et métriques Caisse Express ;
- tableau de bord adapté au rôle et périodes comparées hors ventes annulées ;
- builds responsive et chargement par route ;
- santé base/stockage et références de diagnostic.

## Recette externe obligatoire en boutique

Ces contrôles ne peuvent pas être déclarés réussis depuis le domicile, car ils exigent le matériel et le réseau réels :

- pilote et nom Windows exact de l’Epson TM-T20II ;
- cinq séries d’impression, ticket long, accents, gros montants et duplicata ;
- coupe, marges, centrage et papier 58 mm ;
- lecteur code-barres réel ;
- téléphone Android représentatif ;
- certificat QZ, pare-feu WSS 8181 et Wi-Fi boutique ;
- redémarrage du PC et lancement automatique de QZ Tray ;
- parcours par comptes SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER sur une base de recette.

## Décision de livraison

Le logiciel est prêt pour la recette boutique. Le déploiement production et la clôture définitive restent conditionnés par la validation des contrôles matériels ci-dessus.
