# Catalogue : transport public et connexion aux images — 28 octobre 2026

Base 8c5c1022, fondations SEO de PR #25 conservées. Les lectures publiques du navigateur partaient directement vers api.newoteg.com alors que le Worker du site possède déjà un proxy /api. Le visiteur ouvrait donc une connexion distincte ; les lectures Axios avec X-Request-Id ajoutaient aussi un échange CORS. La compression gzip était déjà active : aucune dépendance ou modification serveur n’est nécessaire pour elle.

## Réalisation

Un sélecteur partagé envoie les GET produits/catégories par /api sur les seuls domaines HTTPS newoteg.com et www.newoteg.com, lorsque l’API configurée est celle de la boutique. Le script de prélecture et Axios utilisent le même choix. Les URL explicites externes, origines locales, endpoints privés et méthodes d’écriture conservent leur destination configurée. Les identifiants de requêtes restent transmis. Aucun nouveau cache de prix ou stock, aucune transformation de réponse et aucune nouvelle route backend.

L’origine configurée des médias et du renderer reste inchangée : ce transport ne doit pas créer une différence de src d’image entre HTML serveur et client. Une seule préconnexion à res.cloudinary.com est annoncée sur les routes catalogue autorisées, avant la réponse des produits, sans télécharger d’image devinée. Les originaux, variantes responsive et replis restent identiques. Le rôle DNS/TCP/TLS d’une telle indication est décrit par [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect) ; sa présence ne prouve pas un gain mesuré de toute la page.

## Vérifications

155 tests Node du dépôt, lint ciblé et build moderne/legacy réussis. [Cinq cas de transport sur le build](transport-browser.json) : domaine principal mobile, www bureau, chemin legacy, famille /catalogue/condensateurs et environnement local. Tri, prix/stock actualisés, favoris sauvegardés/rechargés, origine des médias et identifiants conservés ; les origines publiques restent sur le site, le local garde sa configuration. Le même contrôle échoue sur l’ancien build : les lectures vont au domaine API direct. Les données de ces contextes sont des fixtures isolées, aucun envoi ou écriture boutique.

[Quinze groupes catalogue](catalogue-browser.json) passent : prélecture avant styles/scripts, modules anticipés, image partagée, 24 cartes, variantes modernes/legacy, lenteur, erreurs/reprise, retour d’onglet, prix/stock, favoris et FR/EN. [Deux cas de recherche avant hydratation](header-hydration.json) passent avec champ/nœud conservés. Aucun composant visuel ou animation modifié.

## Diagnostic réseau et portée

[Relevé curl](network-timing.json) : proxy public autour de 0,36–0,76 s dans ces deux passages, API directe autour de 0,86–1,10 s pour les produits ; première connexion image environ 3,1 s contre 0,22 s sur l’autre passage. Échantillons courts, dépendants du réseau, pas des garanties de latence. La première invocation du binaire curl ne gérait pas --compressed ; le relevé retenu utilise Accept-Encoding: gzip et des compteurs de transfert sans décoder le corps.

[Mesures navigateur de transport](transport-timing.json), vrais GET anonymes sans application chargée : lectures initiales directes 2 357 / 878 / 1 668 ms, proxy 676 / 384 / 1 764 ms ; avec identifiant direct 1 052 / 823 / 2 413 ms, proxy 573 / 391 / 2 172 ms. Dispersion visible, dernier passage initial via proxy plus lent. Ce n’est pas une mesure LCP. [Observation CDP native](cors-diagnostic.json) : GET + OPTIONS sur l’accès direct avec identifiant ; GET seul via proxy, 24 lignes et HTTP 200 dans les deux cas. Les événements Playwright de page du premier diagnostic ne voyaient pas OPTIONS : ils ne servent pas à prouver leur absence.

[Mesure publique avant livraison](performance-before.json), 390 px / 1,6 Mbit/s / latence 150 ms / CPU ×4 / cache froid : LCP 3 052 / 3 716 / 9 368 ms, CLS 0. L’objectif 2 500 ms reste manqué. Après publication, vérifier les vrais transports, les photos et la même mesure ; aucune hausse des ventes, performance terrain, recette sur téléphone ou clôture A–Z n’est déduite de ces tests. Renderer, fournisseurs de messages et étapes métier reportées restent dans leur état explicite.
