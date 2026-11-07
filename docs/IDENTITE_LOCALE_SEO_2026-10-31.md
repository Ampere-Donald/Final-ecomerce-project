# Identité locale NEWOTEG — registre de préparation SEO-25/26

État au 31 octobre 2026 : audit des informations publiées et corrections proposées. Aucune fiche Google Business modifiée et aucune création de fiche effectuée.

## Faits et niveau de preuve

| Information | Valeur observée | Preuve et limite |
|---|---|---|
| Enseigne | NEWOTEG SARL | Lisible sur la photo existante `Font-end/public/images/7.jpeg`, inspectée visuellement. Photo non datée ; ne vaut pas vérification d'immatriculation ni preuve d'ouverture actuelle |
| Relation de marque | X-Electronic est présenté comme la boutique électronique de NEWOTEG | Page À propos et pied de page du storefront ; conserver cette explication, sans en déduire deux établissements distincts |
| Téléphone/WhatsApp principal | +237 699 966 160 | `shopContact.js` et fichiers JS effectivement servis en production, HTTP 200 ; aucun appel ou message de vérification envoyé |
| Ligne secondaire | +237 670 478 228 | Page Contact active et module public effectivement servi ; aucun appel de vérification |
| E-mail | contact@newoteg.com | Configuration et module public ; aucune vérification par envoi |
| Localisation publiée | Akwa, Camp Yabassi, Douala | Pied de page, À propos, Livraison ; Contact emploie aussi « Campyabass ». Zone cohérente, point exact de carte restant à confirmer |
| Horaires publiés | Lun–Ven 08:00–18:00 ; samedi 09:00–14:00 | Chaînes FR et EN du site public cohérentes. Validité opérationnelle, jours fériés et dimanche non confirmés par la boutique |
| Retrait | Attendre la confirmation de préparation/disponibilité avant de se déplacer | Parcours actif et page Livraison ; aucun engagement de retrait immédiat ajouté |
| Livraison | Ville/quartier à communiquer ; frais et délai à confirmer pour chaque commande | Pages et parcours actuels. Aucune couverture de toute l'Afrique ni délai national garanti établi |
| Société | Le site utilise « NEWOTEG SARL » | Cohérent avec l'enseigne photographiée ; aucun numéro administratif, adresse légale ou statut d'immatriculation vérifié dans cet audit |

Preuve technique du contenu publié : `output/seo-implementation/business-public-assets-2026-10-31.json`. Contrôles HTTP du document Contact et de ses modules publics, empreintes SHA-256 enregistrées. Ce contrôle du code livré ne remplace pas une observation du rendu navigateur ni une confirmation de l'exploitation réelle.

## Corrections préparées

1. Utiliser une graphie commune pour le repère géographique : « Camp Yabassi, Akwa, Douala, Cameroun », après confirmation du point précis. Conserver la dénomination officielle d'une voie ou d'un emplacement si elle diffère ; ne pas inventer un numéro de rue.
2. Clarifier si Direction/Showroom et Service/Logistique désignent un même lieu ou deux lieux distincts : la page Contact emploie deux intitulés avec la même zone. Ne pas créer deux fiches Google à partir de ces seuls libellés.
3. Conserver un numéro principal cohérent sur site, fiche Google et supports ; présenter la seconde ligne comme telle, sans la substituer silencieusement.
4. Remplacer le lien Maps de recherche de quartier par le lien exact de la fiche existante lorsque son identité est vérifiée. Le lien actuel `https://maps.google.com/?q=Camp+Yabassi+Akwa+Douala+Cameroun` ne prouve ni la présence d'une fiche Business ni le bon emplacement de la boutique.
5. Confirmer horaires ordinaires, samedi, dimanche et jours particuliers avant de les reprendre dans une fiche ou un balisage LocalBusiness. Ne pas déduire « fermé dimanche » de l'absence d'une ligne.

## Préparation de la fiche Google Business

L'audit du compte reste à effectuer lorsque le contrôle de Chrome sera rétabli. Les recherches publiques ciblées de ce passage n'ont pas permis d'identifier sans ambiguïté une fiche NEWOTEG ; cela ne prouve pas qu'elle n'existe pas. Aucun résultat concernant Newtech Express, une autre enseigne ou un autre numéro n'est assimilé à NEWOTEG.

Éléments à relever sur la fiche existante : URL exacte et identifiant de lieu, nom réellement affiché, état de gestion/vérification, catégorie, adresse et repère de carte, téléphone principal, site, horaires, photos et éventuels doublons. Comparer avec le registre ci-dessus avant de préparer des modifications champ par champ.

Nom proposé à examiner : **NEWOTEG SARL**, car il est lisible sur l'enseigne photographiée. Ne pas ajouter « composants électroniques Douala Cameroun » au nom pour essayer de gagner des positions. La dénomination retenue doit correspondre à la représentation réelle de l'entreprise. [Consignes Google sur la représentation des entreprises](https://support.google.com/business/answer/3038177?hl=en).

Description proposée, à relire avec les faits opérationnels :

> NEWOTEG et sa boutique X-Electronic à Akwa, Douala, proposent des composants, câbles, alimentations et outils de mesure. Pour préparer votre choix, communiquez la référence complète, le modèle de l'appareil et les caractéristiques utiles. La disponibilité est à confirmer avant un déplacement. Les modalités de retrait ou de livraison sont précisées pour chaque demande.

Cette description n'ajoute ni ancienneté chiffrée, ni certification fabricant, ni livraison garantie, ni superlatif de classement. Les catégories disponibles doivent être choisies dans l'interface réelle ; aucune catégorie supposée n'a été enregistrée.

## Médias existants sélectionnés

- `Font-end/public/images/7.jpeg` : façade et enseigne lisible ; candidate de repérage après vérification de son actualité. Elle ne donne pas à elle seule une adresse ou des coordonnées GPS.
- `Font-end/public/product-reference-images/2n3773.jpg` : exemple de marquage pour un contenu technique ; ne certifie pas l'authenticité de la pièce.
- `Font-end/public/product-reference-images/dt-830d.jpg` : identification visible de l'appareil ; ne vaut pas une preuve de catégorie de sécurité.
- `Font-end/public/product-reference-images/awx-fs12v20a.jpg` : photo documentaire utile pour relever les indications ; la puissance nominale demeure à confirmer.

Les cinq photos originales de référence sont déjà vérifiées et servies sur le site dans le pilote. Aucune de ces images n'a été téléversée sur un compte externe durant cet audit. Pour la fiche locale, préparer une nouvelle vue d'entrée et une vue d'ensemble représentatives de l'état actuel de la boutique.

Le registre distingue ainsi ce qui est publié, ce qui est photographié, ce qui est proposé et ce qui reste à confirmer. Les modifications de compte seront exécutées seulement dans le périmètre explicitement autorisé pour ce compte ; ce document ne constitue pas leur publication.
