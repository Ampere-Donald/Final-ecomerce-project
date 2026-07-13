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
4. Sélectionner le client et le paiement.
5. Appuyer sur `F8` pour envoyer le bon.
6. Suivre les bons dans **Mes tickets** ou **En attente**.

## Caissier

1. Ouvrir **File caissier**.
2. Contrôler le client, les lignes, le total et le paiement.
3. Encaisser une seule fois.
4. Le ticket officiel Epson 58 mm s’imprime automatiquement.
5. En cas d’échec d’impression, réessayer depuis le reçu existant : ne pas recréer la vente.

## Vente directe / Caisse Express

- `/` : recherche produit ;
- `F2` : espèces ;
- `F3` : Mobile Money ;
- `F4` : carte ;
- `F8` : valider.

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
