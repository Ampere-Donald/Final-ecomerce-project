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
| Tests frontend ciblés | 11 réussis : 5 hors ligne et 6 statuts d’impression QZ/Windows |
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
- lecture des statuts QZ/Winspool avant impression : prêt, papier absent, hors ligne ou file bloquée ;
- politique Android WSS : autorités système + certificat QZ installé par l’utilisateur, trafic clair interdit.

## Recette externe obligatoire en boutique

Ces contrôles ne peuvent pas être déclarés réussis depuis le domicile, car ils exigent le matériel et le réseau réels :

- pilote et nom Windows exact de l’Epson TM-T20II ;
- cinq séries d’impression, ticket long, accents, gros montants et duplicata ;
- coupe, marges, centrage et papier 58 mm ;
- lecteur code-barres réel ;
- vente standard complète sans souris et durée chronométrée inférieure ou égale à 20 secondes après entraînement ;
- cohérence du journal d’impression et persistance de la file hors ligne après redémarrage ;
- téléphone Android représentatif ;
- certificat QZ, pare-feu WSS 8181 et Wi-Fi boutique ;
- redémarrage du PC et lancement automatique de QZ Tray ;
- parcours par comptes SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER sur une base de recette.
- écrans principaux réellement utilisables à 360 px sur le téléphone représentatif.

La commande suivante doit être exécutée sur le poste boutique ; elle génère les preuves Markdown et JSON et refuse un résultat global `PASS` tant qu’un contrôle obligatoire manque :

```powershell
.\scripts\Invoke-NewotegShopAcceptance.ps1 `
  -ExpectedPrinterName "<nom Windows exact>" `
  -QzServerHost "<IP fixe du PC>" `
  -RequireRemotePrint `
  -RunWindowsTestPage
```

## Décision de livraison

Le logiciel est prêt pour la recette boutique. Le déploiement production et la clôture définitive restent conditionnés par la validation des contrôles matériels ci-dessus.
