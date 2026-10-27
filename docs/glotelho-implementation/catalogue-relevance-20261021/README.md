# Pertinence de la recherche catalogue — 21 octobre 2026

Le serveur classait déjà code interne exact, référence fabricant relue, nom exact et alias relu avant les résultats approchants. La page catalogue imposait pourtant sort=name_asc après toute saisie, annulant ce classement. Les suggestions avaient leur propre présélection pertinente ; le défaut concernait le passage aux résultats complets.

Le contrat URL partagé utilise désormais relevance par défaut si la recherche n'est pas vide. Sans recherche, le catalogue conserve Nom A–Z. Le menu FR/EN propose Pertinence/Relevance pendant une recherche ; tris explicites nom/prix restent prioritaires, et vider la recherche rétablit le choix A–Z si le tri était pertinent. Aucune nouvelle règle d'équivalence, normalisation, donnée fabricant, migration ou priorité commerciale n'est créée. Les filtres serveur et suffixes restent conservés. Le script de lecture anticipée et le renderer utilisent le même contrat URL.

## Vérifications

133 tests Node passent, lint des sources et build public moderne/legacy réussis. Derniers changements main préservés, dont les deux nouvelles images produit. Douze parcours de build, moderne/legacy × FR/EN × 390/768/1440, utilisent le véritable contrôleur public, service et SQL PostgreSQL dans une base fictive isolée. Seul le transport navigateur passe par IPC ; pas de faux tri implémenté dans le navigateur de test.

Le jeu contient code exact, référence fabricant documentée, nom exact, alias, approchant, suffixe différent, indisponible et archivé. Contrôles : ordre exact, absence de coût/relecteur, une seule lecture anticipée, tri A–Z/prix puis retour pertinence, filtre stock, suffixe PB distinct de P, effacement et retour A–Z, aucun débordement/erreur JavaScript. Aucun article réel ou accès fournisseur. La première recette utilisait checkbox.check avec état Router asynchrone ; le test attend maintenant l'état coché et l'URL après clic, sans changement du comportement produit.

La recette complète donne trente groupes PostgreSQL/HTTP/contrôleur réussis et supprime ses trois bases temporaires. Elle reprend les quatre migrations déjà publiées sur des fixtures ; cet incrément n'ajoute aucune migration. Les preuves ne constituent pas une validation métier de remplacements physiques, une préproduction Railway ou une recette sur téléphone réel.

Publication de cet incrément à vérifier. Étapes métier 1 à 4 reportées, renderer catalogue, messages et collecteur désactivés, performance et objectif A–Z toujours ouverts.


## Publication vérifiée le 21 octobre

PR #12 fusionnée sur main b623518cf0d452b3028ab1b0f8334a652722293b. Les changements main postérieurs observés concernent uniquement des images produit et conservent cet incrément. Les deux builds Cloudflare et les huit jobs CI du commit fusionné passent : CI 39616329774 et contrats/images 39616329719. API/base/stockage existants OK ; aucune nouvelle migration ni fonctionnalité backend de production ajoutée. Aucun déploiement Railway supplémentaire n’est attesté par les statuts GitHub de ce commit, et aucun accès de gestion Railway n’a été requis.

Bootstrap et sept ressources publiques modernes/legacy identiques par SHA-256 au build issu d’un export Git et d’une installation npm ci propres. Trois contrôles publics FR 390/1440 et EN 390 : vrai code 237091 en tête, Pertinence par défaut, tri manuel prix conservé, retour A–Z hors recherche et lecture anticipée unique. Deux accès privés admin renvoient la connexion, sans débordement. Aucune écriture métier ni erreur JavaScript ; RUM bloqué pendant les essais.

La CI avait initialement refusé deux nouvelles alertes de dépendances. Correctifs compatibles appliqués : follow-redirects 1.16.1 dans les deux interfaces, Vite admin 6.4.5. Audits de production sans alerte haute/critique ; une alerte esbuild faible préexistante reste explicitement connue côté admin. Les audits de développement ne sont pas déclarés exempts d’alertes. La CI n’a été ni désactivée ni assouplie.

L’incrément est publié. Dictionnaire et cas réels à relire par Mr Jude Fogueng, projet pilote, transports email/SMS, recette équipe et autres critères A–Z restent reportés ou ouverts. Cette recherche ne valide pas la compatibilité physique de deux références.
