# Plan d'implementation UX et interactions du panneau admin Newoteg

**Date :** 16 juillet 2026
**Statut :** EN COURS — premiere livraison P0 implementee le 16 juillet 2026
**Perimetre principal :** panneau admin React/PWA, parcours vendeur, caisse, formulaires de gestion, recherche et notifications
**Document parent :** `PLAN_DIRECTEUR_AMELIORATION_NEWOTEG_2026.md`

## Avancement de l'implementation

| Lot | Etat | Livraison actuelle |
|---|---|---|
| Lot 0 - baseline et tests | Partiel | Tests unitaires de persistance du panier, lint, build et verification navigateur des parcours critiques |
| Lot 1 - feedback d'ajout | Implemente | Confirmation visuelle, quantite reelle, limite de stock explicite et toasts dedupliques |
| Lot 2 - panier toujours visible | Implemente | Panier sticky sur ordinateur et barre panier persistante sur mobile |
| Lot 3 - protection du panier | Partiel | Sauvegarde/restauration automatique et confirmation avant vidage ; garde de navigation globale a poursuivre |
| Lot 4 - file caissier | Partiel | Modal stabilisee, contenu defilable, actions et total toujours visibles ; tests avec tickets reels a poursuivre |
| Lots 5 a 9 | A faire | Formulaires sales, navigation contextuelle, accessibilite globale, confort scanner et instrumentation |

## 1. Objectif

Corriger les problemes d'interaction qui ne bloquent pas necessairement le code, mais qui peuvent provoquer :

- des doubles ajouts dans un panier ;
- une mauvaise quantite vendue ;
- la perte d'une vente ou d'un formulaire en cours ;
- une action repetee parce que son resultat n'est pas visible ;
- une hesitation devant un bouton desactive ou une icone ambigue ;
- une navigation qui perd l'element que l'utilisateur voulait consulter ;
- une experience differente d'un ecran a l'autre.

Ce plan ne demande pas une refonte graphique complete. Il renforce le design system existant et applique les memes regles d'interaction aux ecrans operationnels.

## 2. Principes de conception retenus

1. **Le panier doit rester visible**, mais la page ne doit pas remonter automatiquement apres chaque scan.
2. **Chaque action produit un retour immediat** a proximite de l'action et dans une zone globale visible.
3. **Les quantites affichees doivent representer les unites**, pas seulement le nombre de lignes distinctes.
4. **Une action ignoree doit expliquer pourquoi** : stock maximal, champ manquant, role insuffisant ou traitement en cours.
5. **Une action destructive doit etre confirmee ou annulable**.
6. **Un travail non enregistre doit etre protege** contre la fermeture d'une modale et la navigation React.
7. **Un resultat de recherche ou une notification conserve sa cible exacte**.
8. **Les animations restent courtes et fonctionnelles**, avec respect de `prefers-reduced-motion`.
9. **Le backend reste l'autorite** pour le stock, les prix, l'encaissement et l'idempotence.
10. **Chaque lot doit etre testable et reversible** independamment.

## 3. Niveaux de priorite

| Priorite | Definition | Exemples |
|---|---|---|
| P0 | Risque de perte de donnees, erreur de vente ou mauvaise operation de caisse | panier perdu, ajout invisible, double encaissement |
| P1 | Continuite du travail et rapidite des operations frequentes | panier sticky, footer caisse stable, formulaires proteges |
| P2 | Coherence globale, navigation, accessibilite et comprehension | toasts, boutons, recherche ciblee, icones explicites |
| P3 | Confort avance, personnalisation et mesure | son scanner, vibration, journal des derniers scans, metriques UX |

## 4. Ordre d'implementation recommande

```text
Socle de test
    |
    v
POS vendeur/admin -----> Protection et persistance du panier
    |                                  |
    v                                  v
File caissier ---------> Standardisation feedback/actions
                                       |
                                       v
Formulaires non enregistres ---> Navigation contextuelle
                                       |
                                       v
Accessibilite + confort + mesures
```

---

## 5. Lot 0 — Baseline et tests d'interaction

**Priorite : P0**
**Estimation : 0,5 a 1 jour**

### Actions

