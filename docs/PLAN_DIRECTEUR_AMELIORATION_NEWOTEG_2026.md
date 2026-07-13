# Plan directeur d’amélioration de Newoteg

**Version :** 1.1 — suivi d’exécution du plan validé
**Date :** 13 juillet 2026
**Statut :** VALIDÉ — LOGICIEL EXÉCUTÉ, RECETTE BOUTIQUE EN ATTENTE
**Périmètre :** backend NestJS, site client React, panneau admin React/PWA, application Android Capacitor, caisse et impression Epson TM-T20II.

## 1. Objectif général

Transformer Newoteg en une application de gestion et de caisse :

- fiable pour les opérations financières et les stocks ;
- rapide sur ordinateur, téléphone et connexion limitée ;
- simple pour les vendeurs et caissiers ;
- exploitable pendant les interruptions réseau ;
- sécurisée et traçable ;
- facile à maintenir et à diagnostiquer.

Le travail sera réalisé par phases. Une phase n’est terminée que lorsque ses critères d’acceptation, ses tests et sa documentation sont validés.

## 2. État actuel vérifié

### Fonctionnel

- Le backend compile.
- Les 12 suites backend et leurs 76 tests passent.
- Le site client compile, mais son contrôle ESLint contient 11 erreurs et 3 avertissements.
- Le panneau admin passe TypeScript.
- Le build admin aboutit en environ 2 min 54 s.
- Le bundle admin principal pèse environ 2,57 Mo, et environ 2,74 Mo en version legacy.
- L’APK Android est une WebView distante et ne possède pas de module natif USB/Bluetooth.

### Impression

- Matériel confirmé : **Epson TM-T20II, ESC/POS, papier 58 mm**.
- L’encodage est configuré pour `epson-tm-t20ii`, 32 colonnes et coupe automatique.
- QZ Tray est utilisé comme pont entre le navigateur et Windows.
- Un écran de détection, sélection et test d’imprimante a été ajouté.
- La configuration est prête à être testée sur un ordinateur de la boutique.
- Un assistant de recette exporte les preuves automatiques et les confirmations physiques ; aucun résultat final ne sera déclaré sans ce rapport sur le poste réel.
- L’impression silencieuse de production nécessite encore le déploiement QZ Tray et une stratégie de signature.

### Risques actuels majeurs

- Les numéros de tickets générés dans `localStorage` peuvent être dupliqués entre plusieurs caisses.
- L’endpoint de création du premier super-administrateur reste accessible sans authentification.
- Le module de limitation de débit est déclaré, mais le garde global n’est pas activé.
- Un JWT administrateur peut être accepté dans l’URL.
- Les dépendances présentent actuellement :
  - backend : 23 vulnérabilités, dont 16 élevées ;
  - site client : 6 vulnérabilités, dont 5 élevées ;
  - panneau admin : 18 vulnérabilités, dont 1 critique et 8 élevées.
- Le panneau admin charge trop de code au démarrage.

## 3. Principes de réalisation

1. Protéger d’abord les données, l’argent et les accès.
2. Ne jamais casser une fonction de caisse existante pour une amélioration visuelle.
3. Livrer par lots vérifiables et réversibles.
4. Ajouter ou adapter les tests à chaque changement sensible.
5. Conserver une trace des migrations, décisions et résultats de recette.
6. Tester la caisse et l’impression sur le matériel réel avant validation finale.
7. Ne pas appliquer automatiquement une mise à jour majeure de dépendance sans test ciblé.

## 4. Priorités

| Niveau | Signification | Délai cible |
|---|---|---|
| P0 | Sécurité, intégrité financière, impression et blocages critiques | En premier |
| P1 | Rapidité de caisse, performances et continuité de service | Après P0 |
| P2 | Cohérence UI/UX, pilotage et maintenabilité | Après stabilisation P1 |
| P3 | Optimisations avancées et fonctions de confort | Dernière phase |

## 5. Feuille de route détaillée

### Phase 0 — Baseline, sauvegarde et environnement de travail

**Priorité : P0**

#### Actions

- Inventorier les variables d’environnement requises sans exposer leurs valeurs.
- Capturer l’état Git et préserver les fichiers utilisateur non liés.
- Créer une branche de travail dédiée après validation du plan.
- Établir les commandes de référence : build, TypeScript, lint, tests unitaires et tests e2e.
- Préparer une base de test séparée de la production.
- Documenter une procédure de retour arrière.

#### Critères d’acceptation

- La base de développement peut être lancée de manière reproductible.
- Aucun test ne dépend directement de la base de production.
- Un retour à la version antérieure est documenté.

---

### Phase 1 — Sécurité et intégrité des accès

**Priorité : P0 — critique**

#### Actions

