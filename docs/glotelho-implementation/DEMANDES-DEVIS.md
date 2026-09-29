# Contrat réalisé — demandes de devis

29 septembre 2026. Lot L5 en cours : formulaires, suivi client, précisions et file boutique raccordés dans le code. La migration est préparée localement et n’a pas été appliquée à Railway. Les essais ont utilisé des API simulées et des objets de base de données simulés; la persistance réelle reste à vérifier.

## Routes disponibles dans le code

| Route | Accès | Comportement |
|---|---|---|
| `POST /devis/resolve` | Public, limitation des requêtes | Cherche jusqu’à huit candidats actifs par référence. Le suffixe est conservé. Une correspondance exacte ne sélectionne pas automatiquement le produit. |
| `POST /devis` | Compte client | Enregistre une liste, les coordonnées de réception et les identifiants explicitement choisis. Le propriétaire vient du JWT, le nom du compte serveur. Aucun prix client n’est enregistré. |
| `GET /devis/mine` | Compte client | Ses 100 demandes les plus récentes. |
| `GET /devis/mine/:id` | Compte client | Une demande de ce propriétaire, sinon réponse introuvable. |
| `PATCH /devis/mine/:id/precision` | Compte client | Modifie sa demande seulement si elle attend des précisions, avec version et identité de tentative. Rejouer la même précision ne remplace pas les lignes une seconde fois. |
| `GET /devis/admin` | Super admin, admin, vendeur | Les admins voient la file; un vendeur voit ses demandes et celles non affectées. |
| `PATCH /devis/admin/:id/reponse` | Super admin, admin, vendeur | Réponse à préciser, refus ou offre envoyée. Un vendeur ne modifie pas la demande affectée à un autre vendeur. |

## Données et invariants

- Une liste contient 1 à 50 lignes, références de 100 caractères maximum et quantités entières de 1 à 100000. Les références inconnues restent dans la demande pour clarification; elles ne deviennent pas un produit supposé.
- L’identité de tentative est un UUID. Une empreinte lie la liste, les coordonnées, la réception et le propriétaire. Une répétition identique retrouve la demande; un changement sous le même identifiant ou une autre identité est refusé.
- Les références choisies sont relues sur le serveur et doivent être actives. Aucun stock n’est réservé lors de la création ou de la réponse.
- Le client lit une projection explicite. Identifiant de tentative, empreinte, historique administratif, notes de proforma, coûts et informations d’autres clients ne font pas partie de cette réponse.
- Une réponse requiert la version actuellement affichée. Le changement de statut et son événement sont enregistrés dans une transaction sérialisable.
- Pour envoyer une offre, la proforma doit être accessible selon les règles existantes, appartenir au client de la demande, être en cours et non expirée. Chaque ligne correspond à une référence active distincte, avec quantité et prix exploitables; le total doit correspondre aux lignes.
- L’offre client conserve un instantané de ses lignes, de son montant et de son expiration. La disponibilité observée est informative; les frais de livraison inconnus restent `null`. Aucune commande, facture, ticket de caisse ni paiement n’est créé par cette réponse.
- Une précision remplace la liste dans la même transaction que son changement de version et l’historique des anciennes/nouvelles lignes. Elle retourne au statut reçu. Le nom canonique des produits est relu sur le serveur.

## Écrans raccordés

- `/devis` : une référence par ligne, quantité séparée par point-virgule ou tabulation; 1 pièce si la quantité est omise. Toute ligne invalide bloque l’import complet. Recherche explicite, choix des candidats sans sélection automatique et lignes inconnues laissées à préciser.
- Le brouillon est conservé dans l’onglet pendant la connexion. Après association à un compte, il ne s’affiche pas dans un autre compte. La tentative d’envoi, enregistrée avant la requête, garde le même UUID et payload après réponse perdue/rechargement. Une tentative illisible bloque un nouvel envoi au lieu de risquer un doublon.
- `/mes-devis` et `/mes-devis/:id` : consultation privée, réponse boutique, liste, réception et proposition. Le client peut préciser une demande au statut `A_PRECISER`; le résultat actualise la même demande.
- Administration `/demandes-devis` : file, filtres, détail, historique et réponse. Le vendeur voit seulement les demandes accessibles selon son affectation; la première réponse affecte une demande libre à son auteur. Le formulaire propose seulement les proformas en cours et non expirées du même client et, pour un vendeur, ses propres proformas.
- Le formulaire existant de proforma permet désormais de choisir le compte client associé. Un nom identique ne suffit pas à relier une proposition à la demande d’un client.
- Aucun e-mail ou WhatsApp n’est envoyé automatiquement par ces écrans. « Réponse disponible » signifie disponible dans le compte client.

## Vérification locale

- Backend : 19 tests dédiés aux demandes, plus les 9 tests existants de devis de commande/checkout ciblés; build Nest réussi. Droits, relecture canonique, version, proforma invalide, précision et reprise sont testés.
- Storefront : 21 tests Node, dont 4 sur l’import et les tentatives de devis. Recette navigateur `verify-devis.cjs` : 9 contrôles avec toutes les API interceptées, dont connexion, frais à confirmer, 360/390/768/1440 px, réponse perdue, précision, accès privé et stockage illisible.
- Administration : typage TypeScript et build Vite réussis; 28 suites UI, 69 tests, incluant la sélection d’une proforma du bon compte, la réponse unique pendant l’envoi, la relecture après erreur et l’association du client dans une proforma.
- Les captures de recette sont des fixtures locales. Elles ne sont pas des données boutique et ne prouvent pas une recette Railway.

## Travail suivant nécessaire pour terminer L5

1. Acceptation privée d’une version précise de l’offre : relecture de la proforma, de son expiration, des prix autorisés et du stock, puis création idempotente d’une commande. Une proforma modifiée, supprimée ou transformée ne peut pas être acceptée comme l’ancienne offre. La consultation affiche aujourd’hui un instantané; elle n’autorise pas un achat aux anciens prix.
2. Document client imprimable limité à l’offre; affectation/réaffectation explicite avant réponse et préparation guidée de proforma depuis la liste, avec reprise d’une création interrompue.
3. Recette de persistance et concurrence sur base isolée; règles métier de validité, frais et prix professionnels à confirmer avant mise en service.

La présence d’un statut `ACCEPTEE` dans le schéma prépare cette suite; aucun endpoint d’acceptation n’est encore exposé. Les routes de proformas restent protégées par l’administration.
