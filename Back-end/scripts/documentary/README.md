# Intégration documentaire — travail en cours

Les utilitaires sont des fonctions internes utilisant un client SQL fourni par l’appelant. Ils n’ouvrent aucune connexion, ne chargent pas .env et ne constituent pas une commande d’import de production.

- policy.cjs : liste blanche des textes et décision documentaire.
- stage.cjs : propositions en revue interne, sans changement des colonnes publiques.
- store.cjs : publication transactionnelle d’une candidate, journalisée et idempotente.
- manual-edit.cjs : correction et validation humaine, verrou automatique et révision attendue.
- rollback.cjs : restauration d’un événement de publication, refus si une correction est intervenue.

Les transactions verrouillent la ligne produit avant la ligne documentaire. Les titres doivent respecter 150 caractères ; les champs techniques annexes ne sont pas écrits dans produit ou attribut. Les textes eux-mêmes doivent encore passer le contrôle de publication prévu au brief : le drapeau d’éligibilité ne constitue pas une certification physique.

## Rejouer les tests

Depuis Back-end, utiliser le Node installé et les dépendances existantes. DOCUMENTARY_TEST_INPUT pointe vers le dossier documentaire local contenant les propositions et current-snapshot. Ne jamais fournir une URI de production à ces tests.

```bash
DOCUMENTARY_TEST_INPUT=/chemin/vers/dossier-documentaire node --test scripts/documentary/policy.test.cjs scripts/documentary/store.test.cjs scripts/documentary/rollback.test.cjs scripts/documentary/database.test.cjs scripts/documentary/stage-database.test.cjs
```

Le test full-schema.test.cjs requiert une génération SQL préalable du schéma au commit de production épinglé. L’URI factice ci-dessous sert uniquement à charger la configuration Prisma ; migrate diff compare deux schémas et ne se connecte pas à cette URI.

```bash
mkdir -p .local-postgres/documentary
git show 3b813b7:Back-end/prisma/schema.prisma > .local-postgres/documentary/baseline.prisma
DATABASE_URL=postgresql://unused:unused@127.0.0.1:1/unused node node_modules/prisma/build/index.js migrate diff --from-empty --to-schema .local-postgres/documentary/baseline.prisma --script --config prisma.config.ts > .local-postgres/documentary/baseline.sql
DOCUMENTARY_TEST_INPUT=/chemin/vers/dossier-documentaire node --test scripts/documentary/full-schema.test.cjs
```

Ce test reconstruit toutes les tables du schéma épinglé et le trigger de révision du catalogue, puis applique la migration documentaire uniquement dans PGlite éphémère. Il restaure une archive du répertoire de cette base dans une seconde instance, compare les tables, publie 25 propositions et restaure leurs textes. Les révisions générales et d’identification restent croissantes ; leur retour à une ancienne valeur masquerait l’historique. Les autres colonnes du produit sont comparées intégralement.

Limites : PGlite est PostgreSQL embarqué ; son archive de test n’est pas un pg_dump de production. Il reste à valider une sauvegarde restaurable de l’environnement cible dans un emplacement privé, les triggers/contraintes ajoutés hors schéma et la préproduction complète. Aucun succès de ces tests n’autorise un déploiement.


## Test HTTP des routes administrateur

Depuis Back-end :

```bash
node node_modules/typescript/bin/tsc -p tsconfig.build.json
node --test scripts/documentary/http.test.cjs
```

Le test charge le contrôleur et le service compilés, les vrais guards et la vraie stratégie JWT. Un secret aléatoire uniquement en mémoire signe les jetons locaux ; aucun .env ni compte de production n’est utilisé. La consultation des comptes est remplacée par trois fixtures internes ; le SQL documentaire s’exécute réellement dans PostgreSQL embarqué à travers un adaptateur du service de base.

Contrôles : absence d’authentification, rôle issu du compte plutôt que du jeton, obligation de changement de secret, version de session, filtre invalide, UUID d’opération invalide, titre trop long, édition, idempotence, conflit de révision, historique et auteur serveur, prix inchangé. Ce test ne remplace pas encore une exécution avec Prisma et le réseau PostgreSQL de préproduction.


## Répétition complète du catalogue
Après génération du baseline.sql décrit ci-dessus :

```bash
DOCUMENTARY_TEST_INPUT=/chemin/vers/dossier-documentaire node scripts/documentary/rehearse-catalogue.cjs --rehearse-local
```

Cette commande ne prend aucune URI et ne charge aucun .env. Elle construit une base PGlite locale complète, y charge les fixtures du catalogue actif, sauvegarde/recharge cette base, place toutes les propositions en revue, publie les seules candidates acceptées par les contrôles et restaure leurs textes. Les conflits d’unicité marque/titre restent des conflits par UUID et ne fusionnent jamais des produits. Sorties datées dans .local-postgres/documentary/runs : décisions, bilan et archive de la base de test. Ce n’est pas une sauvegarde de production.

## Sauvegarde réelle ciblée, lecture seule

`backup-native.cjs` requiert les outils PostgreSQL natifs vérifiés dans `.local-postgres/tools/extracted/usr` et un chemin privé de configuration source. Il ne prend jamais une URI en argument et n’affiche aucune valeur d’identifiant.

```bash
DOCUMENTARY_SOURCE_ENV=/chemin/prive/Back-end/.env node scripts/documentary/backup-native.cjs --backup-catalogue-readonly
```

Le programme garde une transaction readonly et partage son snapshot avec deux pg_dump : schéma public et données des cinq tables du catalogue. Il crée un cluster natif isolé, authentifié par un secret temporaire, accessible uniquement sur 127.0.0.1:55487 ; restaure les extensions requises avant les index ; restaure les données puis compare leurs empreintes. Serveur arrêté et fichier de secret supprimé à la fin.

Une archive déjà créée peut être revérifiée avec `DOCUMENTARY_RESTORE_EXISTING` pointant vers son dossier sous `.local-postgres/documentary/native-backups`. Dans ce cas, les empreintes sont comparées à une nouvelle lecture readonly de la source ; un écart arrête la validation. Aucun dump n’est réexécuté. Un nouveau cluster local est créé pour chaque tentative.

Les archives contiennent des prix, coûts et stocks existants et restent privées, hors Git. Elles excluent les données clients et les historiques de ventes. Elles ne constituent pas une sauvegarde complète de production. Ne jamais restaurer ces tables par-dessus une base active pour un retour arrière documentaire : utiliser rollback-batch, qui respecte les révisions et préserve les prix et stocks actuels.