- Capturer les comportements actuels des parcours :
  - ajout par clic ;
  - ajout par recherche ;
  - ajout par douchette ;
  - ajout jusqu'au stock maximal ;
  - envoi vendeur vers caissier ;
  - encaissement ;
  - fermeture d'une vente en cours ;
  - fermeture d'un formulaire modifie.
- Ajouter un socle de tests composants adapte a Vite/React :
  - `vitest` ;
  - `@testing-library/react` ;
  - `@testing-library/user-event` ;
  - `jsdom`.
- Conserver les tests de services existants avec `tsx --test`.
- Ajouter une commande dediee, par exemple `npm run test:ui`.
- Definir trois tailles de recette :
  - desktop boutique : `1366 × 768` ;
  - tablette : `768 × 1024` ;
  - telephone : `360 × 800`.

### Fichiers concernes

- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/package.json`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/vite.config.ts`
- nouveau dossier `src/components/__tests__/`
- nouveau dossier `src/test/`

### Criteres d'acceptation

- Les tests actuels continuent de passer.
- Un composant utilisant `ToastProvider` peut etre teste.
- Les clics multiples et les changements de route peuvent etre simules.
- Le build et le controle TypeScript restent verts.

---

## 6. Lot 1 — Panier vendeur/admin toujours visible

**Priorite : P0 — premier lot fonctionnel**
**Estimation : 1 a 2 jours**

### 6.1 Panier sticky sur ordinateur

- Rendre le panneau panier sticky sous le header.
- Utiliser une hauteur maximale basee sur la fenetre :
  - panneau stable ;
  - liste des lignes avec scroll interne ;
  - total et action principale toujours visibles.
- Appliquer la correction aux deux parcours :
  - bon vendeur/admin dans `POSVendeur.tsx` ;
  - vente directe dans `Ventes.tsx`.
- Ne pas appliquer de scroll automatique vers le haut apres chaque ajout.

### 6.2 Barre panier mobile

- Conserver la barre fixe existante.
- Afficher :
  - quantite totale d'unites ;
  - nombre de references distinctes si utile ;
  - montant total.
- Animer brievement la barre lors d'un ajout.
- Garder la compatibilite avec la zone sure Android.

### 6.3 Compteurs corrects

Ajouter des valeurs derivees communes :

- `totalUnits = somme(quantite)` ;
- `distinctItems = panier.length` ;
- `cartTotal = somme(prix × quantite)`.

Exemple d'affichage :

```text
Panier · 7 unites · 3 references
Total : 125 000 FCFA
```

### Fichiers concernes

- `src/components/POSVendeur.tsx`
- `src/components/Ventes.tsx`
- eventuellement nouveau `src/utils/cart.ts`

### Criteres d'acceptation

- En bas du catalogue desktop, le panier reste visible.
- Une liste longue de produits ne pousse pas le total hors ecran.
- Trois scans du meme produit affichent trois unites.
- Le mobile ne masque aucun bouton derriere la barre systeme Android.
- Aucun scroll force ne perturbe la recherche ou le scan suivant.

---

## 7. Lot 2 — Feedback immediat apres clic ou scan

**Priorite : P0**
**Estimation : 1 a 2 jours**

### 7.1 Feedback local sur la carte

Lors d'un ajout reussi :

- etat presse de 100 a 150 ms ;
- contour primaire ou vert temporaire ;
- coche temporaire ;
- badge de quantite visible sur la carte ;
- texte accessible via une zone `aria-live`.

### 7.2 Feedback dans le panier

- Memoriser `lastAddedProductId`.
- Surligner temporairement la ligne ajoutee ou incrementee.
- Faire defiler uniquement la liste interne du panier vers la ligne concernee si elle est hors de cette liste.
- Ne jamais faire defiler toute la page.

### 7.3 Feedback global

Utiliser le `Toast` existant :

- `Chargeur Samsung ajoute — quantite : 3.`
- `Stock maximal atteint pour Chargeur Samsung : 5 unites.`
- `Produit introuvable pour le code scanne.`

### 7.4 Scanner et douchette

