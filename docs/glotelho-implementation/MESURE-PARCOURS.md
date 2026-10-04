# Mesurer les parcours NEWOTEG

État du 4 octobre 2026, branche locale `codex/newoteg-evolution`. Lot L7 en cours. Serveur et observations des pages raccordés localement ; tableau de lecture administratif et registre d’incompatibilités encore à livrer. Collecte désactivée sur le serveur de démonstration. Aucun résultat commercial n’est établi par la recette fictive.

## Contrat livré

`GET /api/parcours/disponibilite` indique si le collecteur est actif. `PARCOURS_METRICS_ENABLED=false` par défaut : aucun compteur ni reçu n’est écrit et l’entretien programmé reste désactivé. Cette bascule ne constitue pas une validation du pilote.

`POST /api/parcours/evenements` accepte de 1 à 20 observations, avec un plafond de 15 requêtes par minute dans la configuration globale. Chaque observation contient exactement six champs : UUID v4 propre à l’observation, jour à Douala, événement fermé, langue FR/EN, classe d’écran et contexte de réception. Aucun nom, téléphone, adresse, recherche libre, URL, référence produit, compte, commande, session ou jeton. Les champs supplémentaires sont rejetés. Aucun identifiant persistant de visiteur n’est prévu.

Événements admis : `RECHERCHE_VIDE`, `FICHE_OUVERTE`, `AJOUT_PANIER`, `FRAIS_VUS`, `SORTIE_APRES_FRAIS`, `REACHAT_AJOUTE`, `WHATSAPP_OUVERT`. Les deux événements liés aux frais exigent un contexte retrait, livraison à confirmer ou livraison calculée ; les autres utilisent `GENERAL`. Une contrainte SQL impose aussi ces dimensions et un compteur positif.

Seuls le jour courant et le précédent sont acceptés pour une reprise courte après coupure. Même UUID et mêmes dimensions : un seul comptage ; dimensions modifiées : conflit. Reçu et incrément sont atomiques, avec ordre stable des verrous pour les lots concurrents. Une panne ne laisse ni compteur sans reçu ni reçu empêchant une reprise légitime.

`parcours_jour` conserve seulement les compteurs par dimensions. `parcours_recu` contient UUID d’observation, empreinte des dimensions et jour d’expiration, sans payload brut ni horodatage individuel. Expiration huit jours après enregistrement ; purge quotidienne de 2 000 reçus expirés au maximum par passage, sans effacer les agrégats. Les observations anciennes restent refusées après purge. La durée d’exploitation de l’historique agrégé et sa capacité sont à relire avant activation.

Le journal métier exclut cette route, y compris les variantes de casse et barre finale reconnues par Express. Il ne conserve donc pas IP, compte ou corrélation pour ces observations. Les journaux du proxy, de l’hébergeur ou du réseau devront être vérifiés en L8. Une panne de base produit une réponse générique sans payload Prisma dans le journal des exceptions.

## Raccordement des pages

Le navigateur vérifie une fois la disponibilité par document. Collecteur désactivé ou inaccessible : aucun POST d’observation, aucun achat bloqué. Requêtes `fetch` distinctes de l’authentification Axios, sans Authorization, cookie ni URL de provenance. Buffer en mémoire de 60 observations au maximum, lots de 20 espacés normalement de cinq secondes ; trois essais au maximum après coupure/erreur serveur, avec les mêmes UUID et payloads. Pas de stockage local/session, pas de suivi individuel. À la fermeture, l’envoi `keepalive` est tenté ; fermeture brutale, rechargement ou panne peuvent perdre des observations, sans inventer des résultats.

| Action | Déclenchement |
| --- | --- |
| Recherche vide | Réponse valide de la première page, recherche non vide et zéro résultat. Nouvelle recherche/filtres possibles ; tri et changement de langue seuls ne redoublent pas la même recherche |
| Fiche ouverte | Détail produit effectivement monté après succès, une fois par visite, même avec les rendus de contrôle React |
| Ajout panier | Augmentation de quantité effectivement appliquée et rendue par le réducteur ; aucun comptage de restauration, édition, suppression ou clic plafonné par le stock |
| Réachat | Ajout groupé réellement appliqué depuis l’historique ; également un ajout panier, jamais une commande automatique |
| Frais vus | Ligne de réception entièrement dans la fenêtre visible après devis valide. Retrait ou livraison à confirmer restent distincts ; pas de faux tarif calculé |
| Sortie après frais | Navigation hors checkout ou départ du document après exposition, sans commande connue ni tentative en cours/incertaine. Nettoyage React, édition du formulaire et changement d’onglet ne constituent pas un abandon |
| WhatsApp | Activation du lien du conseil produit/contact ou de la demande de disponibilité ; aucun contenu du message dans la mesure, aucune preuve d’envoi ou de vente |

Le retour d’une page conservée par le navigateur peut exposer les frais à nouveau, sans effacer l’état incertain d’une tentative. Les UUID utilisent aussi le générateur cryptographique de secours quand `crypto.randomUUID` manque ; aucune clé de commande n’est réutilisée. La classe d’écran indique la largeur de fenêtre, pas le modèle matériel ni l’identité du client.

