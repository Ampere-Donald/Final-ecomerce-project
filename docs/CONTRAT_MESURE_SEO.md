# Mesure du parcours et attribution SEO

État initial constaté le 28 octobre 2026 ; implémentation préparée et testée localement le 30 octobre. Les paragraphes de proposition ci-dessous conservent leur contexte initial ; l’état livré est précisé en fin de document. Cette extension n’est pas encore publiée.

## Ce qui existe

`journeyData.js` construit des observations fermées : identifiant aléatoire propre à l’observation, jour Africa/Douala, événement, langue, appareil et réception. Aucun identifiant de visiteur, produit, compte, commande, recherche ou URL. `journey.js` envoie sans cookies, Authorization ou referrer, seulement si `/parcours/disponibilite` confirme l’activation. Le serveur utilise un reçu temporaire et une empreinte de dimensions pour dédupliquer les nouvelles tentatives d’un même événement.

`ParcoursJour` agrège par jour, événement, langue, appareil et réception. Le rapport est réservé aux rôles ADMIN/SUPER_ADMIN ; il lit séparément les commandes et demandes de devis depuis les enregistrements métier. Un événement navigateur n’est pas traité comme une commande ni un paiement. Lecture publique le 28 octobre 2026 à 15:05:57 UTC : `/api/parcours/disponibilite` répond HTTP 200 avec `actif: false`. Le collecteur n’est donc pas activé à cet instant ; aucun volume d’observations n’est supposé.

## Carte à compléter

| Étape | Preuve actuelle | Extension et règle de comptage |
|---|---|---|
| Consultation d’une fiche | FICHE_OUVERTE, hook useJourneyObservation | Conserver une observation par ouverture dans le composant ; pas un compteur de visiteurs uniques |
| Ajout au panier | AJOUT_PANIER | Conserver la distinction entre action locale et commande enregistrée |
| Ouverture du conseil | ProductAdvice.show ouvre le dialogue, sans observation dédiée | CONSEIL_OUVERT sur transition fermé → ouvert ; aucune copie du message |
| Ouverture de WhatsApp | WHATSAPP_OUVERT au clic du lien | Indicateur de clic seulement ; aucune preuve d’envoi, de demande reçue ou de vente |
| Début de devis | DevisBuilder contrôle les références puis reçoit les coordonnées | DEVIS_COMMENCE à la première interaction utile, une fois par document ; pas au simple affichage et sans transmettre les références |
| Devis transmis | Enregistrement métier DemandeDevis et rapport existant | Compter les créations uniques côté serveur ; une reprise idempotente ou une modification n’ajoute pas une nouvelle demande |
| Commande enregistrée | Commande, liens de provenance web et rapport existant | Compter les enregistrements uniques côté serveur, sans nouveau compteur navigateur de ventes |
| Réception effective | Statut LIVREE, dateLivraison et modeReception dans le rapport | Distinguer cohortes de commandes et réceptions de la période ; ni enregistrement ni réception ne prouvent à eux seuls un paiement |

## Attribution minimale proposée

L’agrégat actuel ne connaît pas la source d’acquisition. Il ne permet donc pas de calculer un taux de conversion SEO. Les appels FICHE_OUVERTE et AJOUT_PANIER ne doivent pas être divisés par les clics Search Console pour fabriquer un entonnoir individuel.

Préparer un contrat optionnel fermé `canalEntree` : RECHERCHE_NATURELLE, CAMPAGNE_PAYANTE, SOCIAL, SITE_REFERENT et DIRECT_OU_INCONNU. Le navigateur classe localement le domaine référent et les indicateurs de campagne autorisés ; il transmet uniquement l’énumération. Aucune URL, valeur UTM, requête, adresse ou conversation n’est conservée dans le collecteur public. Un référent absent reste DIRECT_OU_INCONNU ; il n’est jamais supposé naturel. La présence d’une campagne payante prime sur le domaine d’un moteur. Les URL internes ne remplacent pas la source d’entrée au fil de la navigation.

Cette classification constitue une attribution déclarative, avec les limites liées aux référents supprimés, bloqueurs, nouveaux onglets et parcours sur plusieurs appareils. Le rapport doit distinguer les événements observés et les demandes métier dont la source est renseignée ; il ne reconstitue pas un utilisateur.

Une liaison source → demande → commande exige un champ métier persistant absent du contrat actuel. Préparer une migration additive avec une source d’entrée optionnelle sur la demande et la commande, reprise lors de la conversion d’un devis en commande. Les écritures restent dans les transactions et mécanismes d’idempotence métier existants. Les anciennes lignes restent inconnues, sans attribution rétrospective supposée. Le DTO public n’accepte qu’une valeur de l’énumération et ne permet jamais de modifier une commande existante par un appel analytique.

