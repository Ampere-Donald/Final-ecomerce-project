# Mesurer les parcours NEWOTEG

État du 4 octobre 2026, branche locale `codex/newoteg-evolution`. Lot L7 en cours. Cette livraison prépare le serveur : les observations ne sont pas encore raccordées aux pages et aucun tableau de lecture n’est intégré à l’administration. Aucun résultat commercial n’est établi par la recette fictive.

## Contrat livré

`GET /api/parcours/disponibilite` indique si le collecteur est actif. `PARCOURS_METRICS_ENABLED=false` par défaut : aucun compteur ni reçu n’est écrit et l’entretien programmé reste désactivé. Cette bascule ne constitue pas une validation du pilote.

`POST /api/parcours/evenements` accepte de 1 à 20 observations, avec un plafond de 15 requêtes par minute dans la configuration globale. Chaque observation contient exactement six champs : UUID v4 propre à l’observation, jour à Douala, événement fermé, langue FR/EN, classe d’écran et contexte de réception. Aucun nom, téléphone, adresse, recherche libre, URL, référence produit, compte, commande, session ou jeton. Les champs supplémentaires sont rejetés. Aucun identifiant persistant de visiteur n’est prévu.

Événements admis : `RECHERCHE_VIDE`, `FICHE_OUVERTE`, `AJOUT_PANIER`, `FRAIS_VUS`, `SORTIE_APRES_FRAIS`, `REACHAT_AJOUTE`, `WHATSAPP_OUVERT`. Les deux événements liés aux frais exigent un contexte retrait, livraison à confirmer ou livraison calculée ; les autres utilisent `GENERAL`. Une contrainte SQL impose aussi ces dimensions et un compteur positif.

Seuls le jour courant et le précédent sont acceptés pour une reprise courte après coupure. Même UUID et mêmes dimensions : un seul comptage ; dimensions modifiées : conflit. Reçu et incrément sont atomiques, avec ordre stable des verrous pour les lots concurrents. Une panne ne laisse ni compteur sans reçu ni reçu empêchant une reprise légitime.

`parcours_jour` conserve seulement les compteurs par dimensions. `parcours_recu` contient UUID d’observation, empreinte des dimensions et jour d’expiration, sans payload brut ni horodatage individuel. Expiration huit jours après enregistrement ; purge quotidienne de 2 000 reçus expirés au maximum par passage, sans effacer les agrégats. Les observations anciennes restent refusées après purge. La durée d’exploitation de l’historique agrégé et sa capacité sont à relire avant activation.

Le journal métier exclut cette route, y compris les variantes de casse et barre finale reconnues par Express. Il ne conserve donc pas IP, compte ou corrélation pour ces observations. Les journaux du proxy, de l’hébergeur ou du réseau devront être vérifiés en L8. Une panne de base produit une réponse générique sans payload Prisma dans le journal des exceptions.

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

## Suite L7

1. Raccorder les observations aux réussites effectives dans les pages, sans compter refus, chargement ou nettoyage React comme action client. Aucun envoi de recherche libre ou identifiant de commande ; panne du collecteur sans blocage d’achat.
2. Ajouter la lecture administrative : périodes comparables, état désactivé/incomplet, séparation observations et données métier, limites explicites.
3. Préparer le registre des incompatibilités d’articles reçus et son traitement boutique. Les mouvements de stock d’annulation et les avis négatifs ne sont pas des retours pour incompatibilité.
4. Recette navigateur et équipe, journaux et base de référence avant activation. L7/L8 ouverts ; publication L9 non autorisée.
