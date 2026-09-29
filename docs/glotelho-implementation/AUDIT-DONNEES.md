# Audit L1 — données, services et règles visibles dans le dépôt

Audit statique du code disponible au 29 septembre 2026. Il ne lit pas la base Railway ni des données client. Une absence constatée dans le schéma ne prouve donc pas qu’une valeur n’existe pas dans un outil métier externe.

## Données produit déjà structurées

Le modèle `Produit` dispose d’une référence interne (`codeFamille` + `code`), nom français, nom anglais facultatif, marque, description, catégorie, trois images, prix détail/demi-gros/gros, quantité minimale gros, stock, seuil d’alerte, promotion, poids, volume, lien de fiche technique et état actif. Les attributs techniques sont rattachés à la référence avec un type, un indicateur obligatoire et une ou plusieurs valeurs.

L’administration expose l’édition des attributs. Le storefront E lit ces valeurs sur la fiche et n’affiche la fiche technique que lorsqu’une URL est renseignée. La migration de données et le niveau réel de complétude par famille restent à mesurer sur un export catalogue autorisé.

## Limites à traiter par famille

Les noms de référence et le champ libre `Attribut` ne suffisent pas à normaliser ni comparer sûrement des valeurs comme tension inverse, tolérance, courant, boîtier et brochage. Le schéma courant n’enregistre pas, pour chaque caractéristique, son unité normalisée, sa source fabricant, une page précise de preuve, ni le statut « documenté / inconnu / à vérifier ». Les limites diffèrent selon le composant, la carte ou l’outillage; les mêmes champs ne doivent pas être imposés à toutes les catégories.

Le prix est nullable et l’achat E est bloqué lorsque le prix ou le stock est inexploitable. En revanche, le stock est entier avec valeur par défaut zéro; les produits dont le stock n’a pas été confirmé doivent être distingués par le processus de catalogue, sans être présentés comme disponibles. Les prix professionnels et seuils existent dans le modèle mais les conditions commerciales ne sont pas validées par ce seul fait.

Les sélections « Pour vos prochains projets » sont aujourd’hui des filtres de navigation vers le catalogue. Il n’y a pas de modèle de projet/kit versionné avec liste de composants, quantités, accessoires requis, documentation et validation éditoriale/technique.

## Réception, contacts et textes

Le checkout E actuel permet le retrait à Akwa et la demande de livraison. Il affiche explicitement que la couverture, les frais et le délai restent à confirmer; aucune livraison n’est ajoutée à zéro FCFA. L’utilisateur a validé ce cadre prudent pour le pilote.

Le code E reprend Camp Yabassi/Akwa et les coordonnées déjà présentes. Les anciennes pages et chaînes bilingues contiennent toutefois encore des mentions différentes, dont un retrait à Yaoundé/Bastos et des promesses de livraison immédiate. Elles doivent être retirées des parcours actifs ou corrigées avant la recette finale, après confirmation des textes opérationnels.

## Contrat proposé pour l’échantillon technique

Pour chaque famille pilote, conserver le libellé et l’unité source, une valeur normalisée quand elle est vérifiée, la source fabricant et la page/URL de preuve, la personne et la date de relecture, ainsi qu’un état explicite (documenté, inconnu, à vérifier). Une caractéristique inconnue reste absente/inconnue; elle ne devient ni zéro, ni compatibilité implicite.

Les premiers cas d’équivalence doivent contenir au moins une référence exacte, un remplacement plausible, un remplacement qui partage un marquage mais échoue sur un paramètre impératif et un cas sans candidat. Le dossier de recette antérieur décrit déjà une valeur fabricant erronée dans une réponse IA; aucune nouvelle campagne fournisseur ne doit partir sans les cas étalons et un budget d’essai validé. Les propositions demeurent des pistes et ne seront pas activées comme substitutions garanties avant la relecture d’un technicien NEWOTEG.

## Décisions toujours attendues

- Règles de demi-gros/gros : quantités par produit/famille, date d’application et confirmation que ces tarifs sont publics; à défaut, garder le devis sous revue manuelle.
- Produits pilotes documentés et technicien qui valide leurs valeurs et les cas d’équivalence.
- Canaux, horaires et engagement réaliste de réponse du support; coordonnées visibles réutilisées du site à confirmer par un responsable.
- La politique compte invité/suivi privé sera traitée au lot L6 après clarification du canal de preuve d’accès.
