# Balisage de l’entreprise — livraison SEO-13

État : publié et contrôlé le 31 octobre 2026, PR #37. La validation externe Google reste à effectuer.

Le HTML généré contient une seule description JSON-LD `Organization` : NEWOTEG, sa marque X-Electronic, l’URL canonique du site, le logo existant, l’e-mail et le téléphone principal déjà publiés. Les coordonnées proviennent du même `shopContact.js` que les pages de la boutique. Le logo `logo.png` a été inspecté : fichier PNG de 238 × 254 pixels, déjà employé dans les métadonnées du site.

Le balisage n’ajoute ni raison sociale juridique vérifiée, ni immatriculation, localisation GPS, adresse de rue précise, horaires, zones de livraison, avis, conditions de retour ou politique commerciale. Ces informations ne sont pas établies par les seules pages publiques. La marque X-Electronic est décrite comme une marque de l’entreprise, pas comme un deuxième établissement.

Google indique que les données d’organisation sur l’accueil peuvent aider à identifier l’entreprise et ses coordonnées. Cela ne garantit ni un panneau de connaissance, ni l’apparition du logo dans les résultats, ni un classement. [Documentation Google Organization](https://developers.google.com/search/docs/appearance/structured-data/organization). La propriété `brand` est définie par [Schema.org Organization](https://schema.org/Organization).

## Propriété et sécurité du balisage

Un plugin Vite génère le script JSON-LD dans le head du document commun. Il n’est pas un script exécutable et ne nécessite aucune lecture réseau supplémentaire. Il conserve son propriétaire statique lorsque React reprend les métadonnées de page : aucune copie n’est montée dans le root ou dans le fragment produit. Les passages par d’autres routes peuvent donc conserver la même identité d’entreprise, sans y ajouter de données de compte ou de commande.

Les caractères pouvant fermer une balise sont échappés avant insertion. Une nouvelle exécution du générateur remplace seulement sa propre balise ; elle ne duplique pas le graphe. Les métadonnées de route, le rendu d’accueil, les directives privées et leurs en-têtes restent contrôlés séparément.

## Vérification et livraison

Les tests vérifient la correspondance avec les coordonnées publiées, l’absence de champs non établis, le logo réel, l’échappement JSON, l’unicité et la conservation pendant la transformation des métadonnées et l’injection du rendu d’accueil. Le contrôle `tests/verify-organization-build.mjs` relit le véritable `dist/index.html` puis fait passer ce document par le Worker : accueil, contact et page privée. Il confirme un seul JSON-LD dans le head, le rendu initial de l’accueil et la conservation de noindex/no-store sur le parcours privé.

Le contrôle du HTML généré est ajouté à la CI. Le moteur backend ne doit pas changer d’identité pour ce lot de métadonnées ; le build doit confirmer sa compatibilité avant livraison. Après publication, relire le JSON-LD réellement servi, les coordonnées et l’image, puis reprendre le test externe Google lorsqu’il est accessible. Aucun résultat de cet outil externe n’est affirmé ici.

Ce lot ne publie pas les guides ou les URL anglaises de la PR #35. La livraison conserve une version Worker précédente compatible pour retour arrière, sans migration ni modification de données métier.


## Résultat local

173 tests frontend, lint et build réussis. Le contrôle du HTML réellement généré passe pour accueil, contact et parcours privé. Le moteur compilé conserve l’identité `2038804f430092524ccdabd2f824add31975965d63899bbd350697b44f78041d`, déjà acceptée par le backend de production ; aucun nouveau moteur n’est requis par ce lot.

Les tests du générateur ont aussi été exécutés après l’ajustement de son remplacement de balise, pour conserver les scripts appartenant à d’autres fonctionnalités. Les journaux se trouvent dans `output/seo-implementation/organization-*`. La validation externe Google reste à effectuer ; la validité d’un document JSON n’est pas présentée comme son résultat.

## Résultat en production

Sur `90ebc98914f7aab1cf3f27afb55b0e0cda1402ef`, CI générale #379 et contrat runtime #103 entièrement réussis, dont les trois profils Docker et la préproduction isolée. Une indentation du nouveau contrôle CI a été corrigée avant ces réussites. La PR #37 est fusionnée dans `14a491caee0b00d7bdbdffdfb3e405cb1cc79cf7`.

Worker publié : `492e98e4-9d21-476f-9c57-bf54195f7a41`, confirmé actif à 100 % dans le déploiement `d9257ab0-48a9-4a5f-8366-3f8366912eb1`. Retour arrière compatible : `4794fe2c-bcaa-4296-8cb9-f984558a74d1`. Moteur inchangé : `2038804f430092524ccdabd2f824add31975965d63899bbd350697b44f78041d`.

Recette HTTP publique commencée à 19:51:24 UTC : un seul graphe exact sur accueil, contact, famille, produit, checkout et URL inconnue ; logo PNG accessible. Sept contrôles réussis, HTML initial et schéma produit conservés, checkout noindex/no-store, inconnue 404/noindex. Les treize contrôles des variantes HTTP/www, des parcours privés et de HEAD réussissent aussi après cette publication. Aucune donnée commerciale n’a été écrite. Rapport : `output/seo-implementation/organization-production-report.json` ; version active : `organization-deployments-confirmed.json`.

Cette livraison technique ne prouve pas encore l’interprétation du balisage par Google, une indexation nouvelle ou un gain de classement.
