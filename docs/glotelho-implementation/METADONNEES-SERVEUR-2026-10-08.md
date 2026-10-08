# Métadonnées publiques dans le HTML initial

Le Worker reprend la source de titres/descriptions du storefront pour les pages publiques statiques : accueil, catalogue, comparaison, projets, offres, arrivages, équivalences, guides, FAQ, livraison, boutique, contact, conditions, confidentialité et devis. Titre, description, robots, canonical quand pertinent, Open Graph et Twitter sont présents avant JavaScript.

Seules les balises marquées data-newoteg-fallback dans notre index.html sont remplacées. Le démarrage React supprime ces balises comme auparavant : le propriétaire client peut appliquer la langue choisie et les navigations sans doublons. Le serveur utilise le français par défaut, sans lecture de session ni personnalisation par cookie. Les entrées sont échappées ; les recherches libres ne sont jamais intégrées au contenu généré. Les pages privées et les fiches dynamiques ne sont pas transformées.

Les validateurs conditionnels de l'asset index.html commun ne représentent pas la réponse propre à une route : ils sont retirés avant lecture du binding et de la réponse transformée. API, uploads, ressources non HTML, erreurs et redirections conservent leur traitement. Réponse publique à revalider, aucun cache personnalisé introduit.

Validation : 79 tests Node, lint ciblé, runtime Miniflare/workerd sur dist-release avec sorties réseau interdites. Titre/canonical Catalogue et unicité de description présents dans la vraie réponse HTML ; protections privées, 404 et image intactes. Preuves locales : output/implementation-work/captures/server-metadata-20261008.

Limites : ce changement ne rend pas le corps React sur le serveur. Les données produit/projet et leurs 404 doivent encore être résolues depuis une source publique fiable ; les pages privées restent exclues. Aucun classement Google, crawler social externe ni amélioration LCP n'est déduit de cette validation.