- Supprimer ou protéger l’endpoint public de création du premier administrateur.
- Activer réellement le garde global de limitation de débit.
- Ajouter une limite renforcée sur les connexions par mot de passe et par PIN.
- Ajouter une temporisation ou un verrouillage progressif après plusieurs échecs.
- Retirer les JWT des URL et définir une solution sûre pour les connexions temps réel.
- Valider les DTO de changement de mot de passe avec `class-validator`.
- Vérifier expiration, révocation et désactivation des sessions administrateur.
- Ajouter des tests de permissions pour chaque rôle sensible.
- Vérifier que les journaux ne contiennent aucun mot de passe, PIN, OTP ou jeton.

#### Bénéfices

- Réduction du risque de prise de contrôle d’un compte.
- Protection contre les essais automatisés de PIN.
- Meilleure traçabilité des actions administratives.

#### Critères d’acceptation

- Aucun super-administrateur ne peut être créé anonymement.
- Les essais répétés déclenchent la limitation prévue.
- Aucun JWT n’apparaît dans une URL ou un journal.
- Les tests d’autorisation couvrent SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER.

---

### Phase 2 — Intégrité des ventes, tickets et caisse

**Priorité : P0 — critique**

#### Actions

- Déplacer la génération des numéros de ticket, facture et proforma dans le backend.
- Garantir l’unicité avec une transaction ou une séquence en base.
- Définir les formats officiels, par exemple `TIC-2026-000001`.
- Enregistrer le poste, le caissier, l’heure, le type de document et le nombre d’impressions.
- Distinguer clairement original, duplicata, annulation et remboursement.
- Empêcher la suppression silencieuse d’une vente encaissée.
- Rendre les opérations stock + vente + paiement atomiques.
- Ajouter des tests de concurrence simulant deux caisses simultanées.

#### Bénéfices

- Aucun doublon entre plusieurs postes.
- Historique comptable plus fiable.
- Contrôle clair des réimpressions et annulations.

#### Critères d’acceptation

- Deux caisses simultanées ne peuvent jamais recevoir le même numéro.
- Une erreur intermédiaire ne laisse pas le stock et le paiement dans des états contradictoires.
- Toute réimpression est visible dans l’historique.

---

### Phase 3 — Finalisation de l’impression Epson en boutique

**Priorité : P0**

#### Actions logicielles

- Conserver le profil fixe Epson TM-T20II, 58 mm, 32 colonnes.
- Vérifier la sélection automatique Epson/TM-T20 dans QZ Tray.
- Améliorer les messages d’erreur selon la cause : QZ absent, imprimante absente, pilote absent, papier absent ou file bloquée.
- Ajouter un statut d’impression et une possibilité de réessayer sans recréer la vente.
- Définir le comportement en cas d’échec : vente enregistrée, impression en attente.
- Préparer la signature QZ côté backend si l’impression sans confirmation est retenue.

#### Actions sur un poste boutique

- Vérifier le nom Windows exact de l’Epson.
- Vérifier le pilote Epson et le port USB.
- Installer QZ Tray avec démarrage automatique.
- Imprimer un ticket court, un ticket long, des accents, de gros montants et un duplicata.
- Vérifier coupe, marges, centrage, lisibilité et alimentation papier.

#### Bénéfices

- Mise en service guidée sur chaque poste.
- Moins d’échecs silencieux et moins d’assistance manuelle.

#### Critères d’acceptation

- Cinq séries de tickets consécutifs s’impriment sans coupure de texte.
- Le redémarrage du PC ne nécessite pas de reconfiguration.
- Une panne d’imprimante ne duplique pas la vente.

---

### Phase 4 — Performance du panneau admin et du site client

**Priorité : P1**

#### Actions

- Découper les routes avec `React.lazy` et `Suspense`.
- Charger PDF, Excel, ZIP et capture HTML uniquement lors d’un export.
- Supprimer les imports statiques qui empêchent le découpage de `jsPDF`.
- Séparer Paie, Inventaire, Analyses, Paramètres et Administration en chunks.
- Paginer les listes volumineuses côté serveur.
- Éviter de charger tout le catalogue au démarrage.
- Réduire les données statiques et images incluses dans JavaScript.
- Corriger les 11 erreurs et 3 avertissements ESLint du site client.
- Mesurer les temps de chargement avant et après.

#### Objectifs mesurables

- Réduire fortement le bundle initial admin, avec une cible inférieure à 800 Ko compressés hors modules chargés à la demande.
- Afficher l’écran utilisable en moins de 3 secondes sur une connexion mobile raisonnable.
- Réduire la durée du build et la consommation mémoire.

#### Bénéfices

- Ouverture plus rapide sur téléphone et ordinateur ancien.
- Moins de données consommées.
- Navigation plus fluide.

