# L8 — Livraison, migrations et restauration

État au 4 octobre 2026 : préparation locale vérifiée ; préproduction en ligne et publication non exécutées. Le design E et la confirmation retenue sont conservés. Les avis restent limités à une ligne reçue, soumis à modération, avec maintien des avis négatifs conformes.

## Contrôle livré

`Back-end/scripts/release-schema.json` décrit les 68 tables du modèle courant : 787 colonnes, types SQL, précision, nullabilité et défauts, clés, relations et actions de suppression, index, enums et contraintes CHECK complémentaires. Le contrat provient du modèle source antérieur aux nouveaux lots (`79f606ec`), suivi des douze migrations additives réelles, puis d'une comparaison indépendante avec le modèle Prisma courant.

`start:preproduction` contrôle d'abord que ce contrat correspond aux sources emballées, **avant** toute migration. Il lit ensuite l'historique en lecture seule : seuls les nouveaux fichiers formant un suffixe encore en attente sont permis ; trous, doublons, noms inconnus, échecs non résolus et checksums divergents sont refusés. Puis viennent `migrate deploy`, le contrôle complet de schéma et enfin le serveur. Un échec arrête la chaîne ; aucun `ensure-schema`, `migrate resolve` ou remplacement de checksum. Le démarrage de production historique n'a pas été changé.

Le vérificateur lit uniquement les métadonnées et l'historique des migrations, dans une transaction répétable en lecture seule pour son CLI. Les checksums du registre sont comparés aux **octets exacts des fichiers déployés** ; la portabilité Windows/Linux de l'identité du contrat ne permet pas d'accepter un autre checksum historique. Des index/colonnes supplémentaires peuvent être conservés ; cela ne valide pas leurs effets, les triggers, privilèges, extensions ou politiques de la base.

PostgreSQL peut réécrire les casts/groupements de CHECK après `pg_dump`/`pg_restore`. Le contrat contient les quatre alternatives exactes obtenues par restauration de la base issue des sources. Il ne supprime ni casts, opérateurs ou parenthèses d'une expression inconnue pour la déclarer compatible. Une contrainte absente, affaiblie ou non validée est refusée.

Le Dockerfile de préproduction et l'allowlist de son contexte embarquent les deux fichiers du contrat. L'image actualisée n'a pas été reconstruite ni déployée dans ce jalon.

## Preuves locales

Recette : `Back-end/test/preproduction/rehearse-release.cjs`. Elle exige explicitement le cluster `quote_test@127.0.0.1:55439/postgres`, ignore les intégrations héritées, crée deux bases avec UUID propres et les supprime seulement après fermeture de ses connexions. Les autres bases ne sont pas modifiées.

- Les douze migrations du devis au registre d'incompatibilités s'appliquent séquentiellement sur le modèle source précédent. Toutes les lignes existantes, prix et quantités de stock fictifs restent identiques ; la structure précédente reste compatible. Cela ne constitue pas un test de l'ancien binaire applicatif.
- Le résultat correspond au modèle Prisma courant. Les contraintes personnalisées, absentes du modèle Prisma, sont également enregistrées et vérifiées.
- Défauts refusés : table projet absente, reçu invité incomplet, unicité d'avis supprimée, CHECK photo absent/non validé, CHECK retour absent/affaibli, suppression en cascade inattendue, précision numérique/nullabilité/défaut/enum modifiés, migration manquante/non terminée/inconnue ou checksum différent, contrat périmé. Un index historique supplémentaire reste accepté.
- Sauvegarde custom-format puis restauration atomique dans une autre base : toutes les lignes et octets comparés, y compris commande reçue, stock, clé hachée privée, reçu de reprise, avis à 1/5, octets de photo synthétiques et signalement. Le schéma restauré et le CLI en lecture seule passent.
- **31 contrôles réels PostgreSQL**, **9 tests du démarrage**, formatage et contrôle du diff réussis. Les bases créées par la recette sont supprimées. PostgreSQL 17 local ; le moteur de la cible réelle doit encore être répété.

