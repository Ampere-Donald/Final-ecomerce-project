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

## Exécution de production du 18 juillet 2026

Révision déployée : `85e34d08` sur `main`.

- API Railway : santé `ok`, base `ok`, stockage `ok`.
- Prisma : 40 migrations reconnues, schéma de production à jour.
- Cloudflare Worker `newoteg-admin` : version `c025ea1a-6c24-469c-b85a-21053a6a0773` déployée.
- Authentification : SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER validés avec les comptes de recette.
- Vendeur mobile 390x844 : catalogue chargé, retour d'ajout visible, total fixe et panier tactile validés.
- Vendeur tablette 1024x768 : catalogue et panier visibles ensemble, aucun débordement horizontal.
- Caissier mobile 390x844, tablette 768x1024 et desktop 1366x768 : aucun débordement horizontal.
- Bon temporaire `T-20260718-0001` : création vendeur, apparition dans la file, sélection et note vendeur validées.
- Espèces : 1 000 FCFA à payer et 2 000 FCFA reçus donnent 1 000 FCFA de monnaie.
- Crédit : client enregistré et échéance exigés, encaissement correctement désactivé sans ces données.
- Nettoyage : le bon temporaire a été annulé sans encaissement ; aucun stock ni solde de caisse modifié.
- Console sur un nouvel onglet après déploiement : aucune erreur active.
- Automatisation : 111 tests backend, 4 tests UI et 13 tests de services frontend réussis.
- Impression et coupure réseau : scénarios de récupération couverts par les tests automatisés ; la validation physique Epson/QZ reste à effectuer sur le poste équipé.

## Régression navigation par rôle du 21 juillet 2026

Ces contrôles font désormais partie de la recette obligatoire. Une page testée par URL directe ne suffit plus à valider le parcours utilisateur.

- Connexion par mot de passe VENDEUR : redirection vers `/pos`.
- Connexion par mot de passe ou PIN CAISSIER : redirection vers `/file-caissier`.
- Connexion ADMIN ou SUPER_ADMIN : redirection vers `/`.
- Menu CAISSIER : « Encaissement » précède « Ouverture / fermeture » et pointe vers `/file-caissier`.
- Navigation mobile : raccourcis distincts pour ADMIN, CAISSIER et VENDEUR.
- Dashboard CAISSIER : la file d'encaissement est l'action principale ; la gestion de session de caisse est secondaire.
- `/caisse-jour` : le CAISSIER dispose d'un retour explicite vers les encaissements et ne voit plus de parcours concurrent intégré.
- Validation avant fusion : TypeScript réussi, 17 tests UI réussis, 13 tests de services réussis et build PWA réussi.
