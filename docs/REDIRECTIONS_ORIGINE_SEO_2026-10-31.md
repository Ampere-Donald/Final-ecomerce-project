# Consolider les variantes d’origine des pages publiques

## Constat et comportement préparé

Le 31 octobre, les lectures anonymes avec le client Node natif ont confirmé que HTTP, HTTP/www et HTTPS/www servent l’accueil et une fiche en HTTP 200, sans redirection. Les canonical indiquent déjà `https://newoteg.com`. Le contrôle précédent avec un autre client avait expiré sur certaines variantes ; ces nouvelles réponses remplacent cette incertitude pour les URL effectivement lues.

La correction préparée sur `codex/seo-canonical-origin` répond **308 vers la même page sur HTTPS sans www**, en conservant le chemin et la chaîne de paramètres, pour GET et HEAD sur les documents publics définis par l’application. Elle intervient avant toute lecture d’asset ou appel au moteur de rendu. La destination ne dépend ni d’un en-tête de proxy ni d’un paramètre fourni par le visiteur.

Ce choix renforce la cohérence avec la canonical existante : Google décrit les redirections permanentes 301/308 comme un signal de préférence pour l’URL cible. [Documentation officielle](https://developers.google.com/search/docs/crawling-indexing/301-redirects).

Les documents privés gardent leur origine et leurs protections noindex/nofollow, no-store et no-referrer : aucune session existante n’est déplacée par cette correction. Les requêtes API, les fichiers, les routes inconnues et les méthodes d’écriture ne sont pas redirigés. Les aperçus locaux et domaines non reconnus ne sont pas concernés. Le sitemap reste servi par son contrat existant.

## Vérification

Les tests couvrent les trois variantes, chemins/paramètres, GET/HEAD, absence de boucle, destinations fixes, méthodes d’écriture, fichiers/API, routes privées et entrée réelle du Worker avant les assets. Le script `Font-end/tests/verify-origin-http.mjs` vérifie après publication neuf redirections, leurs destinations et leurs rendus, trois parcours privés et HEAD. Il n’utilise ni cookie de navigateur ni méthode d’écriture.

L’audit public préparatoire a aussi contrôlé pagination, filtres et erreurs : pagination 200 avec canonical propre ; filtres noindex ; comptes noindex et sans canonical ; références absentes ou invalides 404/noindex. Ces réponses ne prouvent pas un état Google d’indexation ni un comportement après JavaScript.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/public-policy-audit-2026-10-31/` et `origin-*`. Le client Python peut recevoir un refus Cloudflare 1010 ; le client Node natif utilisé ici répond sans usurpation de navigateur.

## Livraison et retour arrière

Ce lot est indépendant des guides et URL anglaises en préparation. Il part de `main` et ne change pas le contenu commercial, le schéma de base de données ni le moteur de rendu. Le build doit confirmer la même identité de moteur que la production avant publication du Worker. La CI générale et les trois profils runtime doivent réussir sur le commit proposé.

Avant publication, relever la version Worker active et conserver cette version comme retour arrière. Publier la version testée, puis exécuter la recette HTTP et vérifier la concordance du moteur. En cas de régression, restaurer le Worker précédent compatible et reprendre les contrôles ; aucune migration ou restauration de données n’est nécessaire. Les redirections portent `Cache-Control: public, max-age=300` ; un retour arrière ne promet pas une disparition instantanée de tous les caches clients.

État initial de ce document : correction préparée, publication non affirmée. Les identifiants de PR, de CI et de déploiement doivent être ajoutés aux preuves de livraison lorsqu’ils sont obtenus.


## Recette locale obtenue

169 tests frontend réussis, lint et build réussis. Identité du moteur compilé : `2038804f430092524ccdabd2f824add31975965d63899bbd350697b44f78041d`. Le point d’entrée produit du backend actif répond 200 avec cette même identité et un fragment produit valide : le Worker préparé ne nécessite donc pas un nouveau moteur backend.

Version Worker active relevée avant livraison : `a8a17247-3aeb-43be-96f1-323f39d6d823`, à 100 % dans le déploiement `f92d0894-35c0-494b-bccb-ac533acbee88`. Cette version compatible est le retour arrière prévu. Les résultats de CI et de publication ne sont pas encore affirmés dans cette recette locale.