- Remettre le focus sur le champ de scan/recherche.
- Afficher le nom, la nouvelle quantite et le total.
- Rejeter explicitement un scan au stock maximal.
- Eviter qu'un meme evenement scanner declenche a la fois `Enter` et le timer de secours.
- Ajouter un verrou court par valeur scannee si le materiel emet deux evenements identiques.

### Fichiers concernes

- `src/components/POSVendeur.tsx`
- `src/components/Ventes.tsx`
- `src/components/ui/Toast.tsx`
- nouveau hook possible `src/hooks/useItemInteractionFeedback.ts`

### Criteres d'acceptation

- L'utilisateur ressent et voit chaque clic.
- Dix scans rapides donnent une quantite exacte.
- Le stock maximal ne peut pas etre depasse et l'utilisateur comprend le blocage.
- Le feedback reste visible meme si l'utilisateur est en bas du catalogue.
- Le mode de mouvement reduit supprime les animations non indispensables.

---

## 8. Lot 3 — Protection et reprise du panier

**Priorite : P0**
**Estimation : 1,5 a 2 jours**

### 8.1 Protection de navigation React

- Completer `beforeunload` avec un bloqueur de navigation React Router.
- Intercepter :
  - clic dans la sidebar ;
  - changement d'onglet interne qui masque une vente ;
  - retour navigateur ;
  - deconnexion avec panier non vide.
- Proposer :
  - `Continuer la vente` ;
  - `Mettre le panier en attente` ;
  - `Quitter et abandonner`.

### 8.2 Persistance locale

- Reutiliser le service de paniers suspendus deja present.
- Ajouter un brouillon automatique par :
  - utilisateur ;
  - poste de travail ;
  - type de parcours.
- Sauvegarder :
  - lignes ;
  - prix ;
  - motifs de remise ;
  - client ;
  - methode de paiement ;
  - date de derniere modification.
- Ajouter une duree de vie et une suppression apres validation.
- Ne jamais stocker PIN, JWT ou donnees sensibles inutiles dans ce brouillon.

### 8.3 Actions destructives

- Remplacer `Vider` par une confirmation claire.
- Pour le retrait d'une seule ligne :
  - suppression immediate possible ;
  - toast avec action `Annuler` pendant quelques secondes.
- Conserver une confirmation forte pour vider tout le panier.

### Fichiers concernes

- `src/components/POSVendeur.tsx`
- `src/components/Ventes.tsx`
- `src/components/Sidebar.tsx`
- `src/services/cashierProductivity.ts`
- nouveau hook `src/hooks/useUnsavedNavigationGuard.ts`
- evolution du `Toast` pour accepter une action facultative

### Criteres d'acceptation

- Une navigation interne ne perd jamais silencieusement le panier.
- Un rafraichissement restaure la vente en cours.
- Une vente validee supprime son brouillon.
- Le bouton `Vider` ne peut pas effacer le panier sur un clic accidentel.
- La reprise n'envoie pas deux fois la meme vente.

---

## 9. Lot 4 — Encaissement caissier stable

**Priorite : P0/P1**
**Estimation : 1 a 1,5 jour**

### Actions

- Transformer la modale d'encaissement en structure :
  - header fixe ;
  - contenu central scrollable ;
  - footer fixe avec total et bouton d'encaissement.
- Afficher dans le footer :
  - montant ;
  - methode choisie ;
  - client pour le credit ;
  - action finale.
- Afficher le vendeur du ticket lorsque la donnee est disponible.
- Compter les unites totales et non seulement les lignes.
- Corriger le texte de rafraichissement :
  - indiquer `mise a jour en temps reel` si SSE est actif ;
  - afficher un bouton de relance en cas de deconnexion.
- Conserver le verrou `submitting` et verifier qu'un double clic ne produit qu'une requete.
- Garder le ticket selectionne si une erreur recuperable survient.
- Apres encaissement :
  - toast fixe ;
  - retrait du ticket de la file ;
  - mise a jour du solde ;
  - proposition d'impression.

### Fichiers concernes

- `src/components/FileCaissier.tsx`
- `src/components/CaisseJour.tsx`
- `src/services/authenticatedSse.ts`
- tests backend d'idempotence deja existants a completer si necessaire

### Criteres d'acceptation