---

### Phase 5 — Mode Caisse Express

**Priorité : P1 — fort impact métier**

#### Parcours cible

1. Scanner ou rechercher un produit.
2. Ajuster la quantité.
3. Choisir le paiement.
4. Valider.
5. Imprimer automatiquement.
6. Préparer immédiatement la vente suivante.

#### Actions

- Garder le focus sur le scanner après chaque ajout.
- Ajouter des raccourcis clavier documentés.
- Ajouter et retirer une quantité sans ouvrir de fenêtre.
- Afficher stock, prix, remise et total dans une zone stable.
- Bloquer clairement une quantité supérieure au stock autorisé.
- Prévenir avant de quitter une vente non terminée.
- Permettre la mise en attente et la reprise d’un panier.
- Afficher un retour immédiat après paiement et impression.
- Mesurer le nombre de clics et le temps moyen d’une vente.

#### Objectifs mesurables

- Vente standard réalisable sans souris avec un lecteur code-barres.
- Vente standard finalisée en moins de 20 secondes après entraînement.
- Aucun double clic ne peut créer deux ventes.

#### Bénéfices

- File d’attente réduite.
- Formation plus courte des caissiers.
- Moins d’erreurs de saisie.

---

### Phase 6 — Mode hors ligne et synchronisation

**Priorité : P1**

#### Actions

- Définir précisément les opérations autorisées hors ligne.
- Stocker les ventes en attente dans IndexedDB avec identifiant idempotent.
- Afficher l’état : synchronisé, en attente, en erreur ou conflit.
- Synchroniser automatiquement au retour du réseau.
- Empêcher la création de doublons lors des reprises.
- Définir une politique de stock quand plusieurs caisses travaillent hors ligne.
- Ajouter une page de contrôle des opérations non synchronisées.
- Tester interruption réseau avant, pendant et après paiement.

#### Bénéfices

- Continuité des ventes pendant une coupure Internet.
- Visibilité claire sur ce qui reste à envoyer.

#### Critères d’acceptation

- Une vente hors ligne est synchronisée une seule fois.
- Un redémarrage du navigateur ne perd pas la file locale.
- Les conflits de stock sont visibles et traitables.

---

### Phase 7 — Design system, UI et UX mobile

**Priorité : P2**

#### Actions

- Définir les couleurs, typographies, espacements, rayons et ombres officiels.
- Unifier boutons, champs, badges, tableaux, cartes, modales et notifications.
- Réserver rouge aux erreurs/actions dangereuses, vert aux réussites et orange aux alertes.
- Remplacer les tableaux difficiles à lire par des cartes sur petits écrans.
- Garder les actions principales visibles en bas des écrans mobiles.
- Ajouter des états cohérents : chargement, vide, erreur, hors ligne et accès refusé.
- Vérifier navigation clavier, contrastes, focus et tailles tactiles.
- Simplifier les formulaires longs en étapes lorsque nécessaire.

#### Bénéfices

- Application plus professionnelle et cohérente.
- Moins d’hésitations et d’erreurs utilisateur.
- Maintenance frontend plus rapide.

#### Critères d’acceptation

- Les écrans principaux sont utilisables à 360 px de largeur.
- Les actions importantes sont accessibles au clavier.
- Aucun tableau principal ne force une navigation horizontale incompréhensible.

---

### Phase 8 — Tableau de bord orienté actions

**Priorité : P2**

#### Actions

- Transformer les alertes en raccourcis actionnables.
- Afficher : caisse non ouverte, tickets en attente, produits bas, échéances, ventes non synchronisées et imprimante indisponible.
- Adapter les indicateurs au rôle connecté.
- Ajouter des périodes et comparaisons fiables.
- Définir la source et la formule de chaque KPI.

#### Bénéfices

- Décisions quotidiennes plus rapides.
- Moins d’oublis de stock, caisse et règlement.

---

### Phase 9 — Dépendances, observabilité et maintenance

**Priorité : P2**

#### Actions

- Traiter d’abord la vulnérabilité critique puis les vulnérabilités élevées directes.
- Mettre à jour par petits groupes avec tests entre chaque groupe.
- Remplacer les paquets sans correctif sûr, notamment si nécessaire pour Excel.
- Centraliser les erreurs frontend et backend avec identifiant de corrélation.
- Journaliser les échecs d’impression et de synchronisation sans données sensibles.
- Ajouter des contrôles de santé backend, base, stockage et impression.
- Ajouter les builds, tests, lint et audits contrôlés dans la CI.
- Documenter les procédures de sauvegarde et de restauration.

#### Bénéfices

- Diagnostic plus rapide.
- Réduction du risque de panne et de faille réintroduite.

---

### Phase 10 — Android et impression mobile

