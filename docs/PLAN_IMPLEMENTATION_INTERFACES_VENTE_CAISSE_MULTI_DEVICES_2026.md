# Plan d'implementation des interfaces vente et caisse multi-appareils

**Date :** 17 juillet 2026  
**Statut :** VALIDE POUR IMPLEMENTATION  
**Perimetre :** vendeur et caissier sur mobile, tablette et desktop  
**Application :** `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard`

## 1. Decisions UX validees

Les parcours suivants sont valides et constituent la reference fonctionnelle :

- vendeur mobile : accueil, catalogue, scanner, panier, envoi au caissier ;
- caissier mobile : file, identification client, paiement, confirmation ;
- vendeur tablette : catalogue et panier visibles simultanement, scanner en ecran partage ;
- caissier tablette : file, client, document et paiement dans un poste de travail adapte au tactile ;
- vendeur desktop : catalogue et panier persistants, feedback d'ajout, controle avant envoi, reprise de vente ;
- caissier desktop V2 : file active, ligne de transaction, client, paiement, document et ticket suivant ;
- etats operationnels : credit client, echec d'impression recuperable, reimpression du document existant.

Decision complementaire : les raccourcis clavier restent actifs sur desktop, mais ils ne sont pas affiches dans une barre permanente. Ils sont presentes dans les infobulles des actions et dans une aide accessible par `?`.

## 2. Strategie d'implementation

Il ne faut pas construire une page differente par appareil. Une seule logique metier alimente des compositions responsives :

```text
Logique vendeur partagee
    |-- mobile  : catalogue -> panier bottom sheet -> envoi
    |-- tablette: catalogue 65 % + panier 35 %
    `-- desktop : catalogue + panier sticky + controle avant envoi

Logique caissier partagee
    |-- mobile  : file -> client -> paiement -> confirmation
    |-- tablette: file + espace de travail + resume fixe
    `-- desktop : file + transaction + dock contextuel
```

Les donnees, validations, appels API, permissions et etats de soumission restent communs. Seule la composition visuelle change selon le viewport.

## 3. Priorites

| Priorite | Definition | Contenu |
|---|---|---|
| P0 | Argent, stock, identite client, double encaissement | contrats API, idempotence, client/document, paiement, brouillons |
| P1 | Parcours quotidien vendeur/caissier | interfaces desktop, tablette et mobile |
| P2 | Recuperation et qualite d'usage | impression, credit, accessibilite, performances |
| P3 | Mesure et confort avance | metriques UX, sons/vibrations configurables, aide enrichie |

## 4. Breakpoints et appareils cibles

Utiliser les media queries Tailwind classiques pour rester compatible avec les anciens Android. Ne pas dependre des container queries.

| Mode | Largeur | Cibles de recette |
|---|---:|---|
| Mobile | `< 768 px` | 360x800, 390x844, 430x932 |
| Tablette | `768 a 1199 px` | 768x1024 portrait, 1024x768 paysage |
| Desktop | `>= 1200 px` | 1366x768, 1440x900, 1920x1080 |

Les seuils sont fonctionnels : tablette signifie que deux zones de travail utiles peuvent coexister sans reduire la lisibilite.

## 5. Lot 0 - Figer les references et la baseline

**Priorite : P0**  
**Estimation : 1 jour**

### Actions

- Exporter les maquettes validees dans `docs/design/validated/` avec un nom stable par role, appareil et etape.
- Capturer le rendu actuel des pages :
  - `POSVendeur.tsx` ;
  - `FileCaissier.tsx` ;
  - `CaisseJour.tsx` ;
  - `ReceiptGenerator.tsx`.
- Documenter les parcours de reference dans des scenarios Given/When/Then.
- Ajouter le socle de tests UI : Vitest, Testing Library, user-event et jsdom.
- Ajouter des commandes `test:ui` et `test:e2e`.
- Conserver une feature flag `responsivePosV2` pendant la migration.

### Criteres d'acceptation

- Chaque maquette validee possede un identifiant stable.
- Les comportements actuels critiques sont couverts avant refactorisation.
- Le build, le lint et les tests existants restent verts.

## 6. Lot 1 - Contrats backend indispensables

**Priorite : P0**  
**Estimation : 3 a 5 jours**

### 6.1 Recherche client par telephone

Le frontend charge actuellement tous les clients puis filtre localement. Ajouter une recherche serveur :

```text
GET /clients/search?q=<nom-ou-telephone>&limit=8
```

Regles :