- Avec un ticket de 20 lignes, le bouton `Encaisser` reste visible.
- Le caissier voit toujours le total avant validation.
- Un double clic ne cree qu'un encaissement.
- Une erreur reseau ne ferme pas la modale ni ne fait disparaitre le ticket.
- Le statut temps reel affiche correspond au fonctionnement reel.

---

## 10. Lot 5 — Standardisation des messages et actions

**Priorite : P1**
**Estimation : 2 a 4 jours**

### Objectif

Remplacer progressivement les `alert()`, `confirm()` et erreurs silencieuses par les composants existants :

- `Toast` ;
- `Button` ;
- `ConfirmDialog` ;
- `EmptyState`.

### Ordre de migration

#### Groupe A — flux financiers et operationnels

- `POSVendeur.tsx`
- `Ventes.tsx`
- `FileCaissier.tsx`
- `CaisseJour.tsx`
- `Caisse.tsx`
- `Achats.tsx`

#### Groupe B — catalogue et stock

- `Produits.tsx`
- `StockAlerts.tsx`
- `MouvementsStock.tsx`
- `Categories.tsx`
- `Attributs.tsx`

#### Groupe C — administration

- `AdminAccounts.tsx`
- `Roles.tsx`
- `Fournisseurs.tsx`
- `Clients.tsx`

### Regles de messages

- Une creation reussie dit ce qui a ete cree.
- Une modification reussie nomme l'element modifie.
- Une erreur explique l'action a effectuer.
- Un bouton et son message final utilisent le meme verbe.
- Une erreur ne doit jamais etre avalee silencieusement si elle affecte l'utilisateur.
- Les erreurs techniques restent dans les logs, les messages utilisateur restent lisibles.

### Evolution du Toast

Ajouter facultativement :

- `actionLabel` ;
- `onAction` ;
- duree adaptee ;
- identifiant de deduplication pour eviter plusieurs messages identiques.

### Criteres d'acceptation

- Aucun `alert()` dans les parcours de vente et caisse.
- Aucun `confirm()` natif pour les actions destructives principales.
- Chaque mutation visible a un etat chargement, succes ou erreur.
- Les boutons utilisent des tailles tactiles conformes au design system.
- Les erreurs de recherche, notifications et mise a jour ne sont plus silencieuses.

---

## 11. Lot 6 — Protection des formulaires non enregistres

**Priorite : P1**
**Estimation : 2 a 3 jours**

### Formulaires prioritaires

- produit ;
- achat et lignes d'achat ;
- calcul des prix de lot ;
- compte administrateur ;
- categorie ;
- attribut et valeur ;
- employe ;
- parametres de paie.

### Actions

- Creer un hook reutilisable `useDirtyFormGuard`.
- Comparer l'etat courant a l'etat initial normalise.
- Intercepter :
  - bouton fermer ;
  - clic sur l'overlay ;
  - bouton annuler ;
  - changement de route ;
  - retour navigateur.
- Afficher :
  - `Continuer la saisie` ;
  - `Quitter sans enregistrer`.
- Bloquer la fermeture pendant une soumission.
- Ajouter un brouillon local pour les formulaires longs :
  - achat ;
  - prix de lot ;
  - produit avec images.
- Ajouter un bouton explicite `Effacer le brouillon`.

### Mise en page des formulaires longs

- Header de modale fixe.
- Zone de champs scrollable.
- Footer d'actions fixe.
- Resume des erreurs dans le footer.
- Scroll et focus vers le premier champ invalide.

### Criteres d'acceptation

- Fermer un produit modifie demande confirmation.
- Une saisie d'achat longue peut etre restauree apres actualisation.
- Les boutons d'enregistrement restent visibles.
- Une erreur indique le champ a corriger.
- Une soumission en cours ne peut pas etre fermee accidentellement.

---

## 12. Lot 7 — Recherche et navigation contextuelle

**Priorite : P1/P2**
**Estimation : 2 a 4 jours frontend, plus migration backend pour les notifications**

### 12.1 Recherche globale

Au lieu d'ouvrir uniquement `/produits` ou `/clients`, transmettre la cible :

