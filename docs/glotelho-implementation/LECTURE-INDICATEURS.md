# Lecture des indicateurs par la boutique

## Direction retenue avant réalisation

Palette de l’administration conservée : encre `#0B1636`, action `#2D32C9`, fond `#F5F7FB`, surface `#FFFFFF`, réception `#15986C`, attention `#92400E`. Space Grotesk pour les titres existants, IBM Plex Sans pour les textes et nombres ; pas de police technique pour les compteurs.

Lecture alignée à gauche : choix de dates, deux périodes de même durée, tableau des résultats métier puis tableau des observations. Sur mobile, libellés sur leur propre ligne et trois colonnes numériques compactes. Le détail par langue, écran et réception est dépliable. Pas de grille de grands compteurs ni de faux entonnoir : les observations ne représentent pas des visiteurs uniques.

```text
Parcours du site                          Actualiser
[Du] [Au] [Comparer]    période précédente calculée
Collecte / jours incomplets / limites
Résultats métier   | précédente | choisie | écart
Commandes créées, devis, livraisons et retraits
État actuel des commandes créées dans chaque période
Observations       | précédente | choisie | écart
Recherches vides, panier, frais, réachat, WhatsApp
[Détails par langue / écran / réception]
```

Relecture contre le brief : les cartes statistiques usuelles ont été écartées au profit d’un relevé comparable pour la boutique. Les couleurs signalent la réception ou une limite de lecture, sans déclarer qu’une hausse de clics est une amélioration commerciale. Le design E du site client reste conservé.

## Règles de lecture prévues

- Défaut : sept jours terminés à Douala et les sept jours précédents. Dates inclusives, 1 à 90 jours sans futur ; comparaison précédente de même durée.
- Commandes et devis réels séparés des observations anonymes. Commandes enregistrées ne signifie pas commandes payées.
- Écarts absolus ; pas de croissance infinie lorsque la période précédente vaut zéro. Cohortes relues dans leur état actuel, avec maturité différente et aucune conversion individuelle déduite.
- Collecte désactivée, jour incomplet, absence d’observations et retours non mesurables expliqués. L’absence de registre d’incompatibilité ne vaut pas zéro retour.
- ADMIN/SUPER_ADMIN uniquement ; lecture authentifiée, aucun stockage du rapport ni export de coordonnées. Erreurs de lecture explicites ; réponse ancienne annulée ou ignorée après changement de période/session.

## Utilisation par l’équipe

L’écran est livré localement dans Administration → Parcours du site, réservé aux ADMIN/SUPER_ADMIN. Choisir les dates puis Comparer ; Actualiser relit les deux périodes sans changer les dates. Les tables sont cachées tant que les dates éditées ne sont pas appliquées. Le détail des observations se déplie en fin de tableau.

Commencer par les commandes et réceptions réelles. Une hausse d’ajouts au panier, d’ouvertures de fiches ou de WhatsApp n’est pas une hausse des ventes. Un réachat ajouté au panier n’est pas une commande. Le nombre de sorties après affichage des conditions indique seulement une action observée, sans identifier un client ni expliquer sa décision.

Pour juger une modification, noter la date de changement et vérifier que les deux périodes choisies ont une collecte comparable et assez de recul pour les réceptions. Le système ne connaît pas encore les plages d’activation historiques ; un compteur nul signifie aucune observation reçue, et ne démontre pas une absence d’activité. Les taux des commandes créées sont relus dans leur état actuel et peuvent évoluer.

En cas de panne, relire avec Actualiser : ne remplacer aucun chiffre par zéro. Le registre distingue maintenant les dossiers signalés, les dossiers dont le retour a été confirmé et les unités retournées confirmées. La confirmation utilise sa date d’enregistrement par la boutique, sans prouver indépendamment la réception physique. Les signalements, annulations et avis négatifs ne valent pas retour. Si le registre est absent dans une des deux lectures, aucune comparaison de retours à zéro n’est fabriquée. Les détails des observations ne contiennent que langue, écran et réception, sans recherche saisie, article ou coordonnées.

Réalisation et recette locale réussies ; preuves et limites dans `MESURE-PARCOURS.md`. Aucun résultat commercial réel ni activation de collecte validés par cette préparation. Le collecteur principal reste désactivé ; lancement public non autorisé.
