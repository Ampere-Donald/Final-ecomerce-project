# Fiches publiques : métadonnées et statut initial

Le Worker consulte uniquement les routes publiques anonymes existantes /api/produits/:id et /api/projets/public/:slug, sur l'origine API fixe. Il ne transmet ni cookie, ni Authorization, ni recherche. Identifiant/slug validés, redirections non suivies, délai borné à 2,5 secondes. Aucun prix, stock ou compatibilité n'est inventé dans les métadonnées.

Produit actif avec identifiant correspondant ou projet public avec slug correspondant : titre/description issus de la réponse publique, échappés, canonical de la fiche. La disponibilité en stock n'est pas une condition d'existence de la page. Référence invalide, inactive, 404 ou 410 API : document 404/noindex. Panne, timeout ou contrat incohérent : document 503/noindex avec Retry-After 60, sans assimiler une panne à une suppression. HTML applicatif conservé ; React reprend les balises à son démarrage. HEAD produit le statut sans corps.

Réponses de fiches no-store et validateurs partagés retirés pour éviter une ancienne fiche après désactivation. Compromis : une lecture API supplémentaire avant le HTML, délai maximum borné ; aucun gain de performance annoncé. Le corps détaillé reste rendu par React, pas de SSR complet ni garantie de référencement.

Tests : 82 tests Node ; lint ciblé ; contrôles privés/404/assets dans Miniflare. verify-record-metadata.cjs valide également le vrai runtime et les statuts 200/404/503 avec API interceptée, aucun réseau extérieur. Cette recette a détecté redirect:error non supporté par workerd, remplacé par manual et refus des réponses non réussies. Les contrôles réels après déploiement doivent compléter ces preuves.
