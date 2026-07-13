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
