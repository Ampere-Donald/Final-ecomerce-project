# Recette POS multi-appareils

Ces scénarios constituent la référence fonctionnelle du parcours validé.

## Vendeur

### Ajout visible d'un article

- **Given** un vendeur consulte le catalogue avec un panier vide.
- **When** il clique sur un article ou scanne son code-barres.
- **Then** la quantité apparaît sur la carte, la carte reçoit un feedback vert bref et le résumé du panier affiche immédiatement le nouveau total.

### Panier selon l'appareil

- **Given** le panier contient au moins un article.
- **When** la largeur est inférieure à 768 px.
- **Then** un résumé fixe reste visible en bas et ouvre le panier en panneau tactile.
- **When** la largeur est comprise entre 768 et 1199 px.
- **Then** le catalogue occupe environ 65 % et le panier sticky environ 35 %.
- **When** la largeur est supérieure ou égale à 1200 px.
- **Then** le panier reste sticky sans masquer le catalogue.

### Envoi résilient

- **Given** une vente contient des articles et a été sauvegardée comme brouillon local.
- **When** le vendeur l'envoie à la caisse, y compris après une coupure réseau.
- **Then** une seule opération idempotente est créée et le brouillon n'est supprimé qu'après confirmation.

## Caissier

### Identification du client

- **Given** un bon est sélectionné.
- **When** le caissier saisit au moins deux caractères d'un nom ou d'un numéro.
- **Then** la recherche serveur retourne au maximum huit clients et le numéro choisi suit la facture ou le bon.

### Espèces et monnaie

- **Given** le total du bon est de 15 000 FCFA.
- **When** le caissier saisit 20 000 FCFA reçus.
- **Then** l'interface affiche 5 000 FCFA de monnaie et le backend conserve les deux montants.

### Crédit contrôlé

- **Given** le paiement est « Crédit ».
- **When** aucun client, aucune échéance ou une limite insuffisante est détectée.
- **Then** l'encaissement reste désactivé et la raison est affichée.
- **When** le client, l'acompte, l'échéance et la limite sont valides.
- **Then** la dette, l'acompte et la caisse du jour sont tracés exactement.

### Double clic ou deux onglets

- **Given** deux requêtes tentent d'encaisser le même ticket.
- **When** elles arrivent simultanément.
- **Then** une seule revendique atomiquement le ticket et une seule vente est créée.

### Impression récupérable

- **Given** le paiement est confirmé et le document est créé.
- **When** l'impression échoue ou est relancée.
- **Then** la vente reste encaissée, l'échec est journalisé et la réimpression utilise le même document avec le mode duplicata après le premier succès.

## Viewports de contrôle

- Mobile : 360x800, 390x844, 430x932.
- Tablette : 768x1024 et 1024x768.
- Desktop : 1366x768, 1440x900 et 1920x1080.
