# Chargement initial du catalogue — 19 octobre 2026

L8 reste ouvert. Cette optimisation avance le chargement de la page client existante ; elle n'active pas le renderer Railway, un transport de messages ou le collecteur. Les étapes métier reportées par le propriétaire et le plan A–Z complet restent ouverts.

## Comportement

Le document démarre deux lectures publiques (produits avec les filtres exacts, familles) avant les scripts de l'application. Les composants réutilisent leurs promesses ; pas de second GET des mêmes produits lors du montage. Les données restent en mémoire au plus quinze secondes, sans cookies ni stockage persistant. Une lecture dépassant huit secondes est interrompue. Un échec revient à la requête habituelle ; le bouton de reprise force une nouvelle lecture, même après une réponse JSON de forme incorrecte.

La première photo est annoncée dès la réponse des produits, avec les mêmes URL, srcset et tailles que la carte. Seuls les uploads Cloudinary appartenant au catalogue et les WebP de product-images sont admissibles. Autres hôtes et originaux ne sont pas préchargés. Un navigateur sans préchargement responsive réutilisable conserve la découverte normale ; une erreur du hint image ne supprime pas les données. Un changement d'URL avant la réponse supprime le hint devenu inutile.

Le script précède les scripts anciens bloquant le parseur, tout en suivant le root pour reconnaître un catalogue déjà rendu côté serveur. Les documents privés, autres routes et URL catalogue non prises en charge n'effectuent aucune lecture anticipée. La source est minifiée au build avec cible ES2017 ; un opt-out de construction VITE_CATALOGUE_PREFETCH=false permet la comparaison et le retour au comportement précédent. Pas de nouvelle dépendance de production ni de migration.

## Mesure et limites

Le vérificateur exige maintenant un vrai produit visible : un écran « résultats indisponibles » ne peut pas être pris pour un catalogue rapide. Un premier essai local avec origine API absolue avait été refusé par CORS ; ses temps sont écartés. Le serveur de laboratoire a aussi été corrigé pour ne pas émettre simultanément Content-Length et Transfer-Encoding. Ces corrections du montage ne sont pas des incidents de production.

Comparaison finale : trois passages alternés avant/après, document et Worker locaux, même snapshot public GET partagé par l'adaptateur, CDN réel, Edge 390×844, CPU ×4, réseau 150 ms / 200000 octets/s, cache navigateur froid. Source et produit affichés vérifiés.

| Catalogue | Avant | Avec lectures/photo anticipées |
| --- | --- | --- |
| LCP, trois passages (ms) | 5016 / 5020 / 4756 | 4148 / 4580 / 3956 |
| Médiane (ms) | 5016 | 4148 |
| CLS maximal | 0,00471 | 0,00471 |
| Scripts externes compressés (octets) | 197184 | 197184 |

Gain médian synthétique 17,3 %. Le script inline ajoute du contenu au document, compté dans les mesures document. Le seuil LCP de 2500 ms n'est pas atteint. Pas de métrique terrain, INP ou téléphone physique ; le transport et le cache de l'adaptateur diffèrent de la production. Les temps locaux ne sont pas présentés comme un gain public confirmé.

## Vérification

- 131 tests Node passent ; lint des sources et builds modernes/legacy réussis avec origines API relative et publique absolue. Seules les sorties générées dist-prefetch-* sont exclues du lint de l'export de travail.
- Huit groupes du build final minifié : moderne/legacy, 390/768/1440, API et photo demandées avant libération des scripts puis réutilisées sans doublon ; changement de tri relu ; reprise après 503 et JSON de forme incorrecte. API fictive, pas de donnée boutique écrite ni d'erreur JavaScript.
- Deux scénarios d'hydratation de l'accueil passent : saisie et nœud de recherche conservés, suggestions clavier, filtre initial désactivé puis actif. Le design et les contrôles existants restent inchangés.
- Le script inline généré passe un parseur ES2017. Ceci vérifie la syntaxe, pas un appareil ancien physique.
- Un GET natif réel depuis l'origine newoteg.com vers l'API publique, credentials omit, retourne 200 et 24 produits : ce mode d'accès public est autorisé par CORS. Pas d'appel fournisseur ou écriture métier.

Preuves : paired-result.json, browser-result.json, header-hydration.json et public-native-fetch.json. Captures inspectées dans le dossier local de recette. Publication de cet incrément à vérifier séparément ; aucun critère métier reporté n'est clôturé par ces tests.
