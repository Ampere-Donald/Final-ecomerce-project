# NEWOTEG / X-Electronic — plan d’implémentation A à Z

29 septembre 2026 · Version validée par l’utilisateur · Exécution en cours dans un worktree isolé.

## 1. Résultat attendu et cadre

Livrer toutes les adaptations retenues dans le benchmark Glotelho : réception explicite, conseil contextualisé, catalogue technique fiable, équivalences explicables, achat par projet, comparaison, devis multi-références, commande invitée, nouvel achat depuis l’historique, avis vérifiés et mesure des parcours. Conserver la direction E, son header, la marque NEWOTEG / X-Electronic et la confirmation approuvée.

L’utilisateur a autorisé l’exécution du plan. Le travail se poursuit par lots dans un worktree isolé. L’environnement de production et la publication publique restent hors périmètre jusqu’à autorisation distincte sur une version précise et vérifiée.

« Tout appliquer » inclut les recommandations de sobriété : pas de région imposée à l’arrivée, pas de frais inconnus présentés comme gratuits, pas de promotions inventées et pas de champs internes exposés. Les applications natives, portefeuille, abonnement, marketplace et jeux promotionnels restent reportés conformément au rapport ; ils ne font pas partie de cet objectif.

## 2. Point de départ vérifié

- Application existante : storefront React/Vite dans `Font-end/src/storefront`, API Nest/Prisma dans `Back-end`, administration séparée.
- Le worktree `codex/refonte-e` contient la refonte et des travaux assemblés non encore enregistrés en fusion. Préserver les changements du dossier principal et contrôler à nouveau leur état au lancement.
- Catalogue, fiche, panier, compte, commande, reprise anti-doublon, retrait, annulation et réception disposent déjà d’intégrations et de preuves locales. Étendre ces fonctions sans recommencer la refonte.
- `Product.jsx`, `Header.jsx`, `Cart.jsx`, `Checkout.jsx`, `Account.jsx`, `Equivalences.jsx`, `Home.jsx` et `Editorial.jsx` sont les principaux points d’entrée UI.
- `CommandeController` expose devis et création ; suivi et actions client reposent actuellement sur l’identité du compte. Une commande invitée nécessite un vrai contrat serveur.
- Le modèle produit comporte déjà des attributs et des prix de demi-gros/gros. Leur présence ne définit pas les seuils ni les droits commerciaux à appliquer.
- Les routes `proformas` sont protégées par des droits administratifs ; réutiliser leur métier via une demande client dédiée, sans ouvrir ces routes au public.
- Le contrôleur `search` est administratif. La recherche publique doit continuer par les services catalogue autorisés.
- Moteur d’équivalences existant : préserver son intégration. Sa validation technique distante avait été différée. Ce plan la réintroduit explicitement dans le périmètre proposé ; elle ne reprend pas avant confirmation du plan.
- Déploiement non effectué. Ancienne migration demi-gros divergente, sauvegarde restaurable et préproduction distante restent à traiter. La répétition locale réussie ne résout pas à elle seule ces points.

## 3. Ordre de réalisation

Chemin principal : L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L9.

Les décisions commerciales et le travail éditorial peuvent avancer pendant la réalisation technique. Si une donnée externe manque, poursuivre les tâches indépendantes et consigner la dépendance ; ne pas remplacer une règle réelle par une valeur supposée.

