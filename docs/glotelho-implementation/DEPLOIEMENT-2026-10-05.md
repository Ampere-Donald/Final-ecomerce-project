# Publication NEWOTEG — 5 octobre 2026

## Autorisation et périmètre

L'utilisateur a demandé la publication sur la branche principale, puis explicitement autorisé la mise à niveau Railway malgré l'écart historique `add_demi_gros`. Cette autorisation remplace les anciennes mentions « L9 non autorisé » des journaux précédents. La direction E et les règles du pilote sont conservées. Les fournisseurs SMS/email restent absents ; aucun envoi ni paiement réel n'est activé par cette publication.

## Préparation vérifiée

- Branche d'intégration `codex/newoteg-evolution`, fusion de `main` à `2fa42e49` dans `85baf8f`. Les modifications non validées du checkout principal de l'utilisateur sont laissées intactes.
- Sauvegarde PostgreSQL 18.6 réelle, restaurée localement ; 14 migrations répétées avec Prisma 7.10.0. Comparaison des empreintes de toutes les lignes : 52 tables préexistantes identiques. Les 47 enregistrements historiques de migrations restent inchangés ; 14 nouveaux enregistrements ajoutés. Contrat de structure complet validé.
- Sauvegardes privées hors dépôt : `output/implementation-work/release-20261005/railway-before.dump` et `railway-predeploy.dump`. SHA-256 de la seconde : `9d1ca9504017565a3893b93334eebe258a3ba0c77100588299e9f39792494ec6`. Ces archives contiennent des données réelles et ne doivent pas être publiées.
- Précontrôle Railway en lecture seule : 47 enregistrements, 14 migrations à appliquer, aucun échec non résolu.
- 410 tests backend, 73 tests storefront, 23 tests de services admin, 113 tests d'interface admin et 11 tests de démarrage/contrat passent. Builds des trois applications, lint storefront et TypeScript admin passent.
- Audit de dépendances de production : backend et storefront sans vulnérabilité ; administration sans vulnérabilité élevée (une alerte faible de serveur de développement esbuild). Des alertes sur l'outillage de développement restent hors de cet audit de production. Prisma/client/adapter alignés à 7.10.0 ; adm-zip et Nodemailer corrigés ; surcharges ciblées deepmerge-ts/mysql2 pour les dépendances Prisma, validées par build, tests et répétition de migrations.

## Historique et démarrage

L'écart `20260615000000_add_demi_gros` n'est pas déclaré résolu : seuls le checksum enregistré `e30b0feda9fc83a9e64d3a4c51075300741f40fa33eaaf34ef937ced8032ab6b` et la source LF `6d6e422b61ca32767a5b959d2002fcb697f33c2bd09e93e673c4f1819db4e033` sont acceptés ensemble. Une variante CRLF strictement identique de `20260613_facture_virtuelle` est également identifiée par ses deux empreintes. Toute autre divergence, migration inachevée, inconnue ou dupliquée bloque le démarrage. Aucun `migrate resolve`, aucune réécriture de l'historique.

Les 13 migrations fonctionnelles sont suivies d'une migration de rapprochement du schéma historique : nullabilité du nom d'utilisateur conforme au modèle, défaut de date retiré, six clés étrangères alignées et index unique renommé. Aucun enregistrement métier supprimé ou modifié. Transaction avec délais d'attente bornés. L'ordre historique des valeurs enum est conservé ; le contrôle exige le même ensemble exact de valeurs.

Le démarrage vérifie les sources et l'historique, applique les migrations puis valide le schéma avant de lancer Nest. Le fallback `ensure-schema` qui continuait malgré une erreur est retiré. Railway attend `/api/health` avant d'activer la nouvelle instance. Configuration vérifiée dans [la documentation Railway](https://docs.railway.com/deployments/healthchecks).

## Déploiement et retour arrière

À compléter après confirmation des plateformes : SHA publié, identifiants Railway/Cloudflare et contrôles HTTP réels. Une préparation locale ou un push ne prouve pas la publication.

Versions antérieures repérées : Railway `1327d3f4-30c5-4257-9df0-cfc34bd9030b` ; Cloudflare client `7e2ac77b-9fb6-48c9-82b0-26b672af691f` ; Cloudflare admin `9370ada4-b00d-4da3-bd68-8e5f555c6c4e`. En cas de problème applicatif, revenir à une version de code compatible sans retirer les nouvelles tables. Ne jamais restaurer une ancienne sauvegarde par-dessus des commandes reçues depuis la publication. Une restauration de base nécessite une procédure séparée de conservation/reprise des écritures.

La mise en ligne ne valide pas à elle seule les opérations boutique, la délivrabilité email/SMS, le paiement en ligne ni les objectifs de performance mobile restants.
