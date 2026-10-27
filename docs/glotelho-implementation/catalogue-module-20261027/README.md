# Catalogue : découverte des modules et premières rangées — 27 octobre 2026

Suite du lot L8 après PR #23, base dd4e6aaf. Le catalogue préchargeait les données et la première image, mais ses modules JavaScript étaient découverts après l’exécution de l’entrée principale. La page construisait aussi toutes les cartes avant de donner la priorité au premier écran.

## Réalisation

- Le build résout l’unique chunk Catalogue et ses imports statiques. Les noms hachés viennent du vrai graphe Rollup ; graphes absents, ambigus ou externes refusés. Aucune traversée des imports dynamiques de pages privées.
- Le petit script existant du head émet des liens modulepreload uniquement sur les URLs catalogue autorisées et si le navigateur les gère nativement. Pas d’évaluation anticipée, pas d’activation serveur, pas de cache de prix ajouté. Les anciens navigateurs gardent leur chemin legacy. Le mécanisme et ses compromis sont décrits par [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload).
- Les données adaptées des cartes restent stables entre les mises à jour de catégories/filtres. ProductCard est mémorisé ; langue, favoris, prix/stock actualisés et dates d’offres continuent de déclencher leur représentation. La vérification d’une liste vide de favoris ne republie plus inutilement un nouveau contexte identique.
- Le client construit d’abord les deux premières rangées (4/6/8 cartes selon largeur), laisse passer un rendu puis ajoute le reste de la même page sur la frame suivante. Aucune pagination réduite, aucun article retiré et aucune attente réseau ou de visibilité pour la suite. Les nœuds des premières cartes restent les mêmes. Un snapshot serveur conserve ses 24 cartes dès le HTML initial ; les navigateurs sans requestAnimationFrame affichent tout immédiatement.

## Vérification

139 tests Node, lint ciblé et build moderne/legacy réussis. [Quinze groupes navigateur catalogue](browser.json) : scripts retenus avant exécution, module natif demandé dès le head, pas de modules privés anticipés, repli sans support natif, réutilisation données/photo, réponse lente, retry, retour sur l’onglet, tri, nouveaux prix/stock, favoris et FR/EN. Six cas 390/768/1440 moderne/legacy vérifient les premières rangées, puis les 24 produits et la conservation du premier nœud. Les données de cette recette sont fictives et isolées. Aucune erreur JavaScript ni écriture.

[Rendu serveur partagé](server-render.json) : les 24 cartes sont présentes avant JavaScript. Le contrat du paquet CJS en CI vérifie aussi ce nombre, en plus de la projection publique et de l’identité renderer/client. Le serveur de rendu en production reste désactivé conformément au report existant. [Recette transversale de mouvement](motion.json) : quinze groupes réussis, six routes et les contrôles de pause/réduction conservés.

[Mesures locales](performance.json) : vrais produits publics par GET, assets locaux gzip, adaptateur CORS local identique, 390 px / 1,6 Mbit/s / latence 150 ms / CPU ×4 / cache froid. Avant : 4 408 / 4 072 / 4 340 ms ; préchargement et mémo seuls : 4 144 / 4 596 / 4 552 ms ; candidat final avec rangées prioritaires : 3 912 / 3 916 / 5 284 ms. CLS 0 et budget JS respecté. Le module Catalogue est découvert dès le head ; les séries LCP se recouvrent, donc aucun gain garanti ou terrain n’est revendiqué. L’objectif 2 500 ms reste manqué. La première tentative en parallèle d’une compilation a été exclue ; aucune conclusion ne s’appuie sur elle.

## Portée

Composants et outillage réutilisables, aucune nouvelle dépendance, aucun polyfill supprimé, aucun changement de prix/stock serveur, commande, paiement, hero ou identité. Les étapes métier reportées et la préproduction Railway ne sont pas déclarées accomplies. Publication et preuves publiques ajoutées au compte-rendu de livraison une fois vérifiées.
