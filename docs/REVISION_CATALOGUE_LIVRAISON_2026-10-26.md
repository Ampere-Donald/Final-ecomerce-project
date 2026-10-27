# Révision du catalogue — préparation de la livraison

Intégration sur la version principale `360b7dfd`, avec conservation des améliorations mobiles, de la file des prix manquants, des sources techniques et des protections de démarrage récentes. Les interfaces sont actuellement livrées par Cloudflare Workers Builds et le backend par Railway.

## Contrôles avant publication

- 65 suites backend, 496 tests réussis.
- 45 fichiers de tests admin, 191 tests réussis ; les scénarios de révision et les tests de navigation concernés ont aussi été exécutés séparément.
- 133 tests du site public réussis, lint sans erreur.
- TypeScript admin et builds des trois applications réussis.
- 10 scénarios réels de révision sur PostgreSQL local isolé, sans connexion à la production.
- 31 vérifications de répétition de livraison : application des 18 migrations additives depuis le modèle de référence, conservation des colonnes et données préexistantes, validation du contrat et restauration du dump synthétique. Les nouvelles colonnes de suivi sont exclues uniquement du calcul de conservation des valeurs historiques du produit.
- Contrat de schéma regénéré à partir de cette répétition et vérifié en lecture seule contre la production : compatible, historique sans migration échouée.
- Parcours navigateur avec Layout, Header, Sidebar et barre mobile réels, API simulée sans requêtes externes : liste, fiche, correction et article suivant. La barre de navigation globale disparaît en mode fiche ; la barre de validation reste accessible. Aucun débordement horizontal à 390 px. Contrôles antérieurs à 360 et 768 px dans le guide principal.

Le clavier virtuel d’un téléphone physique ne peut pas être reproduit par le navigateur de bureau ; seule une fenêtre réduite a été contrôlée. Les captures locales ne contiennent que des produits fictifs.

La nouvelle migration est déjà appliquée en production depuis le 24 octobre. Le déploiement doit conserver son checksum exact et ne rejoue pas le reclassement initial. Les anciens documents de vente conservent leurs montants ; aucune correction de prix n’est faite pour tester en production.
