# État de clôture du plan A–Z — 8 octobre 2026

Ce point remplace les anciennes estimations générales d’avancement et les mentions « non publié » du bilan du 4 octobre. La publication a été explicitement autorisée ensuite et réalisée. Elle ne clôture pas les critères métier du plan.

## Preuves actuelles

Contrôle public en lecture seule du 8 octobre à 03:25 UTC : /api/health 200, API/base/stockage ok ; /api/commandes/guest/channels retourne email=false et sms=false ; /api/projets?page=1&limit=1 retourne total=0 ; /api/parcours/disponibilite retourne actif=false. Preuve locale : output/implementation-work/launch-gates-20261008.json. Aucun envoi, commande, paiement ni modification de données.

Les preuves commerciales locales sont datées dans RECETTE-TRANSVERSALE-L8.md ; elles ne prouvent pas une opération réelle par l’équipe sur Railway. Les mesures de production les plus récentes et leurs limites figurent dans PERFORMANCE-PRODUCTION-2026-10-08.md. Les commits de correction sont publiés sur main, dont f8ad0790 pour les photos responsives.

| Lot | État constaté | Condition encore nécessaire pour clôturer |
| --- | --- | --- |
| L0 Référence | Sources et historique enregistrés ; copie principale préservée | Conserver cette traçabilité à chaque livraison |
| L1 Données | Contrats en place ; audit catalogue livré | Valider prix/champs techniques et responsables ; les 761 prix manquants de l’audit ne sont pas inventés |
| L2 Réception | Parcours testé ; règle Akwa/livraison à confirmer approuvée | Recette équipe et validation des informations boutique/support |
| L3 Équivalences | Moteur raccordé, choix explicite, scénarios logiciels testés | Cas réels relus par un technicien ; une proposition logicielle n’est pas une validation de remplacement |
| L4 Projets | Gestion et parcours implémentés | Aucun projet public actuellement : fournir puis relire un projet pilote et sa nomenclature |
| L5 Professionnels | Devis et réachat exercés en base isolée | Un opérateur doit accepter le processus de traitement réel et ses responsabilités |
| L6 Invités | Accès privé/reprise testés | Email et SMS désactivés : délivrabilité, récupération et procédure de perte d’accès restent à valider |
| L7 Avis/mesure | Modération et compteurs testés localement | Collecteur public désactivé ; activation, journaux hébergeurs, durée des agrégats et responsable de lecture à traiter |
| L8 Recette | Nombreuses preuves locales et contrôles publics | Budget LCP non atteint, téléphone réel/équipe, préproduction isolée actuelle et exploitation humaine non prouvés |
| L9 Publication | Storefront/backend/admin publiés, contrôles publics réalisés | Bilan sur période réelle comparable et traitement des limites ; pas de taux de succès inventé |

## Ordre de fin, sans réduire le périmètre

1. Poursuivre le travail technique indépendant : rendu initial/chemin JavaScript, contrôles des erreurs et préproduction isolée. Ne pas transformer une optimisation d’image en certificat de performance.
2. Faire relire un petit catalogue pilote complet et un projet par la boutique ; publier seulement les données validées. La question sur le projet et le technicien reste en attente dans la conversation.
3. Choisir et configurer les transports email/SMS lorsqu’ils seront disponibles ; tester réception et récupération sur adresses/numéros autorisés en environnement isolé. Ne pas demander de secrets dans le chat.
4. Vérifier l’exploitation des observations anonymes avant activation, puis tracer la date d’activation. Collecteur arrêté ne veut pas dire absence de visiteurs.
5. Faire la recette sur téléphone réel avec un opérateur : demande, confirmation boutique, préparation/retrait, incident, avis, réachat. Ne pas créer de fausses commandes dans la base clients pour satisfaire ce critère.
6. Clôturer lot par lot sur preuves, puis seulement déclarer l’objectif complet.

## Guides disponibles pour l’équipe

