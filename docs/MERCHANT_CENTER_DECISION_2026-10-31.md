# Merchant Center : décision pour NEWOTEG au 31 octobre 2026

**Décision : conserver le travail SEO des fiches et ne pas développer ni importer de flux Merchant Center à ce stade.** L'accès au compte et l'éligibilité de la destination Cameroun ne sont pas établis pour les fiches gratuites en ligne. Un programme publicitaire local apparaît dans la documentation, mais il ne constitue pas du SEO gratuit et aucun budget publicitaire n'est engagé.

## Ce que disent les sources officielles

| Surface | Constat documentaire pour le Cameroun | Conséquence pour le projet |
|---|---|---|
| Fiches gratuites en ligne / annonces Shopping classiques | Le Cameroun n'apparaît pas dans la liste de pays de l'aide « pays de vente non accepté », consultée en français et en anglais | Éligibilité non établie ; vérifier les pays effectivement proposés dans le compte avant un flux |
| Fiches **locales** gratuites, avec inventaire de magasin | Cameroun absent de la liste spécifique | Ne pas promettre cette diffusion gratuite locale à la boutique |
| Annonces produits en magasin / Local inventory ads | Cameroun explicitement présent dans la présentation actuelle du programme | Piste payante distincte, à confirmer dans le compte et avec la fiche de magasin réelle ; pas d'activation dans le lot SEO |
| Résultats enrichis de produit dans la recherche naturelle | Google décrit les données structurées sur les pages comme l'une des voies d'information produit, indépendamment de l'import d'un flux | Continuer Product/Offer/BreadcrumbList exacts dans le HTML et leur validation ; aucune garantie d'affichage ni de classement |

Sources : [pays de vente acceptés](https://support.google.com/merchants/answer/12472394?hl=fr), [programmes locaux et leurs listes distinctes](https://support.google.com/merchants/answer/14615117?hl=fr), [introduction aux données structurées Product](https://developers.google.com/search/docs/appearance/structured-data/product?hl=fr).

Les pages d'aide ne sont pas parfaitement homogènes : la présentation du programme local mentionne désormais une liste de pays plus large pour les annonces que la page générale des règles locales, qui conserve une liste commune plus restreinte. La page de disponibilité/tarification régionale cite également le Cameroun pour son propre module. Ces mentions ne prouvent pas l'accès de NEWOTEG aux fiches gratuites en ligne. La décision doit donc être confirmée dans la destination réellement disponible du compte, sans transformer une liste d'un autre module en preuve universelle. [Règles locales](https://support.google.com/merchants/answer/3271956?hl=en), [disponibilité et tarification régionales](https://support.google.com/merchants/answer/16782229?hl=fr).

## État réel du projet

- Aucun compte Merchant Center consulté dans cette séance ; existence, propriété du domaine, pays activés et diagnostics inconnus. Le contrôle des navigateurs est actuellement désactivé dans Work.
- La présence d'une propriété Search Console ne prouve pas l'existence ni l'approbation d'un compte Merchant Center.
- Le catalogue public expose des prix en XAF et des disponibilités, avec des valeurs parfois inconnues. Un code monétaire valide ne prouve pas qu'une destination Merchant accepte cette devise. Le contenu extrait de la page langues/devises ne permet pas ici de valider le couple Cameroun/XAF. [Langues et devises acceptées](https://support.google.com/merchants/answer/160637?hl=fr).
- Le parcours de commande indique qu'aucun paiement en ligne n'est réalisé à cette étape et que l'enregistrement ne constitue pas un paiement. Cela ne suffit pas à prouver le respect du parcours d'achat demandé par Google. Une carte bancaire n'est toutefois pas une obligation universelle : Google cite aussi facturation ou paiement à la livraison comme exemples de modes conventionnels. Vérifier le parcours effectivement proposé avant de conclure à sa conformité. [Consignes Merchant Center](https://support.google.com/merchants/answer/12756116?hl=fr).
- Les pages Contact, Livraison, Conditions et Confidentialité existent. La page Conditions active est présentée comme des conditions d'utilisation ; son contenu ne fournit pas dans le registre de traduction examiné une politique détaillée de retours/remboursements. Les conditions réelles de la boutique doivent être établies avant de les publier : ne pas inventer de durée, de frais, de garantie ou de remboursement pour remplir un champ Google.
- L'inventaire commercial actuel ne démontre pas un stock par code de magasin Google. Le lien Maps du site recherche le quartier et n'identifie pas encore une fiche Business précise.

Pour le programme local, les règles imposent notamment un lieu physique accessible et des données de magasin/inventaire cohérentes ; une association à la fiche réelle et d'éventuelles vérifications sont à prévoir. Le site n'a pas à proposer un paiement en ligne pour ce seul programme local, selon ses exceptions propres. [Exigences du programme local](https://support.google.com/merchants/answer/3271956?hl=en).

## Vérification suivante, avant toute construction de flux

1. Ouvrir le compte existant s'il existe et relever, sans activer de nouvelle campagne : identifiant du compte, domaine vérifié/revendiqué, pays de vente proposés, destinations autorisées et diagnostics.
2. Vérifier séparément la destination choisie, la langue française, la devise réellement acceptée et le marché où la boutique peut vendre/livrer. Ne pas choisir un faux pays pour contourner une limitation.
3. Pour une piste locale, identifier la fiche Business vérifiée et son code de magasin, puis distinguer inventaire en magasin et stock global du catalogue.
4. Établir les conditions commerciales : possibilité d'achat, mode de règlement, réception, livraison le cas échéant, retours et remboursement. Vérifier leur présence réelle et compréhensible dans le parcours.
5. Si le canal devient pertinent et accessible, préparer seulement un pilote de 20 références : prix et stock connus, photos conformes, identifiants fabricants établis lorsqu'ils existent, liens stables et cohérence avec la fiche.

## Contrat de données à réutiliser si le pilote est autorisé

Les valeurs commerciales proviendront de l'API courante, jamais d'une copie dans les guides. Réutiliser l'identifiant produit stable, le nom/description publics, le lien `/product/:id`, l'image réelle, le prix et la disponibilité. Les notices documentaires ne prouvent pas une marque, un MPN ou un GTIN : ne pas fabriquer ces identifiants et ne pas déclarer automatiquement leur absence. Le conditionnement et l'état doivent aussi être établis. Les exigences exactes seront choisies selon la destination, pas recopiées d'un modèle générique. [Spécifications des données produit](https://support.google.com/merchants/answer/7052112?hl=fr).

Un pilote devra échouer explicitement sur donnée commerciale inconnue, produit inactif, incohérence de prix/devise ou image indisponible. Aucun identifiant de client, commande, marge ou coût d'achat n'entrera dans ce flux. Les règles d'inventaire par magasin seront ajoutées seulement lorsque le magasin et son code sont vérifiés.

## Travail effectué et limite

Étude documentaire primaire terminée ; aucun flux produit généré, aucun fichier importé, aucun compte créé ou modifié, aucune campagne ni dépense engagée. La vérification du compte reste ouverte. Les actions SEO déjà publiées — HTML produit, données structurées exactes, familles et sitemap — conservent leur utilité sans supposer une admissibilité à un programme Merchant particulier.
