# Sources et formules du tableau de bord Newoteg

| Indicateur | Source | Formule / règle | Action |
|---|---|---|---|
| Caisse du jour | API caisse du jour | Solde retourné par la session du jour ; absence ou erreur 404 = à ouvrir | Ouvrir ou consulter la caisse |
| Trésorerie totale | API solde global | Somme consolidée de la caisse globale et des coffres | Consulter la caisse globale |
| Commandes en attente | API commandes | Nombre de commandes dont le statut est EN_ATTENTE | Ouvrir les commandes |
| Tickets boutique | API tickets en attente | Nombre de tickets non encaissés | Ouvrir la file caissier |
| Produits bas | API stock faible | Nombre de produits sous leur seuil ou en rupture | Ouvrir les alertes stock |
| Échéances urgentes | API échéances à 7 jours | Échéances dues dans trois jours ou déjà en retard | Ouvrir les échéances |
| Encours clients | API crédits clients | Somme des montants `totalDu` | Ouvrir les crédits |
| Opérations hors ligne | IndexedDB de l’appareil | Nombre d’opérations encore présentes dans la file locale | Contrôler et synchroniser |
| Imprimante disponible | État local QZ Tray | Connexion QZ active et imprimante configurée ; Android sans pont = indisponible | Ouvrir les paramètres d’impression |

Les données serveur sont actualisées toutes les 30 secondes. La file hors ligne est actualisée à chaque ajout, suppression ou synchronisation sur l’appareil courant.

## Adaptation par rôle

| Rôle | Indicateurs affichés en priorité |
|---|---|
| SUPER_ADMIN / ADMIN | Caisse du jour, trésorerie, commandes, tickets, échéances, crédits, stock, hors-ligne et impression |
| CAISSIER | Caisse du jour, tickets à encaisser, opérations hors ligne et état de l’imprimante |
| VENDEUR | Accès vente, bons personnels en attente et opérations hors ligne |

Les appels API sont également adaptés : un vendeur ne charge pas les données financières globales et un caissier ne charge pas les crédits, échéances ou coffres.

## Périodes et comparaisons

L’écran **Analyses** propose aujourd’hui, 7 jours, 30 jours, 90 jours, mois, trimestre et année à date. La comparaison utilise la période immédiatement précédente de durée identique. La variation est calculée par `(valeur courante - valeur précédente) / valeur précédente × 100`; si la valeur précédente est nulle, une valeur courante positive est présentée comme une progression initiale de 100 %.

Les KPI comparés sont le chiffre d’affaires encaissé (ventes boutique + commandes livrées), le nombre de transactions, le panier moyen et les quantités vendues. Les commandes non livrées et les ventes annulées ne doivent pas contribuer au chiffre d’affaires comparé.