| Lot | Livraison attendue | Dépendances | Critère de sortie |
| --- | --- | --- | --- |
| L0 — État de référence | Inventaire Git, version de départ, suivi des décisions, contrôles existants ciblés | Confirmation du plan | Travail existant préservé ; périmètre et écarts tracés |
| L1 — Données et règles | Modèle technique par famille, politique de réception, coordonnées et règles commerciales | L0 + équipe NEWOTEG | Données pilotes relues ; contrats UI/API décrits |
| L2 — Fiche et réception | Estimation, retrait, WhatsApp, bloc achat mobile, administration des zones | L1 | Même destination et mêmes frais de la fiche au devis ; frais inconnus explicites |
| L3 — Recherche et équivalences | Références normalisées, comparaison technique, explications et limites | L1 ; validation technique NEWOTEG | Cas documentés acceptés ; aucun remplacement automatique non confirmé |
| L4 — Projets et sélections | Listes de matériel, arrivages, offres réelles, gestion éditoriale | L1–L3 | Un projet pilote complet et achetable avec gestion des ruptures |
| L5 — Achat professionnel | Liste multi-références, demande de devis, traitement administratif, nouvel achat | L1–L3 | Une demande traitée de bout en bout, sans accès aux données d’autres clients |
| L6 — Commande invitée | Checkout sans mot de passe imposé, suivi privé et rattachement facultatif | L2 + contrat de commande stabilisé | Création, reprise, suivi et actions protégés sans compte obligatoire |
| L7 — Avis et mesure | Avis après réception, modération, indicateurs du parcours | L5–L6 | Preuve d’achat contrôlée ; événements utiles sans données personnelles |
| L8 — Recette et préproduction | Version enregistrée, migrations, environnement isolé, recette équipe | L0–L7 + accès et services réels | Aucun défaut bloquant ; exploitation et retour arrière prêts |
| L9 — Publication et observation | Ouverture autorisée, vérifications et bilan d’usage | Validation de L8 + autorisation de publication | Version publique vérifiée ; incidents et limites documentés |

Pas de délai ferme avant L0/L1 : la qualité du catalogue, les tarifs et les services externes dominent l’incertitude. Réestimer chaque lot après son cadrage ; livrer un résultat consultable à chaque fin de lot.

## 4. Détail des lots

### L0 — Stabiliser le travail existant

Inspecter les changements dans la copie isolée et le dossier principal ; identifier leur provenance avant assemblage. Vérifier les consignes de dépôt et les dépendances partagées. Créer un registre de tâches avec statuts à faire/en cours/validé/bloqué, responsable et preuve attendue. Les tests historiques sont conservés comme preuves datées, pas annoncés comme vérification automatique de la nouvelle version.

Identifier une version de référence récupérable. Enregistrer ensuite des lots cohérents dans Git sans inclure de secrets, de données réelles ou de gros artefacts locaux. Ne pas pousser un changement susceptible de déclencher un déploiement avant vérification de la configuration CI.

### L1 — Fiabiliser les données et fixer les contrats

Choisir un échantillon pilote de composants, cartes et outillage avec NEWOTEG, puis inventorier les champs manquants. Construire un dictionnaire par famille : référence fabricant, alias, unité vendue, boîtier, brochage, dimensions, tension/courant et autres paramètres pertinents, documentation, accessoires inclus, version et origine. Distinguer inconnu et zéro ; normaliser les unités sans effacer la valeur source.

Réutiliser les attributs existants lorsque leur structure convient. Préparer uniquement les extensions nécessaires, avec schéma, migrations additives, sauvegarde et reprise de données répétées localement. Les sources fabricant et la relecture technique fondent les caractéristiques ; ne pas inventer une fiche depuis le nom ou la photo.

Définir les états de devis de livraison : calculé, à confirmer, destination non couverte, retrait. Le serveur est la source du montant final ; le navigateur ne fixe ni tarif, ni remise, ni frais. Versionner la règle ou mémoriser son résultat dans la commande pour expliquer le montant accepté.

### L2 — Rendre l’achat et la réception explicites

Ajouter un choix de ville discret et facultatif dans le header E, mémorisé sur l’appareil. Sur fiche et panier : mode de réception, estimation, conditions du délai et lien boutique. Au checkout : quartier et repère, puis revalidation serveur du panier complet selon poids/volume et zone si ces règles existent. Le tarif d’un article isolé ne devient pas automatiquement celui d’un panier.

Prévoir changement de destination, zone inconnue, poids manquant et indisponibilité du service. Une livraison inconnue ne vaut jamais 0 FCFA. En cas de tarif à confirmer, présenter clairement une demande nécessitant validation ; ne pas autoriser un paiement définitif sur un faux total. Tester une modification de tarif entre devis et enregistrement avec nouvelle acceptation.

