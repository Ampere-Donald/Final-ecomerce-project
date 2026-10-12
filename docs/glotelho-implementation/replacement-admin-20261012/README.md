# Administration des cas de remplacement — 12 octobre 2026

Route candidate `/cas-remplacement`, réservée ADMIN/SUPER_ADMIN, accessible depuis la navigation d’administration. Mr Jude Fogueng reste le référent technique désigné par l’utilisateur. Aucun compte, dossier ou verdict réel n’est créé en son nom.

## Parcours réalisé

- Choix des pièces dans la recherche catalogue existante, référence d’origine avec suffixes/casse conservés, usage, document/page/révision, motif et limites.
- Quatre décisions distinctes ; adaptations requises pour le verdict correspondant. Référence absente du catalogue possible, avec fiche d’origine obligatoire.
- Sélection de 1 à 20 caractéristiques. Nouvelle lecture privée des preuves d’une seule pièce, paginée par 100 valeurs, sans coût/relecteur exposé ; aucune preuve étrangère au couple admise. Changer de pièces efface la sélection précédente.
- Sauvegarde et relecture séparées. Une modification locale désactive la confirmation ; après sauvegarde, le dossier et les sources sont relus depuis le serveur. Une sélection de sources actuelle ne prouve pas leur exhaustivité ni la validité physique du remplacement.
- Conflit de version ou d’empreinte : saisie conservée, écritures bloquées, rechargement volontaire. Une erreur temporaire autorise une nouvelle tentative sans perdre les champs. La confirmation humaine n’est jamais rétablie automatiquement.
- Consultation des preuves enregistrées et des 20 dernières relectures, avec leur usage, motif, limites, adaptations et documents. Retrait du cas possible sans suppression de l’historique. La liste des 50 derniers cas ne prétend pas qu’une ancienne relecture est encore valide : il faut ouvrir le dossier pour vérifier.

## Vérifications et portée

Builds backend et administration réussis, TypeScript admin et lint backend ciblé réussis. Dix tests UI ciblés couvrent confirmation/sauvegarde, adaptations, conflits, conservation/reprise, sources périmées, rôles et choix de pièce accessible.

La recette `verify-technical-provenance-local.cjs --replacement-browser` vérifie 28 groupes sur PostgreSQL/Nest/HTTP réels, avec les quatre migrations additives sur restauration synthétique : état historique préservé, sources, dictionnaire, registre, accès et pagination. Le formulaire du build admin crée, sauvegarde et relit par les vrais contrôleurs/JWT/DTO/services/base locale. La recherche de pièce, la session affichée et les appels sans rapport de la coque sont des adaptateurs de recette ; ce n’est pas une preuve de fonctionnement de toute l’administration distante. Deux vrais 409 sont provoqués : annotation seule modifiée et dossier modifié par un autre appel authentifié. L’historique reste conservé après retrait. Données et documents fictifs uniquement.

Contrôles et captures à 390 × 844, 768 et 1440 pixels : pas de débordement horizontal, champs et actions atteignables, attente de la transition de navigation avant les captures. La CI complète est à lire sur la tête exacte de la PR ; les preuves antérieures restent datées séparément.

`result.json` conserve la recette complète et `browser-result.json` les appels/assertions du navigateur. Les captures privées sont dans `output/implementation-work/replacement-admin-20261012/admin-browser`. Les trois bases temporaires sont supprimées après la recette ; aucun écrit Railway, commande, message ni appel de fournisseur.

## Ce qui reste à faire

Le registre et son administration sont préparés ; les décisions ne sont pas encore présentées dans le parcours public. Intégrer les candidats relus à la sélection même si la présélection lexicale les omet, puis présenter verdict/usage/limites en FR/EN avec reprise après erreur et sans réutiliser une décision périmée. Faire accepter les références pilotes et documenter les remplacements réels avec Mr Jude Fogueng. Les autres critères A–Z restent ouverts.

PR #10 toujours en brouillon, incrément non déployé. Préproduction et accès de gestion Railway différés conformément à l’instruction humaine. Livraison backend/migrations avant les interfaces ; maintien des structures additives en cas de retour applicatif. Cette recette ne prouve pas la migration de la cible Railway.
