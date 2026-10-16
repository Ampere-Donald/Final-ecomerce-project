# Dictionnaire technique et comparaison par rôle — 12 octobre 2026

## Résultat pour l’utilisateur

Une caractéristique pouvait rester incomparable lorsque deux fiches utilisaient des libellés différents, ou sembler identique alors que deux champs « Tension » décrivaient l’entrée et la sortie. Le dictionnaire serveur associe maintenant 45 identifiants explicites à des libellés FR/EN dans sept groupes. L’administration choisit la clé ; le comparateur regroupe les valeurs par cette clé et affiche le rôle exact. Boîtier/Package peuvent partager une ligne ; tension d’entrée et tension de sortie restent distinctes. Sans clé, les attributs historiques restent comparés par leur libellé, sans attribution automatique.

Valeurs, unités et noms originaux sont conservés. Une clé ne fournit aucune spécification, normalisation, obligation de saisie ou règle de remplacement. Une modification de clé invalide la relecture courante sans effacer sa preuve. Le calcul existant reconnaît toujours 1 A / 1000 mA ; une case absente reste une donnée incomplète. Les sources de chaque produit restent distinctes, actuelles ou explicitement à relire.

Seules les clés Référence fabricant et Alias de recherche servent d’identités de recherche. Boîtier, tension et autres caractéristiques ne deviennent pas des alias du produit. Le dictionnaire public ne contient que des métadonnées ; coûts et identité du relecteur ne sont pas exposés dans les fiches publiques.

## Vérification et portée

- Builds backend, administration et storefront moderne/legacy réussis. Backend : 62 suites / 471 tests ; storefront : 117 tests ; administration : TypeScript et 13 tests ciblés UI/services réussis. Lint ciblé réussi. Avertissements de chunks supérieurs à 500 Ko toujours présents ; aucun nouveau budget de performance démontré.
- [result.json](result.json) : 21 groupes sur PostgreSQL local/Nest/HTTP, sauvegarde et restauration du schéma baseline synthétique, trois migrations exactes, lignes historiques et structure conservées, rôles/JWT/DTO réels, concurrence et invalidation. Les 45 clés sont acceptées par les routes admin réelles ; une clé ambiguë « TENSION » et l’écriture vendeur sont refusées. Les trois bases temporaires sont retirées.
- [browser-result.json](browser-result.json) : administration construite utilisant le dictionnaire et l’écriture du serveur de recette réel, avec confirmation HTTP de l’invalidation. Contrôles à 390/768/1440 px, champ non masqué après la transition du menu. Douze cas du comparateur construit : FR/EN, moderne/legacy, trois largeurs, clés, rôle entrée/sortie, sources par produit, conversion et absence de débordement. Aucune erreur JavaScript, sortie réseau externe ou écriture storefront.
- Les réponses produit utilisées par le navigateur proviennent du vrai service compilé et de sa projection publique. Un adaptateur de recette reflète ensuite le changement admin de clé et l’état obsolète ; ce n’est pas une lecture HTTP bout en bout du contrôleur produit. Les seules autres lectures du shell sont simulées. Produits, sources et relecteurs des captures sont synthétiques.
- Treize tests de gardes de livraison/démarrage réussissent après actualisation du contrat. Les contrôles d’images distantes concernent la tête CI exacte, à lire dans la PR ; les preuves antérieures ne valent pas pour une nouvelle tête.

Captures inspectées : [administration mobile](admin-390.png), [comparateur desktop](modern-fr-1440.png), [comparateur mobile](modern-fr-390.png). Le tableau défile horizontalement sur mobile, sans agrandir la page.

Recette reproductible : `Back-end/scripts/verify-technical-provenance-local.cjs --update-contract --dictionary-browser`, PostgreSQL local autorisé et previews de builds en loopback. Le navigateur exige le canal IPC de cette recette et refuse une cible extérieure. Aucun article réel annoté, appel fournisseur, email/SMS, commande ou écriture Railway.

## Livraison et suite

PR #10 reste en brouillon, cet incrément n’est pas publié. Trois migrations candidates additives : provenance facultative, clés de recherche nullable, puis 43 valeurs supplémentaires d’enum, sans reprise automatique des attributs. Backend/migrations avant administration et storefront. La répétition sur sauvegarde réelle Railway 18.6 du 11 octobre concernait UNE migration ; elle ne valide pas cette version à trois migrations. Préproduction Railway différée à la demande humaine.

Retour applicatif possible vers le baseline main antérieur à PR #10 en conservant les structures additives. Ne pas revenir à un backend intermédiaire qui ne connaît que les deux premières valeurs d’enum une fois les nouvelles clés utilisées ; ne pas supprimer l’enum ni réécrire les annotations pour forcer ce retour.

Mr Jude Fogueng, CEO et propriétaire, est désigné pour la validation technique. Le [dossier pilote](../catalogue-pilot-20261010/DICTIONNAIRE.md) consigne son rôle, sans compte ou relecture créés en son nom. Acceptation des références pilotes, véritables données/preuves par famille, décisions documentées de remplacement et pilote client restent ouverts. Le dictionnaire prépare L1/L3 ; il ne certifie aucune compatibilité et ne clôture pas l’objectif A–Z.
