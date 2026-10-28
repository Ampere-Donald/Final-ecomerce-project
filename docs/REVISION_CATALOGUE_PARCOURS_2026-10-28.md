# Révision des fiches catalogue — parcours du 28 octobre 2026

## Utilisation

1. Ouvrir **Révision du catalogue** sur l’accueil.
2. Choisir une catégorie, puis une sous-catégorie ou **Toute cette catégorie**. La recherche porte sur les catégories ; **Sans sous-catégorie** permet de traiter les articles encore non classés.
3. Choisir une vue : **Tous**, **À vérifier**, **Propositions**, **À discuter**, **Entièrement vérifiés**. Les compteurs de ces vues suivent les filtres. Le total **Catalogue publié** reste le total des articles actifs, sans filtre. Le choix **Articles archivés** ouvre leur consultation séparée.
4. Commencer la vérification. La fiche complète réunit identification, tarifs, classement et photo. **Contrôle à enregistrer** permet de ne traiter qu’un de ces sujets. Le code interne reste inchangé.
5. Corriger puis enregistrer et passer au suivant. Un employé dépose une proposition ; un admin ou super admin valide directement ou accepte/refuse une proposition. Une validation partielle ne confirme aucun autre sujet ; les corrections préparées dans les autres sections restent en brouillon.
6. Revenir à la liste ou quitter. **Reprendre ma vérification** retrouve l’article et les filtres du compte sur cet appareil. Les textes sont stockés localement par compte et produit ; les photos sont conservées dans IndexedDB. L’envoi nécessite une connexion.

**Entièrement vérifié** signifie que les quatre contrôles correspondent aux versions actuelles de la fiche et qu’aucune proposition n’attend une décision. Un tarif simplement renseigné ne constitue pas une validation. Les anciennes validations des prix et du classement sont conservées ; les contrôles d’identification et de photo commencent à vérifier.

Les photos peuvent être agrandies ou remplacées par proposition. Les anciennes images ne sont pas supprimées par ce circuit. **Comparer un doublon** recherche un autre article et prépare un commentaire avec sa référence et son identifiant, sans fusion automatique. Les motifs de discussion facilitent le passage des articles incertains. L’indication d’un autre membre présent expire après 45 secondes et ne verrouille pas le travail.

Sur ordinateur, la validation d’une sélection du tableau reste limitée aux **prix**. Pour confirmer une fiche complète, l’ouvrir individuellement.

## Données et livraison

- Migration additive : `20261028150000_catalogue_review_workflow`. Révisions indépendantes pour identification et photo, informations de validation, référence fabricant facultative, présence temporaire de l’équipe.
- Le trigger PostgreSQL invalide uniquement le contrôle concerné et les propositions reposant sur les valeurs remplacées, y compris pour les imports et écritures extérieures. Stock et historique des ventes sont conservés.
- Endpoints authentifiés ajoutés : progression, présence et préparation d’une photo. Les décisions restent transactionnelles et idempotentes. Les métadonnées de contrôle sont retirées des réponses publiques.
- Contrat de démarrage régénéré à partir d’une répétition locale des migrations. La compatibilité `ensure-schema.js` applique aussi la nouvelle migration ; le démarrage de production reste soumis à la vérification de l’historique, à `prisma migrate deploy`, puis à la vérification du schéma.
- Sauvegarde complète fraîche avant la migration de production. Ne jamais commiter les sauvegardes ni les données de test locales.

## Vérifications réalisées

- 503 tests backend, 199 tests d’interface admin, 151 tests du site public.
- 15 scénarios PostgreSQL/API sur une base isolée : droits, propositions, historique, conflits, idempotence, contrôles séparés et validation complète, présence, filtres et archivage.
- 31 contrôles de répétition des migrations et restauration d’une sauvegarde synthétique ; 11 tests du démarrage de production.
- Contrôle TypeScript admin et builds backend, admin et site public.
- Composants réels dans un navigateur avec adaptateur de données fictives : sélection catégorie/sous-catégorie, nom modifiable, suivant, retour, restauration des textes et d’une photo après rechargement, comparaison de doublon.
- Aucun débordement horizontal observé à 360, 390, 768 et 1440 px. Barre d’action dans la fenêtre, y compris avec une hauteur réduite à 480 px. Le clavier physique d’un téléphone n’a pas été testé ; une fenêtre réduite ne reproduit pas entièrement ce comportement.

Les essais de parcours n’ont corrigé aucun prix ni nom en production. Les essais locaux ne prouvent pas la livraison réelle d’une photo vers Cloudinary ; le stockage local et le circuit d’acceptation ont été vérifiés séparément.