## Rapport et interprétation

`GET /api/parcours/rapport?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ` exige ADMIN/SUPER_ADMIN avec rôle et version de session actuels relus côté serveur. Réponse privée, sans cache ni indexation. Période inclusive de 1 à 90 jours, dates réelles sans futur, fuseau `Africa/Douala`. Le jour en cours est signalé comme incomplet.

Les commandes et devis proviennent de leurs tables métier, jamais d’un événement de vente du navigateur. Une commande web possède un reçu de création ou une relation à une demande de devis. Plusieurs reçus de la même commande ne produisent pas plusieurs ventes. Les commandes anciennes sans provenance web démontrable sont comptées séparément et exclues des résultats web.

| Partie | Signification |
| --- | --- |
| Observations | Sommes par dimensions ; aucun visiteur unique ou parcours individuel reconstitué |
| Commandes enregistrées | Commandes web créées dans la période, y compris celles en attente ; aucun paiement supposé |
| Devis demandés | Demandes créées dans la période ; aucune vente supposée |
| Livraisons/retraits de la période | Commandes web actuellement reçues dont la réception est datée dans la période, même si créées avant |
| Cohorte | État actuel des commandes créées dans la période : livrées/retirées rapportées à l’effectif créé |
| Retours pour incompatibilité | `disponible=false`, `nombre=null` tant qu’il n’existe pas de registre dédié ; absence distincte de zéro |

La cohorte n’est pas un journal immuable de transitions : une période ancienne est relue dans l’état actuel. Une cohorte récente a eu moins de temps pour être reçue. Le taux vaut `null` sans commande. Comparer des périodes de même durée et de maturité suffisante ; séparer observations, créations et réceptions. Les clics WhatsApp ne sont pas des ventes. Une sortie après affichage des frais sera un signal d’interface, pas une preuve que les frais causent l’abandon.

Les observations anonymes peuvent être bloquées ou falsifiées avec de nouveaux UUID. Plafond et déduplication limitent les reprises sans garantir exhaustivité ou antifraude. Ne pas en tirer un chiffre financier ni un taux individuel de conversion.

## Preuves locales

- Build et tests ciblés Nest : calendrier, désactivation, payload fermé et confidentialité du journal.
- `Back-end/scripts/verify-parcours-local.cjs` refuse toute base autre que `127.0.0.1:55439/newoteg_quote_acceptance_test` avant Prisma. Tables de mesure vides exigées avant recette, nettoyage de ses fixtures exactes en `finally`.
- Six groupes PostgreSQL/Nest/JWT réels : désactivation/DTO ; rejeu/conflit ; concurrence/rollback ; rapport dédupliqué/confidentiel ; droits/session/dates ; expiration/contrainte SQL. Le plafond global n’est pas exercé par cette application Nest minimale.
- Migration additive `20261004100000_journey_metrics` comparée au diff Prisma hors ligne, avec contraintes SQL supplémentaires. Application locale seulement, aucun accès Railway.
- Preuve : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/parcours-server/result.json`. Fixtures fictives, aucune observation réelle de visiteur.
- 67 tests Node storefront, lint ciblé et build Vite réussis ; huit tests de mesure portent sur schéma fermé, calendrier, absence de POST si désactivé, rejeu exact, bornes mémoire/essais, concurrence réseau, réduction du panier et départ après frais.
- Recette navigateur : six groupes supplémentaires avec les vrais endpoints Nest/PostgreSQL de mesure, coques commerce/authentification simulées. Recherche contenant un email fictif non transmis ; entêtes sans jeton/cookie/provenance ; réponse perdue et reçu unique en base ; frais visibles, navigation, succès et réponse incertaine ; réachat ; collecte désactivée ; six largeurs et FR/EN. Le contrôle à 360 px retire la méthode native UUID pour vérifier le secours cryptographique, sans prétendre tester un ancien navigateur ou téléphone réel.
- Lancer cette recette uniquement avec `NEWOTEG_PARCOURS_TEST_DATABASE_URL` sur la base dédiée et `NEWOTEG_PARCOURS_BROWSER=true`. `verify-parcours-browser.cjs` est appelé par le script gardé, les observations sont enregistrées pour nettoyer leurs seuls reçus/dimensions. Captures 390/1440 px et résultat dans `captures/parcours-ui`, inspectés ; aucun service extérieur, paiement, commande boutique ou activation du collecteur principal.

## Suite L7

1. Ajouter la lecture administrative : périodes comparables, état désactivé/incomplet, séparation observations et données métier, limites explicites.
2. Préparer le registre des incompatibilités d’articles reçus et son traitement boutique. Les mouvements de stock d’annulation et les avis négatifs ne sont pas des retours pour incompatibilité.
3. Recette transversale et équipe, journaux, information de confidentialité et base de référence avant activation. L7/L8 ouverts ; publication L9 non autorisée.