Renforcer la fiche : résumé technique court, galerie réelle, documentation, unité, stock et quantité. Sur mobile, une seule zone d’action persistante si utile ; elle ne masque ni champs ni navigation. Conserver la palette E et réserver chaque accent à un rôle cohérent.

WhatsApp : message préparé avec produit, URL, quantité et question éditable ; envoi effectué par le client. Aucun transfert automatique de coordonnées. Boutique : coordonnées vérifiées, photos, horaires, itinéraire. Définir puis intégrer l’état « prêt à retirer » distinct de « livré », avec droits administratifs et notification sur le canal réellement configuré. Ne pas promettre une notification qui n’est pas envoyée.

### L3 — Recherche, comparaison et équivalences

Faire passer la référence exacte avant les résultats approximatifs. Gérer casse, espaces, tirets et alias connus tout en préservant les suffixes qui distinguent deux composants. Proposer des critères propres à la famille, et un recours vers conseil/équivalence lorsque la référence est absente. Ne jamais interroger une recherche administrative depuis le site public.

Comparateur limité à deux ou trois produits d’une même famille, avec différences mises en évidence, unité, prix et stock. Les champs absents restent visibles comme non renseignés.

Réutiliser le moteur d’équivalences. Présenter référence recherchée, alternatives en catalogue, raisons, sources et limites. Séparer remplacement direct documenté, adaptation nécessaire et compatibilité à confirmer. La décision dépend aussi de l’application : demander ses contraintes lorsque nécessaire. Aucun score IA seul ne prouve une compatibilité ; aucune substitution silencieuse au panier.

Constituer avec un technicien un jeu de cas : correspondance exacte, référence absente, composant approchant mais incompatible, suffixe critique, mauvais brochage, rupture et aucune alternative. Les propositions incorrectes susceptibles d’endommager un montage bloquent l’ouverture du service pour la famille concernée. Prévoir délai dépassé, réponse malformée, fournisseur indisponible, limitation des appels et budget d’essai. Les secrets et appels fournisseur restent serveur. Une présélection catalogue reste identifiée comme telle.

### L4 — Projets et animation commerciale

Transformer les sélections actuelles en projets éditoriaux : objectif, niveau, matériel, quantités, accessoires nécessaires, documentation et contraintes. Chaque ligne est sélectionnable ; recalculer prix et stock avant ajout et au devis. Une liste incomplète ou avec une rupture doit être signalée, jamais présentée comme un kit complet prêt à fonctionner.

Créer dans l’administration la gestion des projets et sélections, brouillon/publication, ordre, dates et validation technique. Premier livrable : un projet pilote validé de bout en bout ; étendre ensuite aux autres projets approuvés. Utiliser vos propres visuels marketing et photos.

Accueil : quelques entrées utiles — dépannage, débuter, atelier, arrivages. Prix barrés, remise et fin d’offre uniquement avec des données commerciales vérifiables. Documenter les règles de cumul et les unités pour les lots. Pas de compteur de rareté artificiel.

### L5 — Devis et achats récurrents

Créer un formulaire public dédié référence + quantité, avec limites de lignes, validation des quantités et correspondances explicites. Afficher les lignes inconnues ou ambiguës et laisser le client choisir. Première version : saisie/collage de lignes ; import de fichiers reporté sauf besoin confirmé.

Créer une demande consultable par son propriétaire et par les rôles administratifs autorisés. Réutiliser le métier proforma derrière ce contrat, sans exposer routes ou marges internes. Définir validité du devis, frais, disponibilité et éventuelle réservation ; ne pas réserver de stock par défaut pendant une simple demande. L’acceptation relit les règles et débouche sur la commande autorisée, pas directement sur une facture ou un paiement.

États proposés : demande reçue, à préciser, devis envoyé, accepté, expiré/refusé. Administration : responsable, réponse, historique des modifications et document client sans données internes. Les seuils détail/demi-gros/gros viennent des règles validées, jamais du client.

