# Catalogue mobile : éviter le chargement intermédiaire — 27 octobre 2026

Suite du lot L8 du plan A–Z après la publication des rayons mobiles et du mouvement (PR #21, dc6ebc2f). Le budget LCP 2 500 ms reste ouvert. Le profil CPU du catalogue public à 390 px / réseau 1,6 Mbit/s / latence 150 ms / CPU ×4 a identifié environ 168 ms échantillonnées dans la construction répétée du formateur FCFA. C’est une mesure de diagnostic, pas une durée garantie économisée.

## Changement

Le formateur Intl FCFA est créé une seule fois, à la première valeur valide, puis réutilisé. Locale, devise, arrondi, séparateurs, zéro et valeurs absentes conservent le comportement précédent. Aucun prix métier n’est modifié.

La prélecture publique conserve aussi en mémoire ses réponses déjà résolues. Le premier rendu client les utilise immédiatement lorsqu’elles sont encore fraîches. Il n’attend pas un réseau lent et ne remplace jamais un snapshot serveur explicite. La limite existante de quinze secondes, les retries, les erreurs et les lectures fraîches au retour sur l’onglet restent conservés. Une réponse déjà appliquée ne provoque pas une deuxième mise à jour identique. Aucune donnée privée, persistance ou requête d’écriture ajoutée.

## Preuves

137 tests Node du dépôt réussis, lint ciblé et build moderne/legacy réussis. Le test monétaire vérifie les résultats et une seule initialisation après soixante-dix formatages. Le test de prélecture vérifie attente, identité, expiration, horloge future, absence de navigateur et échecs réseau.

[Recette navigateur](browser.json) : neuf groupes réussis, six largeurs/chemins moderne et legacy (390/768/1440), données prêtes dès le premier rendu, une seule lecture et une seule image réutilisées, changement du tri, réponse lente, rafraîchissement au retour, erreurs indisponible/malformée et reprise. Aucune erreur JavaScript ni écriture. [Régression reproduite](regression.json) : l’ancien build affiche Recherche en cours au premier rendu malgré les données déjà prêtes ; le candidat passe. Les API de cette recette sont fictives et isolées dans le navigateur.

[Comparaison de chargement](performance.json) : deux builds servis par le même preview Worker local, mêmes données publiques réelles par GET HTTPS et adaptateur CORS strictement local, sans modifier le serveur de production. Trois passages par build, profil identique et séquentiel. Ancien LCP : 4620 / 4168 / 4164 ms ; candidat : 4056 / 4224 / 4112 ms. Les séries se recouvrent : aucun gain de LCP significatif n’est revendiqué. CLS : 0.00471 → 0 sur ces passages ; le chargement intermédiaire disparaît. Le budget LCP reste non atteint. Aucun dépassement du budget JS ou débordement. Ces mesures ne sont ni un p75 terrain ni une recette sur téléphone physique.

## Portée et suite

Fichiers de production : src/utils/formatFCFA.js, src/storefront/cataloguePrefetch.js et src/storefront/useResource.js. Aucun changement d’identité, de hero, de mouvement, de filtre, de stock, de prix serveur, de paiement ou de backend. Aucun polyfill retiré et aucune nouvelle dépendance. La compatibilité historique n’est pas sacrifiée pour diminuer le poids.

Les validations par Mr Jude Fogueng, le projet/BOM réel, les fournisseurs email/SMS et la recette équipe/téléphone restent reportés. La gestion et la préproduction Railway ne sont pas réouvertes. L’objectif global ne peut pas être déclaré terminé par cette optimisation. La livraison publique et ses contrôles seront consignés après publication.