GUIDE-TRAITER-DEVIS.md, GUIDE-SUIVI-INVITE.md, GUIDE-INCOMPATIBILITES.md, AVIS.md et LECTURE-INDICATEURS.md décrivent les gestes et limites. Les phrases historiques « local uniquement » ou « publication non autorisée » y décrivent leur date de rédaction ; l’activation d’un fournisseur ou d’une collecte reste distincte du déploiement du code.

Aucun pourcentage global renouvelé : un chiffre unique masquerait les validations manquantes. Le présent audit ne refait pas tous les tests ni ne prouve la clôture de chaque exigence ; il identifie les preuves actuelles et les gates encore ouverts.

## Actualisation du 10 octobre

Les quatre gates publics ci-dessus ont été relus : état inchangé, API/base/stockage OK, transports invités et collecteur désactivés, aucun projet publié. Le travail L8 a comparé un préchargement conditionnel de routes au build V3 actuel : gain catalogue faible, accueil légèrement plus lent, budget LCP toujours non atteint. Le candidat a été retiré et n'est pas déployé. [Mesures, limites et décision](performance-20261010/README.md). Le rendu public initial et le temps d'exécution restent la prochaine cible technique ; aucun lot n'est clôturé par cette expérience.

Le rendu public initial de l'accueil a ensuite été implémenté et exercé : composants existants générés au build puis hydratés, sans donnée client ou prix figé. Médiane locale de l'accueil 4520 → 2376 ms ; un passage encore au-dessus de 2500 ms, catalogue toujours insuffisant et séries dispersées. Recettes de reprise, stockage bloqué, session, panier, langue, navigation et legacy réussies. [Preuves et limites](initial-home-20261010/README.md). Cette avancée ne clôt pas L8 ou les autres conditions du plan ; le statut de publication doit être vérifié séparément.

Publication effective de ce rendu vérifiée ensuite sur le domaine : version Cloudflare `5a5d0a92-b50f-49ef-8bc6-42543f6a3c43`, commit `96c94c03`. HTML initial et protections privées constatés, sept contrats de reprise et dix-neuf contrôles commerciaux publics réussis. Médianes synthétiques publiques : accueil 2960 ms / catalogue 5152 ms ; budget LCP encore manqué. API/base/stockage OK, transports et collecteur toujours arrêtés, zéro projet public à 09:48 UTC. Le catalogue et les autres conditions restent à traiter ; la CI GitHub distante n'a pas été vérifiée.

Le catalogue a ensuite reçu un prototype de rendu initial des vrais produits. Médiane LCP locale 4320 → 2356 ms, contrats locaux/distants réussis ; offre Workers Free confirmée et CPU réel médian 22 ms pour un plafond gratuit de 10 ms. Ce renderer reste expérimental et n'est pas activé en production. Le Worker temporaire de mesure a été supprimé. [Décision et preuves](catalogue-html-20261010/README.md). L8 reste ouvert : le coût serveur doit être réduit ou déplacé avant activation.

Cette exécution React a ensuite été déplacée dans un paquet backend optionnel, avec endpoint public, version concordante et repli client. Adaptation native testée : builds/lint, 102 tests frontend, 419 tests backend, contrats de paquet/HTTP/navigateur réussis, médiane locale comparable 4416 → 2048 ms. [Preuves et limites](catalogue-backend-20261010/README.md). L'image isolée Railway et la nouvelle mesure CPU Free ne sont pas encore réalisées ; candidat non publié, L8 et objectif A–Z toujours ouverts.

La vraie image Docker a depuis été construite et vérifiée en CI ; la CI complète (y compris Android et Windows) passe au commit d2c2d27e. Cinq routes du renderer compilé passent contre la base réelle en lecture seule et conservent exactement les données publiques. Dépendances de niveau haut/critique corrigées, sans suppression de gates. L'hébergement de cette image sur Railway et le CPU réel du nouveau transport restent non prouvés ; session de gestion Railway absente et association expirée. Sources prêtes à livrer, rendu catalogue non activé. Ces progrès ne clôturent pas L8 ou les validations métier du plan.
