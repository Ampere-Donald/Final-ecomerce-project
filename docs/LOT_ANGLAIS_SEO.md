# Lot anglais — préparation au 31 octobre 2026

État : traductions préparées et raccordement partiel aux composants, **aucune nouvelle URL anglaise publiée**. Les tâches SEO-30 à SEO-32 restent ouvertes. Ce lot travaille sur `codex/seo-languages`, séparément de la PR #34 qui conserve sa version française testée.

## Contenu traduit

- Vingt fiches : nom et description anglais, titre/texte de la note, deux points de vérification et libellés des sources. Les vingt identifiants et les références documentaires restent identiques au pilote français.
- Quatre guides : titre, résumé, sections, listes, tableau, limites, portée de revue et libellés des sources/liens. Le corps anglais n'entre pas encore dans le registre public des guides.
- Les cinq familles possèdent déjà leurs titres, descriptions et aides au choix en anglais. Leur accès indépendant via une URL anglaise reste à raccorder.
- Les pages de service disposent de chaînes anglaises existantes ; leur parcours complet devra être revu avec le routage localisé, les comptes et les actions de conseil.

Sources de traduction : `Font-end/editorial/product-english.json` et `Font-end/editorial/guides-english.json`. Les textes ne rajoutent pas de caractéristique technique, avis, certification, livraison ou condition commerciale. Les descriptions anglaises des produits sont adaptées pour ne pas conserver une ancienne mention de prix dans une copie éditoriale ; le prix reste la donnée commerciale courante.

Points conservés explicitement : suffixes 2N2907/2N2907A, distinction des formats de condensateurs, reconstitution de certaines zones d'images, fabricant non établi, absence d'indice IP documenté, limites de puissance continue de l'alimentation et catégorie CAT non confirmée des multimètres. Une traduction n'apporte aucune preuve technique nouvelle.

## Protection contre l'obsolescence

Les traductions portent une empreinte SHA-256 de leur source française exacte. Toute modification du texte, de ses sources ou de l'identité produit fait échouer la vérification au build jusqu'à relecture de la traduction. Les sources des traductions sont héritées du français, dans le même ordre ; le traducteur ne peut pas substituer une notice différente.

Les deux scripts `prepareProductTranslations.mjs` et `prepareGuideTranslations.mjs` vérifient les champs, la complétude, les dates réelles et l'égalité des projections générées. Ils refusent les copies périmées. Pour les guides, les sections, paragraphes, listes, tableaux, produits et sources conservent la structure revue ; aucun HTML libre n'est admis.

À l'exécution, `getProductTranslation` compare le nom, l'image, la description, la marque et le lien documentaire à l'identité française revue. Des attributs techniques nouveaux retirent aussi la traduction. Un changement de prix ou de stock ne périme pas les textes : ces valeurs restent issues de l'API. Le composant Product et son balisage utilisent le même nom et la même description traduits.

## Problème de langue observé et raccordement restant

Le provider actuel commence avec la langue du rendu initial, puis recharge `appLang` ou la préférence du navigateur dans un effet. La même URL française peut donc afficher un autre contenu après hydratation. Le bouton de langue actuel change l'état sans changer l'URL. **Ce comportement n'est pas encore corrigé dans cette préparation de contenu.**

Le raccordement doit couvrir ensemble les éléments suivants :

1. Résoudre le français depuis les URL existantes et l'anglais depuis `/en/`, y compris au rendu serveur et avant hydratation. La préférence locale ne doit pas modifier la langue d'une URL ; aucune redirection par IP.
2. Définir les correspondances pour les cinq familles, vingt fiches et quatre guides dont la traduction est complète. Un produit ou guide non traduit ne doit pas hériter d'une fausse version anglaise. Les paramètres de recherche et de pagination restent cohérents avec chaque route.
3. Adapter App, les liens de navigation et le sélecteur de langue, les parseurs de fragments produit/catalogue, les snapshots d'hydratation et les enveloppes validées. Ne pas simplement réécrire le préfixe d'URL après rendu.
4. Définir une canonical propre à chaque langue. Ajouter les liens `hreflang` réciproques et autoréférents seulement pour les versions réellement disponibles et admissibles. Les routes privées, brouillons et erreurs restent protégés dans les deux langues.
5. Alimenter le sitemap avec les traductions effectivement sélectionnées et admissibles. Une traduction de fichier n'est pas à elle seule une publication ; les fichiers anglais préparés ne sont pas ajoutés au sitemap actuel.
6. Vérifier les entrées directes, changement de langue, retour navigateur, stockage refusé ou de langue opposée, filtres, pages inconnues, conseil et panier. Comparer HTML, balisage et rendu après JavaScript.

Le détail du schéma sera choisi pour conserver les URL françaises et les contrats anonymes/versionnés de rendu déjà livrés. Il faut tester les préfixes de langue sur les routes privées et ne pas affaiblir leur traitement noindex/no-store. Le contexte de langue ne doit jamais modifier une requête d'authentification ni ajouter un préfixe aux endpoints API ou aux images.

Google demande que les versions se citent réciproquement avec des URL absolues et qu'une version se cite elle-même. Les annotations doivent refléter le contenu disponible ; elles n'en réalisent pas la traduction. Une seule méthode d'annotation cohérente suffit, sans obligation d'empiler HTML, en-têtes et sitemap. [Documentation officielle sur les versions localisées](https://developers.google.com/search/docs/specialty/international/localized-versions).

## Vérifications réalisées et limites

- 175 tests frontend réussis, dont contrôles des vingt traductions, des quatre guides, des sources et du retrait sur changement d'identité.
- Vingt rendus anglais avec les vrais composants Product, ProductEditorial et ProductSchema passent. Ce banc utilise les identités documentées et des prix/stocks inconnus : il vérifie les textes anglais et l'absence d'offre fabriquée. Ce sont des fixtures déclarées, aucune demande ou commande n'est écrite en production.
- Les rendus de composants ne vérifient pas encore une URL publique anglaise, une canonical anglaise, l'hydratation ou le comportement réel du navigateur. Le rapport l'indique explicitement avec `publicEnglishURLsVerified: false`.
- Lint et build vérifiés localement ; le contrat CJS compilé passe et les constructions indépendantes partagent la même identité de renderer. Le contrôle des artefacts éditoriaux français passe aussi : les quatre dossiers non validés restent hors des bundles et du sitemap. Les nouveaux textes ne sont pas encore publiés.

Preuves locales : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/language-*`. Le contrôle du navigateur reste désactivé dans Work au dernier constat ; aucun contournement de ce réglage n'est entrepris. Les questions sur retours/remboursements et horaires ont été posées au propriétaire sans bloquer les traductions indépendantes.