Depuis l’historique, « Acheter à nouveau » prépare une sélection : prix actualisés, produits archivés, quantités disponibles et différences. Le client valide avant ajout ; aucune commande n’est créée automatiquement.

### L6 — Commande invitée et suivi privé

Proposer connecté ou invité, avec téléphone requis et e-mail facultatif selon la politique confirmée. Ne pas créer un faux compte ni un mot de passe implicite. Clarifier le modèle contact/commande invitée avant migration, en préservant les clients et commandes existants.

Prévoir un accès de suivi opaque, révocable et limité à la commande, protégé des journaux et de l’analytique ; son mode de transmission et de récupération doit être décidé. Un numéro de commande ou un téléphone seul ne donne jamais accès au suivi. Les actions sensibles et le rattachement à un compte demandent une preuve de possession appropriée. Limiter les tentatives et éviter de révéler l’existence d’un compte.

Conserver le requestId et l’idempotence durable : reprise après réponse perdue, rechargement et redémarrage sans double commande ni double stock. Adapter la preuve de reprise à l’invité sans stocker de mot de passe. Définir explicitement le cas d’un lien perdu ou expiré.

Après commande, proposer facultativement un compte et rattacher uniquement les commandes dont la propriété est vérifiée. Tester invité, compte existant, même téléphone partagé, lien incorrect/expiré, tentative d’accès à autrui, annulation, réception et changement de tarif. Les transitions de statut doivent être contrôlées par le serveur, pas seulement par les boutons UI.

### L7 — Avis et indicateurs

Avis lié à une ligne de commande réellement reçue, une contribution par achat selon la règle validée. Projet réalisé et photo facultatifs ; contrôle des fichiers, suppression des métadonnées inutiles, modération et possibilité de signalement. Rattacher aussi les avis invités à une preuve privée. Aucun faux avis, note vide affichée comme mauvaise note, ou suppression d’un avis uniquement parce qu’il est négatif.

Prévoir administration et réponse de la boutique. Les invitations par e-mail/SMS/WhatsApp ne partent qu’avec canal configuré et modalités approuvées ; le module ne suppose pas une campagne de messages automatiques.

Mesurer recherches sans résultat, ouverture fiche, ajout panier, abandon après frais, devis demandés, commandes enregistrées puis livrées/retirées, réachat et retours pour incompatibilité. Dédupliquer les événements de commande. Ne pas collecter noms, téléphones, adresses, jetons ou recherches libres susceptibles de contenir des données personnelles. Les clics WhatsApp ne sont pas des ventes. Établir une base et comparer des périodes comparables, sans promesse de croissance chiffrée.

### L8 — Recette complète et préproduction en ligne

Réaliser les tests utiles à chaque lot puis une recette transversale : référence → comparaison/équivalence → projet ou devis → réception → commande → préparation boutique → retrait/livraison → avis/réachat. Couvrir compte et invité, FR/EN, clavier, mobile 360/390 px, tablette et desktop, erreurs réseau et stock concurrent.

Vérifier l’accessibilité des composants modifiés, les performances avec débit limité et au moins un téléphone réel avec l’équipe. Définir et enregistrer les objectifs de performance avant mesure ; contrôler images, poids des pages, stabilité du contenu et interaction. Vérifier aussi liens, indexation, canonical et exclusion des pages privées.

Réconcilier l’ancienne migration demi-gros sans falsifier l’historique, préparer sauvegarde et restauration, répéter les nouvelles migrations et compatibilités sur une base isolée. Définir l’ordre backend/frontend/admin, le comportement pendant la transition et le retour à la version précédente sans perdre les commandes.

Configurer une préproduction séparée de la base boutique, protégée et non indexée. Aucune commande d’essai dans les données clients. Vérifier domaine/HTTPS, origine API, CORS, secrets, stockage, notifications et modes de paiement effectivement retenus. Les moyens de paiement affichés doivent correspondre à un encaissement réellement opérationnel ; une commande enregistrée n’est pas un paiement.

