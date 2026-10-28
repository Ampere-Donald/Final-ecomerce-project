# Photographies de référence des enrichissements pilotes

Relecture du 28 octobre 2026. Les cinq fichiers publiés dans `Font-end/public/product-reference-images/` sont des copies des photographies de la boutique, sans recadrage ni génération. Ils sont ouverts à la demande depuis les sources de la fiche ; ils ne remplacent pas l’image principale ni les données commerciales.

| Fichier publié | Photo d’origine, dossier local image-produit | Correspondance catalogue |
|---|---|---|
| 2n3773.jpg | 3773.jpg | INV-0060 → 12cd34b9-bec9-4a1a-a67a-179ecb13b8b2 |
| awx-fs12v20a.jpg | Alimentation stabilisée 12v 20a étanche 5.jpg | INV-0140 → 7a4a260b-35bd-40ce-b246-d548a553432f |
| awx-fs12v5a.jpg | Alimentation stabilisée étanche 12v 5a 5.jpg | INV-0146 → 0992ba3a-ea7f-4264-81ce-0d07b7d6f847 |
| dt-830d.jpg | Multimetre digital dt83 series.jpg | INV-1338 → 3adebd14-a588-4b3a-b82a-26a95b3e7067 |
| yx-360tr.jpg | Multimetre analogique yx-360TRes;3pcs.jpg | INV-1337 → 8a3e12dd-f05d-4c32-a264-5569e068a561 |

Chaîne de rapprochement : `output/catalog-migration-2026-09-11/corrected-audit-v21/inventory-rebuild-dry-run.json`, champs `inventory_id` et `source_files`, puis `inventory-only-catalog-2026-09-28/plan.json`, champs `keep.productId`, `imageUrl` et `inventoryIds`. Les images publiques actuelles ont été comparées à cette dernière correspondance. Pour INV-1337, plusieurs candidats apparaissaient au premier audit ; la décision finale conservée par le plan d’inventaire fournit le produit retenu. Ces archives restent locales et ne sont pas embarquées dans le site.

Ces photographies datent de l’inventaire, pas d’un contrôle du stock actuel. Le texte parle donc d’archives et d’inscriptions observées. Il ne certifie ni authenticité, état électrique, indice IP ou catégorie CAT. Les noms historiques contenant un nombre de pièces ne deviennent pas des quantités vendues ou disponibles.

Les contenus versionnés comportent une empreinte d’identité explicite : nom, image, description, marque et lien documentaire attendus. Un changement de l’un de ces champs, ou l’apparition d’attributs techniques dans le catalogue, retire l’ancienne note jusqu’à relecture. Le prix et le stock restent issus de l’API et ne conditionnent pas cette identité.
