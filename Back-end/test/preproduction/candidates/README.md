# Candidats de réparation — essais locaux uniquement

Ces fichiers restent volontairement hors de `prisma/migrations`. Ils ne sont pas chargés par le démarrage de l’application.

- `sales-prerequisites.sql` reconstitue trois tables et deux enums présents dans le modèle Prisma du commit `7d3c0f1`, mais absents de la création historique. Le script de répétition le place avant `20260607193000_sync_admin_sales_schema` dans une copie jetable des migrations.
- `align-sales-schema.sql` complète les valeurs de notification, la relation vendeur des ventes et celle de la caisse, aligne six clés étrangères des factures virtuelles, deux valeurs par défaut et un nom d’index. Les cinq index GIN de recherche sont conservés. La transaction empêche un alignement partiel.

La répétition utilise une base neuve locale et des factures, primes et produits fictifs. Les 46 fichiers historiques restent inchangés. Les deux ajouts portent la chaîne de répétition à 48 étapes.

Ne pas recopier ces candidats dans la chaîne active pour Railway : les tables prérequises y existent déjà. Une base peuplée peut aussi contenir des références empêchant l’ajout d’une contrainte. Le contrôle de structure ne constitue pas une vérification des données métier. Il faut définir une migration distincte selon l’état réellement audité, préserver l’historique appliqué et répéter sur une copie anonymisée avant déploiement.

Exécution depuis `Back-end` : `node test/preproduction/rehearse-history-repair.cjs`. La cible est imposée à PostgreSQL local sur 55439 ; aucun paramètre ne permet de choisir Railway.