- normaliser les numeros camerounais avant comparaison ;
- retourner uniquement les champs utiles a la caisse ;
- limiter la route aux roles autorises ;
- ne pas exposer l'encours au vendeur ;
- ajouter un index de recherche pertinent sur le telephone normalise.

### 6.2 Type de document

Etendre la validation d'un bon avec :

```ts
documentType: 'TICKET_CAISSE' | 'FACTURE' | 'BON_VENTE'
```

Actions :

- ajouter `BON_VENTE` a `TypeFacture` ou introduire un enum de document commercial coherent ;
- generer les prefixes `TIC-`, `FAC-` et `BON-` ;
- faire retourner le document cree dans la reponse d'encaissement ;
- adapter les listes, filtres, impressions et duplicatas.

### 6.3 Donnees de paiement et credit

Etendre `EncaisserTicketDto` avec les donnees necessaires :

- `clientId` ;
- `documentType` ;
- `montantRecu` pour les especes ;
- `montantPaye` pour l'acompte credit ;
- `dateEcheance` pour le credit ;
- `paymentReference` facultative pour Mobile Money, carte ou virement ;
- une cle d'idempotence d'encaissement.

Le backend calcule et valide la monnaie rendue. Il reste l'autorite pour le total, le stock, la caisse du jour et le statut du ticket.

### 6.4 Idempotence et concurrence

- Verrouiller atomiquement le passage `EN_ATTENTE -> ENCAISSE`.
- Deux requetes concurrentes sur le meme ticket doivent retourner le meme resultat ou une erreur metier sans creer une seconde vente.
- Conserver la vente et le document dans une meme transaction lorsque c'est possible.
- Ajouter des tests de concurrence et de double clic.

### 6.5 Credit client

- Ajouter la date d'echeance a la vente a credit.
- Definir la source de la limite de credit : champ client ou parametre global.
- Retourner `encoursActuel`, `nouveauSoldeDu` et `limiteCredit` dans un endpoint de previsualisation.
- Interdire le credit sans client enregistre.
- Tracer l'acompte, le caissier et la caisse du jour.

### Criteres d'acceptation

- Une facture ou un bon reprend le client selectionne et son telephone.
- Le document demande est celui cree par le backend.
- Un double encaissement est impossible, meme avec deux onglets.
- La vente a credit produit un encours et une echeance exacts.

## 7. Lot 2 - Architecture frontend partagee

**Priorite : P0**  
**Estimation : 3 a 4 jours**

`POSVendeur.tsx` et `FileCaissier.tsx` sont actuellement trop monolithiques. Extraire progressivement sans recrire la logique deja fiable.

### Arborescence cible

```text
src/features/seller-pos/
  SellerPOSPage.tsx
  useSellerSaleFlow.ts
  components/
    SellerHeader.tsx
    ProductSearch.tsx
    ProductGrid.tsx
    ProductCard.tsx
    ScannerView.tsx
    SellerCart.tsx
    SaleReview.tsx
    SaleSentState.tsx
    SuspendedSales.tsx

src/features/cashier-pos/
  CashierPOSPage.tsx
  useCashierCheckoutFlow.ts
  components/
    CashierTopBar.tsx
    TransactionProgress.tsx
    TicketQueue.tsx
    TicketDetail.tsx
    CustomerIdentityStep.tsx
    PaymentStep.tsx
    CheckoutSummary.tsx
    PaymentSuccess.tsx
    PrintRecovery.tsx
    CreditPayment.tsx

src/features/pos-shared/
  components/
  hooks/
  types.ts
  formatters.ts
```

### Etats metier vendeur

```text
IDLE -> SELLING -> REVIEWING -> SENDING -> SENT
                  |              |
                  v              v
               SUSPENDED       ERROR
```

### Etats metier caissier

```text
QUEUE -> TICKET -> CUSTOMER -> PAYMENT -> PROCESSING -> DOCUMENT_READY
                                  |             |
                                  v             v
                               CREDIT      PRINT_RECOVERY
```

### Regles

- ne pas dupliquer les appels API entre les layouts ;
- conserver une seule source de verite pour panier, ticket selectionne, client et paiement ;
- maintenir les brouillons par utilisateur et poste ;
- centraliser les totaux, unites et references ;
- conserver les permissions dans la logique, pas uniquement dans le rendu.

## 8. Lot 3 - Parcours vendeur responsive

**Priorite : P1**  
**Estimation : 5 a 7 jours**

### 8.1 Comportements communs

