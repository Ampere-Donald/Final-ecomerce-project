# De la visite de Glotelho aux changements NEWOTEG

État vérifié le 3 octobre 2026. Base : rapport du 28 septembre et plan A–Z approuvé. Les changements ci-dessous concernent la branche locale `codex/newoteg-evolution`, pas le site publié ni Railway.

## Ce que la visite a conduit à recommander

Le rapport proposait de rendre l’achat plus certain : référence et caractéristiques compréhensibles, réception explicite, interlocuteur accessible, achat sans compte imposé et sélections utiles. Le design E validé est conservé. La visite ne démontre pas les causes du succès commercial de Glotelho ; les bénéfices doivent être mesurés après lancement.

| Recommandation | Application vérifiée dans le projet local | Effet attendu pour le client | Limite restante |
| --- | --- | --- | --- |
| Choisir la réception et éviter des frais inconnus affichés comme gratuits | Choix facultatif dans le header, fiche et panier ; préférence conservée au checkout ; changement impose une nouvelle vérification | Comprendre comment récupérer sa commande, sans ressaisir sa ville | Livraison : frais et délai à confirmer ; grille réelle de zones/poids non intégrée |
| Conseil WhatsApp lié à la pièce | Message éditable avec nom, référence exacte, quantité et lien ; ouverture par action du client | Poser une question précise avec moins d’aller-retour | Coordonnées et horaires commerciaux à valider ; aucun message automatique envoyé |
| Achat sans connexion obligatoire | Checkout invité, suivi/récupération, rattachement, annulation/réception avec preuve distincte, administration et entretien borné des codes intégrés localement ; reprise après coupure | Acheter, suivre et gérer une commande sans compte imposé ni doublons ; choisir ensuite le rattachement | Services email/SMS absents, envois désactivés ; activation et pilote réel encore ouverts |
| Sélections, arrivages et offres sur l’accueil | Pages projets et administration livrées ; offres, arrivages, tri et filtres au prix public testés sur backend/PostgreSQL locaux réels | Trouver du matériel utile et des prix commerciaux lisibles | Projet et offres réels à relire par NEWOTEG ; animation commerciale et recette globale |
| Fiches plus utiles techniquement | Comparateur lit les caractéristiques sources, références, prix et stock, et signale les données absentes | Choisir sur des critères explicites | Enrichissement du catalogue réel, datasheets et résumé par famille restent partiels |
| Boutique et retrait plus visibles | Retrait Akwa et conditions présentés près de l’achat | Savoir où et selon quelles conditions retirer | Photos, horaires, coordonnées et exploitation du statut prêt au retrait à confirmer |
| Avis vérifiés et mesure des parcours | API d’avis par ligne reçue, publication après modération, réponse boutique et signalements testés localement ; avis négatifs conformes conservés | S’appuyer sur des achats vérifiés ; différencier avis produit et réponse boutique | Interfaces, preuve invitée, photos et instrumentation à réaliser |

## Adaptations propres aux clients NEWOTEG

Ces recommandations complétaient l’observation de Glotelho. Elles ne sont pas toutes des fonctionnalités observées chez lui.

| Adaptation | Application locale | Limite |
| --- | --- | --- |
| Comparer deux ou trois composants | `/comparer`, sélection depuis catalogue/fiche, même famille, données actuelles, différences et champs inconnus | Comparaison ne prouve pas un remplacement compatible |
| Acheter le matériel d’un projet | `/projets`, liste nécessaire/facultative, quantités, estimation, relecture avant ajout de tout le groupe au panier ; éditeur administration avec brouillon et validation | Démonstration fictive disponible ; premier projet réel à valider avec un technicien |
| Demander un devis pour une liste de références | Saisie/collage référence + quantité, choix explicite des correspondances, traitement/affectation boutique, réponse, document imprimable et acceptation en commande | Migrations seulement locales ; règles commerciales et recette finale à compléter |
| Acheter à nouveau | Sélection depuis l’historique avec prix/stock relus avant ajout | Aucune commande automatique ; recette globale finale restante |
| Trouver un équivalent | Moteur existant conservé, explications et limites affichées ; aucune substitution automatique | Cas techniques réels et validation NEWOTEG encore attendus ; ne pas annoncer des équivalences garanties |

## Travail actuel et preuves

Suivi privé invité, récupération email, rattachement facultatif, actions d’annulation/réception et administration de l’accès intégrés le 3 octobre. NEWOTEG retient le SMS puis demande aussi l’email ; aucun fournisseur pour l’un ou l’autre n’est disponible. Envois réels désactivés. Treize contrôles PostgreSQL/HTTP/navigateur du suivi, neuf du rattachement, neuf des actions et six de l’administration passent, avec coupures et réponses perdues. Chaque action sensible exige un code distinct à l’email du checkout ; le rattachement exige aussi la connexion au compte cible. Le lien partagé seul n’accorde aucun droit de modification. Annulation, retrait, réception et édition administrative concurrents sont contrôlés côté serveur : un seul retour de stock ou encaissement. ADMIN/SUPER_ADMIN peuvent consulter l’état et révoquer l’accès sans révéler les clés ; une version ancienne ne peut révoquer un lien renouvelé. L6 reste ouvert pour l’activation et le pilote réel. Contrat : `SUIVI-INVITE.md` ; procédure : `GUIDE-SUIVI-INVITE.md`.

Les offres utilisent un prix public calculé par le serveur, avec date de fin. Le prix catalogue courant n’est pas présenté comme un ancien prix de vente. Les arrivages reposent sur les achats validés et le stock vendable restant ; une simple date de création de fiche ne suffit pas. Le lot est intégré localement ; ce n’est pas une preuve de mise en production.

Les 2–3 octobre, correction des états vides, de la hauteur des cartes arrivage et de la largeur d’une carte unique. Build et lint storefront réussis, 47 tests Node et huit contrôles navigateur simulés. Dix scénarios supplémentaires sur les vrais services et PostgreSQL local prouvent la réception d’achat, la commande promotionnelle, l’expiration, le rejeu et les conflits de stock/prix. Cinq contrôles HTTP/navigateur réels vérifient l’affichage et le récapitulatif, sans soumettre de commande depuis le navigateur. Deux défauts révélés par cette recette sont corrigés : concurrence caisse/web et exposition de coûts dans les produits d’une commande client. Captures dans `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial`. Contrat et limites : `OFFRES-ARRIVAGES.md`.

Les preuves datées des parcours déjà livrés sont dans `EXECUTION.md`. L4 et L6 restent incomplets, L7 est démarré et L8 reste à réaliser. La validation du catalogue, les décisions métier et la recette complète précèdent la publication ; L9 nécessite une autorisation distincte.

Le 3 octobre, tri, filtres, bornes de prix et comptage du catalogue passent sur le prix public, avec disponibilité après réservations boutique et lecture cohérente lors d'une édition concurrente. Six scénarios PostgreSQL et sept contrôles navigateur/HTTP réels réussis. Le client retrouve une offre à 2 800 FCFA dans un budget de 2 800, même si son prix détail est de 3 500. Détails : `CATALOGUE-PRIX.md`.

Le 3 octobre, entretien des codes/reçus livré et testé sur six scénarios PostgreSQL, programmé mais désactivé par défaut. Fondation des avis avec compte/modération : règle validée par l’utilisateur, 11 scénarios PostgreSQL/HTTP réussis, aucun avis fictif laissé sur le site. API uniquement à ce stade ; interfaces, preuve invitée et photos restent à livrer. Les fournisseurs email/SMS restent absents. Contrat : `AVIS.md`.
