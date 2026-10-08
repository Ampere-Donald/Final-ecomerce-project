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