Preuve : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/release-schema/result.json`. Les archives contiennent uniquement des fixtures synthétiques. L'historique `_prisma_migrations` utilisé pour tester le garde est **synthétique**, explicitement identifié ; les 46 migrations historiques n'ont pas été réexécutées par cette recette. Ce registre ne doit jamais servir de baseline déployable.

Exécution depuis `Back-end` sous PowerShell :

```powershell
$env:NEWOTEG_RELEASE_TEST_DATABASE_URL='postgresql://quote_test@127.0.0.1:55439/postgres'
node test/preproduction/rehearse-release.cjs
node --test test/preproduction/startup.test.cjs
```

`--write-contract` régénère le contrat **uniquement après** une restauration réussie. À employer lors d'une modification de schéma/migration, puis relire le diff et répéter sans cette option. Ne jamais générer le contrat depuis une base de production pour entériner une dérive. Quand une migration est ajoutée, revoir le périmètre et le nombre attendus de la recette.

## Ordre de livraison à répéter avant activation

1. Figer les commits backend, storefront et administration, dépendances et empreintes des artefacts ; désigner le responsable et la fenêtre. Maintenir email/SMS et collecte désactivés, retrait Akwa après confirmation, livraison avec frais/délai à confirmer. Aucun moyen de paiement ne doit être présenté comme opérationnel sans encaissement validé.
2. Préparer une préproduction distincte et protégée, sans données clients ni indexation ; vérifier HTTPS, origines API/CORS, secrets et stockage. Ne pas réutiliser la base boutique pour des commandes d'essai.
3. Réconcilier l'archive SQL demi-gros et les écarts historiques sur une copie autorisée. Obtenir le fichier effectivement déployé et comparer ses octets/effets au registre avant toute décision. Ne pas fabriquer un historique pour satisfaire le contrôle. Répéter les migrations sur la copie, avec le moteur et les droits de la cible réelle.
4. Vérifier une sauvegarde restaurable, ses droits d'accès et la conservation des fichiers externes. La recette actuelle couvre PostgreSQL et les photos d'avis stockées en base ; elle ne sauvegarde pas les autres médias, secrets, rôles ou infrastructures réels.
5. Pendant la transition, bloquer les nouvelles écritures aux points d'entrée client **et** boutique, terminer ou identifier les opérations en vol, puis sauvegarder. Installer le backend compatible, vérifier schéma/santé/contrats avant d'installer storefront et administration de la même version. Répéter la gestion des anciens onglets/caches avant de rouvrir les écritures.
6. Recette transversale réelle : référence → comparaison/équivalence → projet/devis → réception → commande → préparation/retrait ou livraison → avis/réachat. Compte et invité, FR/EN, clavier, réseau dégradé, stock concurrent ; contrôles d'indexation et performance avec objectifs fixés avant mesure. Puis téléphone physique et parcours de l'équipe.

## Retour arrière sans perdre les nouvelles commandes

- Avant réouverture des écritures, un défaut de livraison garde le site en maintenance ; réinstaller les artefacts précédents seulement après avoir répété leur compatibilité avec la base enrichie. Garder les tables additives et les reçus, sans migration descendante destructive.
- Après réouverture, restaurer la sauvegarde antérieure par-dessus la base courante ferait perdre les commandes et actions intervenues depuis. Ce n'est pas le retour arrière prévu. Suspendre les écritures, sauvegarder aussi l'état courant et privilégier correction en avant ou retour des artefacts compatible avec **la base courante**.
- Si une restauration devient indispensable, restaurer d'abord dans une base séparée. Réconcilier toutes les écritures postérieures (commandes, reçus de reprise, stocks/réservations, caisse, avis et décisions) sous contrôle du responsable, puis vérifier les totaux et doublons avant bascule. Cette réconciliation n'est pas automatisée ni prouvée par la présente recette.

## Éléments encore ouverts

Archive originale demi-gros et répétition historique sur copie réelle ; cible protégée de préproduction ; image actualisée ; fournisseurs email/SMS ; catalogue/projets et cas techniques validés par NEWOTEG ; conditions SAV et responsables ; recette de bout en bout, performances/indexation, téléphone physique et équipe. Les guides devis, suivi privé, modération, indicateurs et incompatibilités existent par module ; leur exploitation collective reste à valider. L8 et l'objectif A–Z demeurent ouverts. L9 exige une autorisation de publication distincte.
