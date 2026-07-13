# Déploiement et retour arrière Newoteg

## Préparation

1. Déployer depuis une révision Git identifiée et vérifiée.
2. Sauvegarder PostgreSQL avec `pg_dump` et noter la révision applicative.
3. Vérifier les variables listées dans `ENVIRONNEMENT_REQUIS.md`.
4. Exécuter la CI et conserver ses résultats.

## Backend

```powershell
cd Back-end
npm ci
npm run build
npm run prisma:migrate:deploy
npm test -- --runInBand
```

Le démarrage de production `start:migrate:prod` tente les migrations en premier et n’utilise `ensure-schema.js` qu’en secours.

Après démarrage :

- `GET /api/health` doit répondre 200 et trois contrôles `ok` ;
- vérifier une connexion par rôle ;
- effectuer une vente de recette sans valeur comptable réelle.

## Panneau admin et site client

```powershell
cd Font-end-admin\NEWOTEG-ECOMMERCE-feature-new-dashboard
npm ci
npx tsc --noEmit
npm run build

cd ..\..\Font-end
npm ci
npm run lint
npm run build
```

Publier les dossiers `dist` via le mécanisme actuel de l’hébergeur. Ne pas modifier les secrets dans les artefacts.

## Android

La CI produit l’artefact `newoteg-admin-debug-apk`. Pour une version signée, utiliser le keystore de production dans un gestionnaire de secrets et ne jamais le committer.

## Vérification post-déploiement

1. Santé backend et base.
2. Connexion SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER.
3. Ouverture de caisse, bon vendeur, encaissement, ticket et annulation de recette.
4. Coupure/retour réseau et disparition de la file locale.
5. Test Epson court, long, accents, duplicata et cinq impressions successives.

## Retour arrière

1. Arrêter le trafic d’écriture si l’intégrité des ventes est menacée.
2. Revenir à la révision applicative précédente par le mécanisme de déploiement, sans réécrire l’historique Git.
3. Si les nouvelles migrations sont compatibles, conserver la base et appliquer un correctif avant.
4. Si une migration de données est incompatible, restaurer le dump réalisé juste avant le déploiement.
5. Relancer `/api/health`, une connexion et une vente de recette.
6. Documenter l’incident avec les identifiants `X-Request-Id`.

Ne jamais utiliser `git reset --hard` ni supprimer manuellement des migrations sur un serveur de production.