```text
/produits?focus=<produitId>
/clients?focus=<clientId>
/orders?focus=<commandeId>
/fournisseurs?focus=<fournisseurId>
```

Chaque page cible doit :

- lire `focus` ;
- charger l'element meme s'il n'est pas sur la page courante ;
- ouvrir son detail ou le mettre en evidence ;
- nettoyer le parametre apres traitement si necessaire.

### 12.2 Dashboard

- Les debiteurs ouvrent directement le client concerne.
- Les echeances visibles deviennent clairement cliquables ou perdent leur effet hover.
- Les actions urgentes ouvrent la vue deja filtree.
- Les tickets en attente ouvrent l'onglet `A encaisser`.

### 12.3 Notifications

Le modele actuel ne contient pas de cible. Ajouter une migration compatible :

- `targetType String?` ;
- `targetId String?` ;
- `targetRoute String?` ;
- eventuellement `context Json?`.

Etendre `NotificationService.create()` avec des options facultatives, sans casser les appels existants.

Exemples :

```text
VENTE_CREEE -> /ventes?focus=<venteId>
PRODUIT_MAJ -> /produits?focus=<produitId>
ACHAT_CREE -> /achats?focus=<achatId>
FACTURE_VIRTUELLE_DEMANDE -> /invoices?focus=<factureId>
STOCK_CHANGE -> /stock?focus=<mouvementId>
```

### Fichiers concernes

- `src/components/Header.tsx`
- `src/components/Dashboard.tsx`
- pages cibles : Produits, Clients, Orders, Fournisseurs, Ventes, Achats, Echeances
- `Back-end/prisma/schema.prisma`
- nouvelle migration Prisma
- `Back-end/src/notification/notification.service.ts`
- services metier qui creent les notifications

### Criteres d'acceptation

- Cliquer un produit dans la recherche ouvre ce produit precis.
- Cliquer une notification ouvre l'objet concerne.
- Une notification ancienne sans cible reste lisible et ne casse pas l'interface.
- Les filtres du dashboard sont conserves dans l'URL.
- Le bouton retour ramene l'utilisateur dans un contexte coherent.

---

## 13. Lot 8 — Etats des boutons, icones et accessibilite

**Priorite : P2**
**Estimation : 2 a 4 jours**

### Actions

- Remplacer les zones cliquables `div` par des `button` ou liens semantiques.
- Ajouter un focus visible a toutes les actions.
- Ajouter `aria-label` aux boutons uniquement iconiques.
- Sur mobile, ajouter des libelles visibles aux actions sensibles :
  - modifier ;
  - reinitialiser le mot de passe ;
  - activer/desactiver ;
  - supprimer.
- Respecter une cible tactile minimale de 44 px.
- Ajouter `aria-pressed` aux toggles et choix persistants.
- Ajouter une raison lisible aux boutons desactives :
  - texte d'aide ;
  - tooltip ;
  - message pres du champ manquant.
- Verifier la navigation clavier des :
  - cartes produits ;
  - resultats de recherche ;
  - notifications ;
  - tableaux cliquables ;
  - modales.
- Ajouter gestion de `Escape` et restauration du focus apres fermeture d'une modale.

### Criteres d'acceptation

- Le POS principal est utilisable au clavier.
- Une action mobile sensible n'est jamais representee par une icone ambigue seule.
- Un bouton desactive explique la condition manquante.
- Le focus revient au controle qui a ouvert une modale.
- Les tests axe/ARIA critiques ne signalent pas de probleme bloquant.

---

## 14. Lot 9 — Confort scanner et mesure UX

**Priorite : P3**
**Estimation : 1,5 a 3 jours**

### Fonctions optionnelles

- Son court pour :
  - ajout reussi ;
  - stock maximal ;
  - produit introuvable.
- Vibration legere sur Android lorsque disponible.
- Parametre utilisateur pour couper sons et vibrations.
- Mini journal des trois derniers scans :
  - produit ;
  - quantite ;
  - heure ;
  - statut.
- Indicateur de douchette active.
- Mesurer localement :
  - temps entre premier scan et envoi ;
  - nombre de corrections de quantite ;
  - paniers abandonnes ;
  - erreurs de stock ;
  - reprises de brouillon.
