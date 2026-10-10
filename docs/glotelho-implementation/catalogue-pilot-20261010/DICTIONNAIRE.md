# Dictionnaire technique pilote — proposition L1

10 octobre 2026. Contrat de préparation à relire par la boutique ; aucune caractéristique ajoutée au catalogue et aucun remplacement certifié.

## Provenance commune à chaque caractéristique

| Champ | Règle proposée |
| --- | --- |
| Identité produit | UUID catalogue, référence interne et version ; distinguer référence interne et référence fabricant |
| Fabricant / référence fabricant | Valeurs vérifiées sur l'article et sa documentation, suffixes et variantes conservés ; « Générique » n'identifie pas un fabricant |
| Clé de caractéristique | Identifiant stable du dictionnaire ; libellé FR/EN séparé |
| Valeur source | Texte original et unité originale conservés ; ne pas remplir depuis le nom commercial seul |
| Valeur normalisée | Facultative ; valeur décimale, unité explicite et conditions d'application ; pas de conversion pour une expression ambiguë |
| État | `inconnu`, `a_verifier`, `documente`, `contradictoire` ou `non_applicable` avec motif ; inconnu ne vaut jamais zéro |
| Preuve | Document fabricant identifiable, révision/date et page/table/section ; une page d'accueil ne suffit pas |
| Contrôle de l'article | Marquage, variante, accessoires et, si nécessaire, observation/mesure distincte de la spécification fabricant |
| Relecture | Responsable, date, version des caractéristiques et note de décision ; rester « à vérifier » sans relecture réelle |
| Alias | Synonyme de recherche avec origine ; jamais une déclaration de remplacement ni suppression d'un suffixe |

Les états décrivent la qualité d'une donnée, pas la compatibilité de deux produits. Un produit peut avoir certaines valeurs documentées et d'autres inconnues. Une donnée contradictoire est conservée avec ses deux sources et n'est pas choisie arbitrairement.

## Familles et champs à documenter

Les champs suivants forment une proposition de grille de saisie. Leur caractère obligatoire et les critères de substitution doivent être validés par le technicien selon l'usage réel. Aucun seuil numérique n'est inventé ici.

| Famille | Champs proposés | Points à soumettre à la relecture avant comparaison |
| --- | --- | --- |
| Câble / adaptateur vidéo | Connecteur et genre à chaque extrémité, longueur en m, direction, passif/actif, alimentation éventuelle, modes vidéo documentés et conditions de test, contenu vendu | Connecteur identique ne prouve pas la prise en charge d'un mode vidéo ; préserver direction et conditions |
| Alimentation | Entrée AC/DC et plage en V, fréquence si applicable, sortie AC/DC, tension et courant avec leurs conditions, polarité/connecteur, dimensions, montage, protections documentées et accessoires | Distinguer entrée et sortie, valeur nominale et plage ; ne pas déduire sécurité ou puissance de la seule photo |
| Relais | Bobine AC/DC et tension, organisation des contacts, charges commutées avec type/conditions AC/DC, dimensions/boîtier, dessin du brochage, montage | Courant inscrit seul et même nombre de pattes ne suffisent pas ; bobine, contacts et brochage doivent être documentés |
| Condensateur | Technologie, capacité et unité, tolérance, tension avec AC/DC, polarité, dimensions, entraxe, température et autres conditions spécifiées, rôle prévu par fabricant | Ne pas confondre les variantes AC/DC ou une valeur maximale avec les conditions réelles ; source exacte nécessaire |
| Multimètre / mesure | Référence exacte, grandeurs et plages mesurées, précision avec conditions, entrées, protections/fusibles, catégorie de mesure et tension associée seulement si documentées, cordons inclus | Ne pas attribuer une catégorie ou une qualification de sécurité à partir du modèle, d'une photo ou d'une autre marque |
| Semi-conducteur / module | Fabricant et référence complète, fonction, boîtier/dimensions, brochage, limites et caractéristiques avec conditions, alimentation/interface pour module, révision et documentation | Même marquage ou fonction commerciale ne garantit pas le remplacement ; séparer maximum absolu et caractéristique de fonctionnement |

## Réutilisation du modèle existant

`Produit`, `Attribut` et `ValeurAttribut` permettent déjà l'affichage des attributs ; `urlDatasheet` reste disponible. Ils n'enregistrent pas la provenance et la relecture par valeur. La conversion du comparateur ne remplace pas ces métadonnées.

Préparer une extension additive rattachée aux valeurs existantes après validation de cette grille : clé stable, état, valeur/unité source, valeur/unité normalisée facultatives, conditions, source précise et relecture. Ne pas déplacer ou effacer les valeurs historiques. Les données importées commencent « à vérifier » ; une migration n'attribue aucune validation rétroactive. Contrat API/admin et reprise sur base isolée à réaliser avant activation.

## Échantillon réel proposé

`pilot.json` contient huit fiches publiques lues par GET, avec UUID et code exacts : un câble HDMI, deux multimètres, deux alimentations, un relais et deux condensateurs. Aucun attribut n'était présent dans les huit réponses détaillées à la date du relevé. Une URL Epica mène au site général ; elle reste enregistrée comme URL existante, sans être promue au rang de fiche fabricant précise.

Toutes les caractéristiques normalisées, preuves et relectures du dossier sont encore absentes. Les valeurs écrites dans les noms restent des noms, pas des spécifications validées. Aucun prix, stock, fournisseur ou donnée client n'est copié dans ce dossier. L'échantillon est une proposition issue du catalogue et doit être accepté/remplacé par la boutique.

## Étapes de validation

1. Accepter les références pilotes et désigner leur relecteur.
2. Identifier fabricant, variante et document exact pour chaque article ; laisser inconnus les champs non établis.
3. Renseigner valeurs sources, unités et conditions, puis documenter chaque normalisation justifiée.
4. Relire un cas exact, un remplacement acceptable pour un usage défini, un candidat refusé avec motif et un cas sans candidat. Aucune substitution automatique.
5. Répéter l'import et la comparaison en base isolée, contrôler les inconnus et contradictions ; publier seulement les valeurs relues.

Ce dossier prépare L1/L3 ; il ne clôture ni ces lots ni la recette technique des équivalences.
