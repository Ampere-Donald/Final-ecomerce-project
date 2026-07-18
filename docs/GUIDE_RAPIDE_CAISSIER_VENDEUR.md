# Guide rapide caissier et vendeur

## Avant la première vente

1. Se connecter avec son compte personnel.
2. Vérifier le bandeau réseau : aucune opération ne doit rester en erreur.
3. Le caissier ouvre **Caisse du jour** si le tableau de bord le demande.
4. Sur le poste d’impression, vérifier QZ Tray et imprimer un diagnostic depuis **Paramètres > Impression**.

## Vendeur

1. Ouvrir **Vente en cours**.
2. Scanner le code-barres ou appuyer sur `/` pour rechercher.
3. Ajuster la quantité avec les boutons + et −.
4. Si nécessaire, suggérer un client et ajouter une note pour la caisse. Le caissier confirme l’identité de facturation.
5. Utiliser **Favoris** ou **Récents** pour retrouver les articles fréquents.
6. Choisir **Mettre la vente en attente** si le client doit patienter ; l’onglet **En pause** permet de la reprendre.
7. Contrôler le récapitulatif puis confirmer l’envoi. `F8` ouvre aussi ce contrôle.
8. Suivre les bons dans **Mes tickets** ou **En attente**.

## Caissier

1. Ouvrir **File caissier**.
2. Sélectionner le ticket puis contrôler les lignes et la note du vendeur.
3. Rechercher le client par nom ou téléphone, ou utiliser la création rapide. Sans sélection, la vente reste « client comptoir ».
4. Choisir **Ticket**, **Facture** ou **Bon de vente**, puis le paiement.
5. Pour les espèces, saisir le montant reçu et vérifier la monnaie affichée.
6. Pour le crédit, sélectionner obligatoirement un client et une échéance, puis vérifier l’encours et la limite.
7. Encaisser une seule fois. L’application bloque également les doubles clics et les requêtes concurrentes.
8. Imprimer le document créé. En cas d’échec, utiliser **Réessayer**, **Ouvrir le document existant** ou **Continuer sans imprimer** : ne pas recréer la vente.

Sur tablette, la file et le détail restent côte à côte. Sur téléphone, le parcours est guidé et le total reste fixé en bas. Sur desktop, la file, la transaction et le résumé restent simultanément visibles.

## Vente directe / Caisse Express

- `/` : recherche produit ;
- `F2` : espèces ;
- `F3` : Mobile Money ;
- `F4` : carte ;
- `F8` : valider.

Les raccourcis ne sont pas affichés en permanence. Appuyer sur `?` pour ouvrir l’aide et, côté caisse, les désactiver si nécessaire. Ils ne se déclenchent jamais pendant la saisie dans un champ.

Après validation, le champ scanner reprend le focus pour la vente suivante.

Si le client doit patienter, utiliser **Attente** : le panier, le client et le moyen de paiement sont conservés sur ce poste. **Reprendre** restaure le panier ; contrôler le stock avant validation. Fermer la page avec un panier actif déclenche un avertissement.

## Coupure Internet

La vente est conservée sur l’appareil et reçoit un identifiant anti-doublon. Le bandeau indique le nombre d’opérations en attente.

1. Ne pas effacer les données du navigateur.
2. Continuer uniquement les opérations autorisées.
3. Au retour du réseau, laisser la synchronisation automatique s’exécuter.
4. Ouvrir **Opérations hors ligne** si une ligne est en erreur.
   - **Nouvelle tentative requise** : réessayer lorsque le serveur est stable.
   - **Conflit de stock** : contrôler le stock réel, puis réessayer ou retirer la ligne après décision du responsable.
5. Ne supprimer une opération qu’après vérification par un responsable.

## Annulation

Une vente encaissée n’est jamais supprimée silencieusement. L’annulation exige un motif, restitue le stock et reste visible dans l’historique.

Le **remboursement** est une opération différente, réservée au SUPER_ADMIN : il crée une sortie de caisse et un retour de stock. Ne pas utiliser l’annulation lorsqu’un client a réellement reçu puis retourné la marchandise.

## Réimpression

Le reçu indique **ORIGINAL** à la première impression et **DUPLICATA** ensuite. Toute tentative réussie ou échouée est visible dans **Journal impressions** avec le poste et l’utilisateur. Réimprimer le document existant ; ne jamais recréer la vente.

## Assistance

Communiquer la **Référence** affichée avec l’erreur, le numéro du ticket et l’heure approximative. Ne jamais envoyer de mot de passe, PIN ou jeton.
