# Pertinence de la recherche catalogue — 21 octobre 2026

Le serveur classait déjà code interne exact, référence fabricant relue, nom exact et alias relu avant les résultats approchants. La page catalogue imposait pourtant sort=name_asc après toute saisie, annulant ce classement. Les suggestions avaient leur propre présélection pertinente ; le défaut concernait le passage aux résultats complets.

Le contrat URL partagé utilise désormais relevance par défaut si la recherche n'est pas vide. Sans recherche, le catalogue conserve Nom A–Z. Le menu FR/EN propose Pertinence/Relevance pendant une recherche ; tris explicites nom/prix restent prioritaires, et vider la recherche rétablit le choix A–Z si le tri était pertinent. Aucune nouvelle règle d'équivalence, normalisation, donnée fabricant, migration ou priorité commerciale n'est créée. Les filtres serveur et suffixes restent conservés. Le script de lecture anticipée et le renderer utilisent le même contrat URL.

## Vérifications

133 tests Node passent, lint des sources et build public moderne/legacy réussis. Derniers changements main préservés, dont les deux nouvelles images produit. Douze parcours de build, moderne/legacy × FR/EN × 390/768/1440, utilisent le véritable contrôleur public, service et SQL PostgreSQL dans une base fictive isolée. Seul le transport navigateur passe par IPC ; pas de faux tri implémenté dans le navigateur de test.

Le jeu contient code exact, référence fabricant documentée, nom exact, alias, approchant, suffixe différent, indisponible et archivé. Contrôles : ordre exact, absence de coût/relecteur, une seule lecture anticipée, tri A–Z/prix puis retour pertinence, filtre stock, suffixe PB distinct de P, effacement et retour A–Z, aucun débordement/erreur JavaScript. Aucun article réel ou accès fournisseur. La première recette utilisait checkbox.check avec état Router asynchrone ; le test attend maintenant l'état coché et l'URL après clic, sans changement du comportement produit.

La recette complète donne trente groupes PostgreSQL/HTTP/contrôleur réussis et supprime ses trois bases temporaires. Elle reprend les quatre migrations déjà publiées sur des fixtures ; cet incrément n'ajoute aucune migration. Les preuves ne constituent pas une validation métier de remplacements physiques, une préproduction Railway ou une recette sur téléphone réel.

Publication de cet incrément à vérifier. Étapes métier 1 à 4 reportées, renderer catalogue, messages et collecteur désactivés, performance et objectif A–Z toujours ouverts.