**Priorité : P3, après validation du fonctionnement PC**

#### Option recommandée si l’Epson reste branchée au PC

- Transformer le poste boutique en serveur d’impression QZ accessible sur le réseau local.
- Configurer l’application Android pour joindre ce poste de manière sécurisée.
- Prévoir la découverte/configuration de l’adresse du serveur d’impression.

#### Option alternative

- Développer un plugin Capacitor natif USB/Bluetooth uniquement si l’imprimante doit être reliée directement au téléphone ou à la tablette.

#### Critères de décision

- L’Epson reste-t-elle physiquement branchée à un PC ?
- Les téléphones sont-ils toujours sur le même réseau local ?
- Faut-il imprimer quand le PC est éteint ?

## 6. Ressources nécessaires

### Ressources techniques déjà disponibles

- Code backend NestJS/Prisma/PostgreSQL.
- Panneau admin React/Vite/PWA.
- Site client React/Vite.
- Coquille Android Capacitor.
- Tests backend existants.
- Intégration QZ Tray et encodeur ESC/POS existants.

### Ressources externes nécessaires à certaines phases

- Un ordinateur de boutique avec droits d’installation Windows.
- L’Epson TM-T20II branchée avec papier 58 mm.
- Le pilote Epson utilisé en boutique.
- QZ Tray installé sur le poste de test.
- Un compte administrateur de test et des comptes de chaque rôle.
- Une base de données de recette ou une copie anonymisée.
- Un téléphone Android représentatif du matériel réellement utilisé.
- L’accès de déploiement uniquement au moment de la livraison validée.
- Pour une impression totalement silencieuse : certificat QZ ou stratégie de certificat interne validée.

### Décisions attendues du propriétaire

- Format officiel des numéros de ticket/facture/proforma.
- Règles d’annulation et de remboursement.
- Règles de vente hors ligne et de conflit de stock.
- Raccourcis clavier souhaités pour la caisse.
- Choix futur entre serveur d’impression réseau et impression Android directe.

## 7. Stratégie de test

### Automatisé

- Tests unitaires backend.
- Tests de services de vente, paiement, stock et numérotation.
- Tests de permissions et limitation de débit.
- Tests de concurrence pour plusieurs caisses.
- Tests frontend des parcours critiques.
- Tests e2e : connexion, ouverture caisse, vente, paiement, ticket, annulation et synchronisation.

### Manuel

- Recette desktop et mobile.
- Lecteur code-barres.
- Epson TM-T20II réelle.
- Coupure et retour du réseau.
- Redémarrage navigateur et ordinateur.
- Tests par rôle avec un utilisateur réel ou représentatif.

## 8. Livrables

- Code source amélioré et vérifié.
- Migrations de base documentées.
- Tests et résultats de validation.
- Guide d’installation du poste d’impression.
- Guide rapide caissier/vendeur.
- Guide administrateur.
- Notes de version.
- Procédure de déploiement et de retour arrière.
- Rapport final indiquant les objectifs atteints et les risques restants.

## 9. Jalons de validation

| Jalon | Contenu | Validation attendue |
|---|---|---|
| J0 | Présent plan | Accord sur ordre, périmètre et décisions |
| J1 | Sécurité + intégrité tickets | Tests automatiques et revue fonctionnelle |
| J2 | Impression boutique | Tickets réels validés sur Epson |
| J3 | Performance + Caisse Express | Mesures avant/après et recette utilisateur |
| J4 | Hors ligne + UI mobile | Scénarios réseau et tests Android |
| J5 | Dashboard + maintenance | Audit final et documentation |
| J6 | Livraison | Déploiement contrôlé et vérification post-déploiement |

## 10. Définition de « terminé »

Le programme sera considéré terminé lorsque :

- toutes les phases retenues sont implémentées ;
- les critères d’acceptation sont satisfaits ;
- les tests automatiques critiques passent ;
- les parcours principaux sont testés sur ordinateur et mobile ;
- l’Epson TM-T20II est testée dans la boutique ;
- les migrations et le déploiement sont reproductibles ;
- la documentation utilisateur et technique est à jour ;
- les risques non corrigés sont explicitement documentés ;
- la version déployée est vérifiée après mise en production.

## 11. Décision demandée

Avant de commencer le travail intensif, valider l’une des décisions suivantes :

- **VALIDÉ SANS MODIFICATION** : exécuter le plan dans l’ordre proposé.
- **VALIDÉ AVEC MODIFICATIONS** : indiquer les phases à déplacer, ajouter ou retirer.
- **NON VALIDÉ** : reprendre le plan avant toute nouvelle implémentation.

Tant que ce document n’est pas validé, aucune phase fonctionnelle supplémentaire ne doit être engagée.