- recherche par nom, code et scan ;
- ajout avec feedback local, panier et toast deduplique ;
- quantite exacte et stock maximal explicite ;
- favoris et produits recents ;
- brouillon automatique ;
- mise en attente et reprise ;
- controle avant envoi ;
- envoi idempotent au caissier ;
- confirmation avec numero et statut du ticket ;
- annulation courte de l'envoi si le backend l'autorise encore.

### 8.2 Mobile vendeur

- navigation basse selon le role ;
- recherche et scanner accessibles au pouce ;
- catalogue en deux colonnes ;
- barre panier persistante ;
- panier en bottom sheet ;
- scanner plein ecran ;
- confirmation d'ajout proche de l'article et dans le panier ;
- aucune remontee forcee de la page.

### 8.3 Tablette vendeur

- navigation rail compacte ;
- catalogue a gauche et panier permanent a droite ;
- scanner et panier visibles simultanement en paysage ;
- historique des derniers scans ;
- total et action d'envoi toujours accessibles.

### 8.4 Desktop vendeur

- panier sticky avec scroll interne ;
- favoris, recherche et raccourcis actifs ;
- raccourcis documentes dans l'aide `?` et les tooltips, sans barre permanente ;
- controle de vente, note au caissier et mise en attente ;
- demarrage immediat de la vente suivante.

### Criteres d'acceptation

- Un meme scenario produit le meme panier sur les trois appareils.
- Le panier et l'action principale restent visibles.
- Dix scans rapides donnent dix unites exactes.
- Rafraichir ou changer d'orientation ne perd pas la vente.

## 9. Lot 4 - Poste caissier desktop V2

**Priorite : P1**  
**Estimation : 5 a 7 jours**

### Composition

- rail de navigation compact ;
- top bar caisse, synchronisation, imprimante, utilisateur et aide ;
- ligne de transaction `Ticket -> Client -> Paiement -> Document` ;
- file active persistante a gauche ;
- espace de travail central ;
- dock contextuel a droite ;
- aucun footer permanent de raccourcis.

### Etapes

1. **Ticket** : selection, urgence, vendeur, note, lignes et stock.
2. **Client** : recherche telephone, verification, creation rapide ou client comptoir.
3. **Document** : ticket, facture ou bon de vente.
4. **Paiement** : especes, Mobile Money, carte, virement ou credit.
5. **Confirmation** : vente, stock, document, impression et ticket suivant.

### Raccourcis

- conserver `F2`, `F3`, `F4`, `F8` ;
- afficher le raccourci uniquement dans le tooltip de l'action ;
- ajouter un panneau d'aide ouvrable avec `?` ;
- ne pas declencher un raccourci pendant la saisie dans un champ ;
- permettre a l'utilisateur de desactiver les raccourcis si necessaire.

### Criteres d'acceptation

- La file ne disparait jamais pendant l'encaissement.
- Le total, le client et le document restent visibles avant validation.
- Le ticket suivant est propose sans effacer la confirmation precedente.
- Le parcours complet est utilisable a la souris et au clavier.

## 10. Lot 5 - Caissier tablette et mobile

**Priorite : P1**  
**Estimation : 5 a 7 jours**

### Tablette caissier

- file et detail en ecran partage ;
- identification client dans le panneau central ;
- resume et total persistants ;
- gros controles de paiement tactiles ;
- passage progressif a deux panneaux si la tablette est en portrait.

### Mobile caissier

- file en vue maitre ;
- navigation par etapes avec retour conservant les donnees ;
- total et action fixes dans la zone sure ;
- saisie telephone adaptee au clavier numerique ;
- paiement en bottom sheet ou page dediee selon la hauteur ;
- confirmation avec impression, partage et ticket suivant.

### Permissions

- seul le caissier/admin peut rattacher un client au document ;
- le vendeur peut transmettre une note, mais pas finaliser l'identite de facturation ;
- l'encours credit n'est jamais expose au vendeur.

## 11. Lot 6 - Impression, documents et recuperation

**Priorite : P2**  
**Estimation : 3 a 5 jours**

- unifier `ReceiptGenerator`, QZ Tray et les evenements d'impression ;
- choisir le format 58 mm, facture A4 ou bon selon `documentType` ;
- afficher `ORIGINAL` puis `DUPLICATA` ;
- enregistrer toute tentative d'impression ;
- si l'impression echoue, conserver la vente comme enregistree ;
- proposer `Reessayer`, `Ouvrir le document existant` et `Continuer sans imprimer` ;
- ne jamais recreer la vente pour reimprimer ;
- rendre le statut imprimante visible sur desktop/tablette et consultable sur mobile.