Remettre un guide court à l’équipe : traiter devis, préparer retrait, expédier, gérer un incident, corriger une fiche, modérer un avis. Valider responsables, horaires de réponse et procédure de support.

### L9 — Publication et observation

Présenter la version exacte, les preuves, les limites résiduelles, le plan de sauvegarde et de retour arrière. Obtenir l’autorisation explicite de publication publique. Déployer cette version, puis vérifier santé, catalogue, frais, compte/invité et suivi avec une procédure convenue qui ne perturbe pas les commandes clients.

Préparer journal des erreurs, suivi des notifications échouées et des commandes nécessitant intervention. Établir un bilan après une période représentative du trafic réel. Toute surveillance récurrente sera configurée uniquement si l’utilisateur la demande ; aucun travail différé automatique n’est présumé.

## 5. Décisions métier à regrouper au démarrage

| Décision | Réponse attendue de NEWOTEG | Travail possible sans réponse |
| --- | --- | --- |
| Réception | Zones, frais, poids/volume, délai, retrait, conditions du paiement à réception | UI et contrats avec données de test clairement fictives |
| Boutique et support | Adresse, horaires, téléphone, WhatsApp, responsable, délai de réponse réaliste | Composants et contenu en brouillon |
| Commerce | Seuils de quantité, remises, validité devis, réservation, retours et garanties | Infrastructure sans nouvelle promesse publiée |
| Catalogue | Familles pilotes, produits documentés, technicien validateur, projets prioritaires | Audit de complétude et structure des données |
| Invités et messages | Canal de suivi/récupération, fournisseur, accès et budget, règles d’invitation aux avis | Développement et tests locaux simulés ; activation suspendue |
| Équivalences | Réouverture de la validation fournisseur, références étalons, limites et budget d’appels | UI comparative et tests sans appels distants |
| Livraison logicielle | Cible de préproduction, accès, archive de migration demi-gros, procédure sauvegarde | Préparation locale, scripts et dossier de livraison |

Ne demander que les informations non présentes dans le projet ; regrouper les questions par décision plutôt que solliciter une confirmation à chaque modification. Consigner les réponses et ne pas les redemander sans changement de périmètre.

## 6. Critères de fin de l’objectif

- Toutes les recommandations actives sont reliées à un livrable et une preuve ; les éléments reportés sont explicitement identifiés.
- Design E conservé ; chaque fonction est utilisable sur mobile et ordinateur, avec données absentes et erreurs correctement traitées.
- Données et prix serveur autoritaires, accès privés vérifiés, reprise anti-doublon et stock préservés.
- Administration et procédures humaines permettent d’exploiter les nouvelles fonctions.
- Sources enregistrées, migrations répétées, recette et documentation à jour ; aucun défaut bloquant de confidentialité, paiement, compatibilité ou intégrité de commande.
- Préproduction prête à être évaluée par l’utilisateur. Si un accès, une règle métier ou une validation technique manque, le lot reste ouvert : ne pas le déclarer terminé grâce à un simple écran ou à une simulation.
- La publication publique est un jalon distinct, jamais déduite de l’approbation générale de l’implémentation.

## 7. Formulation prête pour le futur mode objectif

> Après confirmation de ce plan : implémenter dans NEWOTEG / X-Electronic les lots L0 à L8 de PLAN-IMPLEMENTATION.md, en conservant la direction E et le travail existant. Livrer des incréments fonctionnels, avec administration, règles serveur, tests ciblés, recette mobile/desktop, preuves et documentation. Réutiliser les moteurs catalogue, commande, proforma et équivalences. Recueillir les décisions métier nécessaires sans inventer de tarifs ou de compatibilités. Préparer une version de préproduction vérifiable ; ne pas modifier la production ni publier publiquement sans décision explicite. Signaler les dépendances externes et poursuivre les tâches indépendantes. L9 sera lancé après validation de la version et autorisation de publication.

L’utilisateur a confirmé ce plan et demandé le démarrage en mode objectif. Son exécution suit désormais le registre `EXECUTION.md`; la publication publique L9 reste à autoriser séparément.

