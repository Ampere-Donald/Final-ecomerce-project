# Fraîcheur des données du pilote SEO

État examiné le 31 octobre 2026, après la PR #32. Ce contrat décrit le fonctionnement actuel ; il ne promet pas une synchronisation permanente entre un onglet ouvert et le stock.

| Donnée | Source et conservation | Conséquence |
|---|---|---|
| Prix et stock du HTML produit/famille | Lectures anonymes du backend à chaque rendu ; réponses `no-store` | Aucun prix ou stock de ces pages n'est figé dans le build éditorial |
| Prix et disponibilité JSON-LD | Même projection publique que la fiche rendue | L'offre décrit les valeurs affichées au moment de ce rendu ; prix/stock inconnus n'engendrent pas d'offre supposée |
| Première hydratation | Snapshot HTML partagé avec le navigateur ; requête initiale évitée si le snapshot a moins de 15 secondes au montage | Évite un deuxième chargement immédiat ; ce seuil ne déclenche pas une mise à jour automatique toutes les 15 secondes |
| Navigation catalogue sans snapshot SSR | Prélecture anonyme, `cache: no-store`, arrêt à 8 secondes, réutilisation en mémoire limitée à 15 secondes | Aucune persistance dans le stockage navigateur pour les résultats de cette prélecture |
| Onglet produit/catalogue ouvert | Nouvelle lecture au retour au premier plan ; anti-rebond d'une seconde | Sans changement de focus, action de réessai ou navigation, l'affichage peut vieillir ; ce n'est pas un stock réservé |
| Sitemap | Projection des références actives, sans prix ; `public, max-age=300` | La découverte peut conserver cinq minutes de retard ; une erreur produit une réponse 503 sans sitemap vide de remplacement |
| Notes et sources éditoriales | Données versionnées livrées avec le code ; retrait de la note si l'identité produit change | Le texte éditorial ne recopie ni prix ni stock ; relire lors d'une nouvelle preuve ou contradiction |
| CSS, JavaScript et images | Fichiers du déploiement ; noms de bundles hachés et 29 images restaurées à noms dérivés du contenu | Vérifier les octets livrés ; ne pas réutiliser une ancienne URL hachée pour des octets différents |
| Documents privés | `private, no-store`, `noindex, nofollow`, `no-referrer` | Ne pas introduire de cache public pour ces routes |

Les API commerciales existantes restent la source opérationnelle. La page et son JSON-LD sont une photographie publique de l'offre, jamais une preuve de réservation ou de paiement. Cette revue ne modifie pas les règles de prix, d'acceptation ni la transaction de stock.

## Budgets et refus

Le Worker borne la lecture du fragment catalogue à 2 secondes et celle du produit à 2,5 secondes, y compris la lecture du corps, avec une limite de 512 Kio. La validation des métadonnées possède un signal de 2,5 secondes ; son décodage JSON n'a pas de limite d'octets explicite dans ce module. Ces limites ne sont pas un engagement de temps de réponse total : la réception des assets, les autres appels et le transport jusqu'au visiteur s'ajoutent.

Le rendererId doit correspondre au backend et au Worker. Le Worker refuse un fragment incompatible et conserve le repli prévu. Un produit absent ou inactif reste en 404 ; une vérification indisponible reste en 503 avec Retry-After. Les validateurs de l'index partagé ne doivent pas provoquer une réponse 304 erronée pour une autre fiche.

## Contrôles et suite

Les suites `initialProduct`, `initialCatalogue`, `backendCatalogue`, `publicSitemap`, `serverMetadata` et la recette publique vérifient projection, limites, erreurs et données structurées. Le 31 octobre, les lectures produit/famille observées après activation portaient `no-store` et le sitemap `public, max-age=300` : `acquisition-production-enabled.json`. Les 29 images restaurées sont identiques aux sources par SHA-256.

La mesure mobile suivante montre une attente serveur variable ; elle ne justifie pas de mettre en cache les prix pour masquer cette attente. La prochaine optimisation prépare en parallèle les deux lectures indépendantes des fiches, avec tests de concurrence et maintien du contrôle des statuts. La charge soutenue, les délais sur les appareils réels et l'invalidation lors des évolutions de contenu restent à mesurer.