## 12. Lot 7 - Accessibilite, performance et compatibilite

**Priorite : P2**  
**Estimation : 3 a 5 jours**

- cibles tactiles minimales de 44 px ;
- focus visible et ordre clavier coherent ;
- `aria-live` pour ajout, scan, paiement et erreurs ;
- restauration du focus apres scanner ou panneau ;
- respect de `prefers-reduced-motion` ;
- lazy-loading du scanner et des apercus PDF ;
- virtualisation ou pagination des longues files/catalogues ;
- test Android 5/6 selon les limites deja documentees ;
- controle des safe areas PWA/Capacitor ;
- pas de donnees financieres sensibles dans le stockage local.

## 13. Lot 8 - Tests et recette multi-appareils

**Priorite : P0/P1**  
**Estimation : 4 a 6 jours repartis sur les lots**

### Tests unitaires

- totaux, unites et monnaie rendue ;
- transitions des machines d'etat ;
- normalisation du telephone ;
- validation du credit ;
- brouillon, reprise et expiration ;
- deduplication scan et idempotence.

### Tests composants

- produit ajoute -> feedback + quantite + panier ;
- ticket selectionne -> detail conserve ;
- telephone -> client trouve ou client comptoir ;
- document choisi -> bon type envoye au backend ;
- especes -> monnaie exacte ;
- credit -> encours et echeance ;
- impression echouee -> aucune seconde vente.

### Tests E2E

1. vendeur mobile -> scan -> panier -> envoi ;
2. vendeur tablette -> ajout -> controle -> envoi ;
3. vendeur desktop -> reprise brouillon -> envoi ;
4. caissier mobile -> client -> paiement -> confirmation ;
5. caissier tablette -> file -> facture -> impression ;
6. caissier desktop -> raccourci -> paiement -> ticket suivant ;
7. credit avec acompte ;
8. panne imprimante puis reimpression ;
9. double clic et double onglet ;
10. perte reseau avant et apres validation.

## 14. Ordre de livraison recommande

```text
Semaine 1
  Lot 0 baseline
  Lot 1 contrats backend et idempotence

Semaine 2
  Lot 2 architecture partagee
  Debut Lot 3 vendeur

Semaine 3
  Fin Lot 3 vendeur mobile/tablette/desktop
  Debut Lot 4 caissier desktop

Semaine 4
  Fin Lot 4 caissier desktop
  Lot 5 caissier tablette/mobile

Semaine 5
  Lot 6 impression et credit
  Lot 7 accessibilite/performance

Semaine 6
  Recette complete, corrections, deploiement progressif
```

Estimation globale pour un developpeur : **24 a 36 jours ouvrables**, selon la profondeur des migrations backend et des tests automatiques.

## 15. Strategie de deploiement

1. Activer la V2 sur un environnement de test.
2. Recette avec les comptes VENDEUR et CAISSIER de test.
3. Activer d'abord vendeur mobile/tablette pour un petit groupe.
4. Activer le caissier desktop sur un seul poste.
5. Verifier ventes, stock, caisse, factures et impressions pendant une journee.
6. Etendre aux autres postes et appareils.
7. Conserver la feature flag de retour arriere pendant au moins une semaine.

## 16. Definition de termine

La livraison est terminee lorsque :

- les interfaces correspondent aux maquettes validees sur les six formats ;
- le vendeur voit toujours l'effet d'un clic ou d'un scan ;
- le panier ou le total reste visible a chaque etape ;
- le caissier peut rechercher le client par telephone et choisir le document ;
- les raccourcis desktop fonctionnent sans barre permanente ;
- le paiement en especes calcule la monnaie ;
- le credit affiche un encours et une echeance fiables ;
- une panne d'impression ne provoque jamais une seconde vente ;
- aucune requete concurrente ne cree un double encaissement ;
- les tests mobile, tablette et desktop passent ;
- le build, le lint, les migrations et les tests backend sont verts ;
- la documentation vendeur/caissier est mise a jour.

## 17. Premiere livraison a lancer

La premiere implementation doit contenir uniquement le socle indispensable :

1. baseline et tests UI ;
2. recherche client serveur ;
3. type de document et contrat d'encaissement ;
4. idempotence forte ;
5. extraction des hooks vendeur et caissier ;
6. poste caissier desktop V2 derriere feature flag.

Cette tranche valide l'architecture et les operations financieres avant de decliner les memes composants sur tablette et mobile.