Pour ventiler les observations, ajouter un agrégat séparé par canal plutôt que reconstruire la clé primaire de ParcoursJour pendant la publication. Le rapport historique conserve son sens ; les totaux historiques ne sont pas recopiés par canal. Les reçus de déduplication doivent couvrir le nouveau contrat et refuser la réutilisation d’un identifiant avec des dimensions différentes. Déployer d’abord le serveur compatible avec l’absence du champ, puis le client.

## Vérifications attendues

- Même observation renvoyée après un délai réseau : un seul incrément ; modification de canal avec le même identifiant : conflit.
- Double clic, reprise après réponse perdue ou acceptation d’un devis : une seule création métier et attribution conservée.
- Ouverture WhatsApp sans envoi et conseil fermé : aucune demande ou commande inventée.
- Référent absent, campagne payante, domaine ressemblant à un moteur, URL interne et stockage indisponible : classification bornée et absence de données brutes.
- Rapport interne : commandes et devis réels séparés des observations, période et fuseau explicites, taux non affiché lorsque son dénominateur n’est pas comparable.
- Aucun identifiant privé ou détail client dans les payloads d’observation, HTML public, JSON-LD, sitemap ou journaux de recette.

Le tableau initial doit afficher les volumes disponibles et « source inconnue » tant que l’attribution n’est pas opérationnelle. Les positions, impressions et clics Search Console restent un ensemble distinct, à importer lorsqu’un accès autorisé est disponible. Cette proposition n’annonce aucune donnée de trafic ou amélioration de classement.

## Implémentation du 30 octobre 2026

- CONSEIL_OUVERT est émis lors de l’ouverture du dialogue ; DEVIS_COMMENCE au premier texte non vide d’une nouvelle demande, une seule fois par document, même après remontage du formulaire. Le message, les références saisies et le produit ne sont pas inclus dans ces observations.
- `acquisition.js` classe localement l’origine parmi les cinq valeurs fermées. Les indicateurs payants priment ; les domaines référents sont comparés exactement ou comme sous-domaines, jamais par simple présence de « google ». La liste de moteurs est explicite : les domaines non reconnus restent SITE_REFERENT, et non arbitrairement SEO.
- La mémoire du document et un stockage de session facultatif conservent seulement la catégorie et un horodatage, valable au plus trente minutes lors du prochain document. Un refus de stockage n’empêche pas les achats. Il s’agit de la première origine retenue dans cette fenêtre, pas d’une attribution multicanal ni d’une identification de personne.
- Le canal optionnel est figé dans la tentative durable de commande ou de devis. Il entre dans l’empreinte uniquement lorsqu’il est renseigné : les anciennes tentatives restent compatibles. Une reprise avec un autre canal est un conflit, pas une modification de la source. L’acceptation d’un devis reprend la source de la demande côté serveur.
- La migration `20261028170000_add_acquisition_channels` ajoute deux colonnes nullables et `parcours_acquisition_jour`. Elle conserve toutes les lignes et contraintes antérieures. Les nouveaux événements sont stockés dans la nouvelle table, ce qui conserve la liste fermée de l’ancienne table. NON_RENSEIGNEE est réservé à la représentation interne d’un événement ajouté sans canal ; ce n’est pas une valeur acceptée du client public.
- Le reçu de déduplication et les incréments des deux agrégats partagent la même transaction. L’ancien rapport reste inchangé ; `?version=2` ajoute les nouveaux événements en regroupant leurs canaux. L’endpoint `/parcours/acquisition`, réservé ADMIN/SUPER_ADMIN et sans cache, distingue les devis, commandes enregistrées et commandes actuellement reçues, par canal. Les origines historiques nulles ont leur propre ligne.
- Le tableau d’administration charge la répartition séparément : une erreur de ce chargement ne masque pas les autres chiffres. Les deux périodes du rapport historique restent consultables. Aucun taux de conversion individuel n’est calculé à partir des observations.

Essai de migration : PostgreSQL 18 local isolé, schéma projeté de `56ed92a0` et contraintes du contrat de livraison reconstituées, puis véritable `prisma migrate deploy`, vérificateur de schéma/historique, transactions concurrentes et contrôles de conservation. Ce n’est pas une restauration des données de production ni une preuve de passage de tout l’historique sur base vide. L’essai de cet historique a échoué en juin sur une table `prime_vendeur` absente ; aucune réparation de production n’a été tentée. La répétition finale fixe explicitement les dates des données synthétiques pour ne pas dépendre du jour d’exécution.

Preuve finale : `output/seo-implementation/acquisition-final-rehearsal-2026-10-30/upgrade-report.json`. Recette navigateur avec collecteur simulé : une observation de conseil, un début de devis malgré plusieurs saisies et origine naturelle conservée pendant la navigation, sans transmettre références ni recherche. Les lectures API réelles du catalogue restent anonymes ; aucune observation, commande ou demande de test n’est envoyée en production.