- Ne jamais enregistrer de PIN, JWT ou information client sensible dans ces metriques.

### Criteres d'acceptation

- Les sons peuvent etre desactives.
- Le journal permet de verifier rapidement les derniers scans.
- Les metriques ne ralentissent pas l'encaissement.
- Aucune donnee sensible n'est collectee.

---

## 15. Strategie de tests

### Tests unitaires

- calcul des unites et du total ;
- blocage au stock maximal ;
- deduplication des scans ;
- serialisation et restauration du panier ;
- detection de formulaire modifie ;
- resolution des routes de recherche et notification.

### Tests composants

- clic produit -> badge, ligne panier et toast ;
- ajout repete -> quantite incrementee ;
- bouton vider -> confirmation ;
- navigation avec panier -> dialogue ;
- formulaire modifie -> dialogue ;
- ticket long -> footer visible ;
- double clic encaisser -> une seule action ;
- bouton desactive -> raison affichee.

### Tests d'integration backend

- creation de notification avec et sans cible ;
- compatibilite des anciennes notifications ;
- idempotence encaissement ;
- stock maximal refuse cote serveur ;
- absence de doublon lors d'une reprise hors ligne.

### Recette manuelle boutique

1. Scanner 20 fois plusieurs produits.
2. Verifier la quantite totale.
3. Atteindre volontairement le stock maximal.
4. Descendre en bas du catalogue.
5. Changer de page avec panier actif.
6. Rafraichir puis reprendre la vente.
7. Envoyer au caissier.
8. Encaisser un ticket de 20 lignes.
9. Simuler une coupure reseau avant validation.
10. Tester au clavier, a la souris, avec douchette et sur Android.

## 16. Ordre des commits recommande

1. `test(admin): add UI interaction test harness`
2. `fix(pos): keep cart visible and show total units`
3. `feat(pos): add local and global add-to-cart feedback`
4. `fix(pos): persist and protect active carts`
5. `fix(cashier): keep checkout actions visible`
6. `refactor(ui): standardize toast button and confirmations`
7. `feat(forms): guard and restore unsaved changes`
8. `feat(search): preserve selected resource context`
9. `feat(notifications): add resource targets`
10. `fix(a11y): normalize keyboard and mobile actions`
11. `feat(pos): add optional scan sound and recent scan log`
12. `docs(ux): update design system and user guides`

## 17. Estimation globale

| Bloc | Estimation indicative |
|---|---:|
| P0 — vente, feedback, panier, caisse | 5 a 8 jours |
| P1 — standardisation, formulaires, navigation | 7 a 13 jours |
| P2 — coherence et accessibilite generale | 3 a 6 jours |
| P3 — confort scanner et mesures | 2 a 4 jours |
| Recette et corrections | 2 a 4 jours |
| **Total indicatif** | **19 a 35 jours de travail** |

Ces estimations dependent de la profondeur des tests automatises et du nombre d'ecrans migres dans chaque lot. Les lots P0 peuvent etre livres et testes avant la fin du reste du programme.

## 18. Definition de termine

Le plan sera termine lorsque :

- le panier reste visible sur les ecrans de vente ;
- chaque ajout est immediatement perceptible ;
- les quantites affichees sont exactes ;
- aucune vente ou saisie longue ne se perd silencieusement ;
- les actions de caisse restent visibles et idempotentes ;
- les alertes natives ont disparu des parcours critiques ;
- la recherche et les notifications ouvrent la bonne cible ;
- les actions mobiles sont comprehensibles et accessibles ;
- les tests automatiques et la recette desktop/mobile passent ;
- le design system et les guides vendeur/caissier sont mis a jour.

## 19. Decision recommandee

Valider immediatement les lots 0 a 4 comme premiere livraison :

1. socle de tests ;
2. panier sticky ;
3. feedback clic/scan ;
4. protection et reprise du panier ;
5. encaissement caissier stable.

Cette premiere livraison traite les risques les plus proches de l'argent, du stock et des erreurs quotidiennes en boutique. Les lots 5 a 9 peuvent ensuite etre executes sans bloquer la recette du parcours vendeur vers caissier.
