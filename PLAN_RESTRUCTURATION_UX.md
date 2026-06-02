# PLAN_RESTRUCTURATION_UX — Fusion des flux Vendeur & Caissier

> Généré le 2026-06-02  
> Statut : À implémenter

---

## 1. Contexte & Périmètre

### Objectif
Éliminer la duplication des interfaces en fusionnant les deux flux parallèles (L4 ancien + Plan nouveau) en un seul flux cohérent par rôle :

```
AVANT                              APRÈS
──────────────────────────────     ──────────────────────────
VENDEUR                            VENDEUR
  ├── Vente en cours   ─┐            └── Vente en cours  ← point unique
  └── Bons de vente   ─┘                   ├── onglet "Catalogue + Panier"
  └── Mes tickets                           └── onglet "En attente (N)"
                                   └── Mes tickets  ← tickets ENCAISSÉS seulement

CAISSIER                           CAISSIER
  ├── File d'attente   ─┐            └── File d'attente  ← point unique
  └── Validation caisse─┘                   (SSE + validation + facture + prime)
```

### Ce qu'on touche
| Fichier | Type de changement |
|---|---|
| `Back-end/src/bon-vente/bon-vente.dto.ts` | Ajouter `ValiderBonDto` |
| `Back-end/src/bon-vente/bon-vente.controller.ts` | Passer `@Body()` à `valider()` |
| `Back-end/src/bon-vente/bon-vente.service.ts` | Transmettre methode + clientId à `ticketService.encaisser()` |
| `Font-end-admin/.../src/App.tsx` | Supprimer routes /bons et /caisse-validation |
| `Font-end-admin/.../src/components/Sidebar.tsx` | Supprimer items menu + badge sur Mes tickets |
| `Font-end-admin/.../src/components/POSVendeur.tsx` | Fusion BonVente — refonte principale |
| `Font-end-admin/.../src/components/FileCaissier.tsx` | Fusion CaisseValidation |
| `Font-end-admin/.../src/components/MesTickets.tsx` | Filtre ENCAISSÉ + badge |

### Ce qu'on ne touche PAS
- `Font-end/` (frontend client e-commerce) — **interdit**
- Schéma Prisma — aucun changement de modèle
- `BonVente.tsx`, `CaisseValidation.tsx` — conservés sur disque, juste délistés du routing
- Tous les autres composants (Dashboard, Produits, Clients, Caisse, etc.)
- Aucune nouvelle dépendance npm

---

## 2. Modèles Prisma

**Aucun changement de schéma requis.** Les modèles `TicketVente`, `Facture`, `FactureLigne`, `PrimeVendeur` sont déjà corrects.

> ⚠️ **RAPPEL CRITIQUE — Responsable projet**  
> Les tables `facture`, `facture_ligne`, `prime_vendeur` **n'existent pas encore en base Railway**.  
> Avant la mise en production, exécuter dans `Back-end/` :  
> ```bash
> npx prisma db push
> ```
> Sans cela, la génération de factures et de primes échouera silencieusement.

---

## 3. Endpoints

### 3.1 Endpoints existants utilisés (aucun changement)

| Méthode | Route | Rôle | Utilisé par |
|---|---|---|---|
| POST | `/api/bons` | VENDEUR | POSVendeur — créer un bon |
| GET | `/api/bons/mes-bons` | VENDEUR | POSVendeur — onglet "En attente" |
| GET | `/api/bons/mon-score` | VENDEUR | POSVendeur — score mensuel |
| POST | `/api/bons/:id/annuler` | VENDEUR | POSVendeur — annuler un bon EN_ATTENTE |
| GET | `/api/bons/pending` | CAISSIER | FileCaissier — liste des bons |
| GET | `/api/bons/stream` | CAISSIER | FileCaissier — SSE temps réel |

### 3.2 Endpoint modifié — `POST /api/bons/:id/valider`

**Situation actuelle** : le body est vide ou ignoré, la méthode de paiement n'est pas transmise à `ticketService.encaisser()`.

**Situation cible** : le caissier choisit la méthode de paiement au moment de la validation (comme dans l'ancienne File d'attente).

**Nouveau payload** :
```json
{
  "methodePaiement": "ESPECES | MOBILE_MONEY | CARTE | VIREMENT | CREDIT",
  "clientId": "uuid",      // optionnel — obligatoire si CREDIT
  "montantPaye": 5000      // optionnel — acompte pour vente à crédit
}
```

**Réponse** (inchangée) :
```json
{
  "facture": { "id": "...", "numero": "FAC-2026-0001", "totalTTC": 12000, ... }
}
```

**Rôles autorisés** : `SUPER_ADMIN`, `ADMIN`, `CAISSIER`

---

## 4. Fichiers à créer / modifier — Chemins exacts

### Chemins de référence
```
Back-end/
  src/
    bon-vente/
      bon-vente.dto.ts
      bon-vente.controller.ts
      bon-vente.service.ts

Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/
  src/
    App.tsx
    components/
      Sidebar.tsx
      POSVendeur.tsx
      FileCaissier.tsx
      MesTickets.tsx
      BonVente.tsx         ← NE PAS MODIFIER (conserver, juste dérouter)
      CaisseValidation.tsx ← NE PAS MODIFIER (conserver, juste dérouter)
    services/
      api.ts               ← ajouter bonVenteApi.valider(id, body)
```

---

## 5. Détail des modifications

---

### Étape 1 — Backend : `bon-vente.dto.ts`

Ajouter le DTO de validation :

```typescript
export class ValiderBonDto {
  methodePaiement: 'ESPECES' | 'MOBILE_MONEY' | 'CARTE' | 'VIREMENT' | 'CREDIT';
  clientId?: string;
  montantPaye?: number;
}
```

---

### Étape 2 — Backend : `bon-vente.controller.ts`

Modifier l'endpoint `valider` pour recevoir le body :

```typescript
// AVANT
@Post(':id/valider')
valider(@Param('id') id: string, @Req() req) {
  return this.bonVenteService.valider(id, req.user);
}

// APRÈS
@Post(':id/valider')
valider(@Param('id') id: string, @Body() dto: ValiderBonDto, @Req() req) {
  return this.bonVenteService.valider(id, req.user, dto);
}
```

---

### Étape 3 — Backend : `bon-vente.service.ts`

Modifier la signature et l'appel à `ticketService.encaisser()` :

```typescript
// AVANT
async valider(ticketId: string, actor: any) {
  const ticket = await this.ticketService.findOne(ticketId);
  await this.ticketService.encaisser(ticketId, ticket.methodePaiement, actor.id);
  // ... créer Facture + PrimeVendeur
}

// APRÈS
async valider(ticketId: string, actor: any, dto?: ValiderBonDto) {
  const ticket = await this.ticketService.findOne(ticketId);
  // Le caissier peut surcharger la méthode de paiement choisie par le vendeur
  const methode = dto?.methodePaiement ?? ticket.methodePaiement ?? 'ESPECES';
  await this.ticketService.encaisser(ticketId, methode, actor.id, {
    clientId: dto?.clientId,
    montantPaye: dto?.montantPaye,
  });
  // ... reste inchangé (créer Facture + PrimeVendeur)
}
```

> **Note** : vérifier que `ticketService.encaisser()` accepte déjà `clientId` et `montantPaye`.  
> Si non, ajouter ces paramètres dans `ticket-vente.service.ts` (méthode `encaisser`).

---

### Étape 4 — Frontend : `services/api.ts`

Modifier `bonVenteApi.valider` pour accepter un body :

```typescript
// AVANT
export const bonVenteApi = {
  ...
  // si valider n'existait pas ou était sans body :
};

// APRÈS — ajouter/modifier dans bonVenteApi :
valider: (id: string, body: {
  methodePaiement: string;
  clientId?: string;
  montantPaye?: number;
}) => api.post(`/bons/${id}/valider`, body).then(res => res.data),
```

---

### Étape 5 — Frontend : `App.tsx`

**Supprimer** :
```tsx
// Supprimer ces 2 imports
import { BonVente } from './components/BonVente';
import { CaisseValidation } from './components/CaisseValidation';

// Supprimer ces 2 routes
<Route path="bons" element={<RoleProtectedRoute allowedRoles={['VENDEUR']}><BonVente /></RoleProtectedRoute>} />
<Route path="caisse-validation" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER']}><CaisseValidation /></RoleProtectedRoute>} />
```

---

### Étape 6 — Frontend : `Sidebar.tsx`

**Supprimer** les items de navigation :
- `{ label: 'Bons de vente', path: '/bons', ... }` — section VENDEUR
- `{ label: 'Validation caisse', path: '/caisse-validation', ... }` — section CAISSIER

**Modifier** l'item "Mes tickets" pour ajouter un badge avec le nombre de bons EN_ATTENTE :

```tsx
// Dans le composant Sidebar, charger le score/count vendeur
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  if (admin?.role === 'VENDEUR' || admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN') {
    bonVenteApi.mesBons()
      .then((bons: any[]) => {
        setPendingCount(bons.filter(b => b.statut === 'EN_ATTENTE').length);
      })
      .catch(() => {});
  }
}, [admin]);

// Dans le rendu du lien "Mes tickets" :
<NavLink to="/mes-tickets">
  <span>Mes tickets</span>
  {pendingCount > 0 && (
    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
      {pendingCount}
    </span>
  )}
</NavLink>
```

---

### Étape 7 — Frontend : `POSVendeur.tsx` — Refonte principale

#### État à ajouter
```typescript
// Nouveaux états
const [activeTab, setActiveTab] = useState<'vente' | 'enAttente'>('vente');
const [clients, setClients] = useState<Client[]>([]);
const [selectedClientId, setSelectedClientId] = useState('');
const [paymentMethod, setPaymentMethod] = useState('ESPECES');
const [bonsEnAttente, setBonsEnAttente] = useState<Bon[]>([]);
const [monScore, setMonScore] = useState(0);

// Type Bon (pour l'onglet En attente)
type Bon = {
  id: string;
  numeroTicket: string;
  statut: 'EN_ATTENTE' | 'ENCAISSE' | 'EXPIRE' | 'ANNULE';
  createdAt: string;
  lignes: Array<{ id: string; nomProduit: string; quantite: number; sousTotal: number }>;
};
```

#### Chargement des données
```typescript
const loadData = async () => {
  const [produitData, clientData, bonsData, scoreData] = await Promise.all([
    produitApi.getAll(),
    clientApi.getAll(),
    bonVenteApi.mesBons(),
    bonVenteApi.monScore(),
  ]);
  setProduits(produitData);
  setClients(clientData);
  // Séparer : EN_ATTENTE → onglet "En attente", ENCAISSE → Mes tickets (autre page)
  setBonsEnAttente((bonsData || []).filter((b: Bon) => b.statut === 'EN_ATTENTE'));
  setMonScore(Number(scoreData?.nombreTickets || 0));
};
```

#### Création du bon — remplacer `ticketApi.create()` par `bonVenteApi.create()`
```typescript
// AVANT
const ticket = await ticketApi.create({
  nomClient: nomClient.trim() || undefined,
  telephoneClient: telephoneClient.trim() || undefined,
  lignes: panier.map(l => ({ produitId: l.produitId, quantite: l.quantite })),
});

// APRÈS
await bonVenteApi.create({
  clientId: selectedClientId || undefined,
  methodePaiement: paymentMethod,
  lignes: panier.map(l => ({
    produitId: l.produitId,
    quantite: l.quantite,
    prixUnitaire: l.prix,
  })),
});
setPanier([]);
setSelectedClientId('');
setPaymentMethod('ESPECES');
// Recharger les bons en attente + switcher sur l'onglet
await loadData();
setActiveTab('enAttente');
```

#### Panier — remplacer le client en texte libre par le dropdown enregistré
```tsx
// SUPPRIMER les champs texte nomClient + telephoneClient

// AJOUTER dans la section panier :
<select
  value={selectedClientId}
  onChange={e => setSelectedClientId(e.target.value)}
  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
>
  <option value="">Client comptoir</option>
  {clients.map(c => (
    <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>
  ))}
</select>

<select
  value={paymentMethod}
  onChange={e => setPaymentMethod(e.target.value)}
  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
>
  <option value="ESPECES">Espèces</option>
  <option value="MOBILE_MONEY">Mobile Money</option>
  <option value="CARTE">Carte bancaire</option>
  <option value="VIREMENT">Virement</option>
  <option value="CREDIT">Crédit client</option>
</select>
```

#### Header — afficher le score
```tsx
<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
  Mon score ce mois : {monScore} ticket{monScore > 1 ? 's' : ''}
</div>
```

#### Structure avec onglets
```tsx
{/* Onglets */}
<div className="flex gap-2 rounded-lg bg-slate-100 p-1">
  <button onClick={() => setActiveTab('vente')}
    className={`flex-1 rounded-md px-4 py-2 text-sm font-bold ${
      activeTab === 'vente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
    }`}
  >
    Catalogue
  </button>
  <button onClick={() => setActiveTab('enAttente')}
    className={`relative flex-1 rounded-md px-4 py-2 text-sm font-bold ${
      activeTab === 'enAttente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
    }`}
  >
    En attente
    {bonsEnAttente.length > 0 && (
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
        {bonsEnAttente.length}
      </span>
    )}
  </button>
</div>

{/* Contenu selon l'onglet actif */}
{activeTab === 'vente' ? (
  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
    {/* Catalogue existant (images, search, IA) — inchangé */}
    {/* Panier avec les nouveaux champs client dropdown + paymentMethod */}
  </div>
) : (
  /* Onglet "En attente" */
  <div className="space-y-3">
    {bonsEnAttente.length === 0 ? (
      <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
        Aucun bon en attente d'encaissement.
      </p>
    ) : bonsEnAttente.map(bon => (
      <div key={bon.id} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-sm font-bold text-slate-900">{bon.numeroTicket}</p>
            <p className="text-xs text-slate-500">{new Date(bon.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            EN ATTENTE
          </span>
        </div>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          {bon.lignes.map(l => (
            <p key={l.id}>{l.quantite} × {l.nomProduit}</p>
          ))}
        </div>
        <button
          onClick={() => bonVenteApi.annuler(bon.id).then(loadData)}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          Annuler ce bon
        </button>
      </div>
    ))}
  </div>
)}
```

---

### Étape 8 — Frontend : `FileCaissier.tsx` — Fusion CaisseValidation

#### Remplacer le polling par SSE

```typescript
// SUPPRIMER l'interval polling :
// const id = setInterval(charger, 10000);

// AJOUTER la connexion SSE après le premier chargement :
useEffect(() => {
  charger(); // chargement initial

  const token = localStorage.getItem('newoteg_admin_token');
  const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
  const es = new EventSource(`${baseUrl}/api/bons/stream?token=${token}`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'BON_CREATED') {
        charger(); // recharge la liste à chaque nouveau bon
      }
    } catch {}
  };

  es.onerror = () => {
    // SSE déconnecté — fallback silencieux, la liste reste visible
    es.close();
  };

  return () => es.close();
}, []);
```

#### Remplacer `ticketApi.enAttente()` par `bonVenteApi.pending()`

```typescript
// AVANT
const [tks, cj] = await Promise.all([
  ticketApi.enAttente(),
  caisseJourApi.aujourdhui().catch(() => null),
]);

// APRÈS
const [tks, cj] = await Promise.all([
  bonVenteApi.pending(),          // remplace ticketApi.enAttente()
  caisseJourApi.aujourdhui().catch(() => null),
]);
```

#### Remplacer `ticketApi.encaisser()` par `bonVenteApi.valider()`

```typescript
// AVANT
await ticketApi.encaisser(selected.id, methode, opts);

// APRÈS
await bonVenteApi.valider(selected.id, {
  methodePaiement: methode,
  ...(isCredit ? {
    clientId: selectedClient.id,
    montantPaye: acompte ? Math.max(0, parseFloat(acompte)) : 0,
  } : {}),
});
```

#### Toute la logique crédit est conservée intacte
- Sélection client (search + dropdown) ✅ conserver
- Encours client ✅ conserver
- Champ acompte ✅ conserver
- Validation bloquée si CREDIT sans client ✅ conserver

#### Badge SSE dans le header
```tsx
// Afficher le nombre de bons en attente
<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
  <ListChecks size={20} className="text-amber-500" />
  <div>
    <p className="text-xs text-slate-500">En attente</p>
    <p className="text-lg font-bold text-amber-600">{tickets.length}</p>
  </div>
</div>
```

---

### Étape 9 — Frontend : `MesTickets.tsx`

#### Filtrer uniquement les tickets ENCAISSÉS

```typescript
// APRÈS chargement, filtrer côté frontend :
const data = await ticketApi.mesTickets();
// Afficher uniquement les tickets finalisés
setTickets((data || []).filter((t: Ticket) => t.statut === 'ENCAISSE'));
```

#### Supprimer le bouton "Annuler" et le countdown EN_ATTENTE
- Les bons EN_ATTENTE sont gérés dans POSVendeur onglet "En attente"
- Supprimer `onAnnuler` de `TicketCard` et le bouton associé
- Supprimer le `useCountdown` (plus de tickets EN_ATTENTE dans cette vue)

#### Adapter l'affichage
```tsx
// Header — changer le sous-titre
<h2 className="text-2xl font-bold text-slate-900">Mes tickets</h2>
<p className="text-slate-500 text-sm">
  Vos ventes validées — {tickets.length} encaissement{tickets.length > 1 ? 's' : ''} au total
</p>

// Dans chaque TicketCard — afficher la date d'encaissement plutôt que createdAt
<p className="text-xs text-slate-500">
  Encaissé le {ticket.encaisseAt
    ? new Date(ticket.encaisseAt).toLocaleString('fr-FR')
    : new Date(ticket.createdAt).toLocaleString('fr-FR')}
</p>
```

#### Badge côté Sidebar (voir Étape 6)
Le badge sur "Mes tickets" dans la Sidebar affiche les bons EN_ATTENTE (bons envoyés, pas encore encaissés) — pour alerter le vendeur qu'une vente est en cours de validation.

---

## 6. Ordre d'exécution

```
Phase 1 — Backend (~ 30 min)
  Étape 1  ValiderBonDto      — bon-vente.dto.ts
  Étape 2  Controller         — bon-vente.controller.ts
  Étape 3  Service            — bon-vente.service.ts
  Étape 4  nest build         — vérifier 0 erreur

Phase 2 — Frontend (~ 2h)
  Étape 5  api.ts             — modifier bonVenteApi.valider(id, body)
  Étape 6  App.tsx            — supprimer routes /bons et /caisse-validation
  Étape 7  Sidebar.tsx        — supprimer items + badge Mes tickets
  Étape 8  POSVendeur.tsx     — fusion BonVente (client dropdown + paymentMethod + bonVenteApi + onglet En attente + score)
  Étape 9  FileCaissier.tsx   — fusion CaisseValidation (SSE + bonVenteApi.valider + conserver logique crédit)
  Étape 10 MesTickets.tsx     — filtre ENCAISSE + libellés + supprimer annuler/countdown
  Étape 11 npm run build      — vérifier 0 erreur TypeScript

Phase 3 — Base de données (CRITIQUE — responsable projet)
  Étape 12 npx prisma db push — créer tables facture, facture_ligne, prime_vendeur dans Railway
  Étape 13 Redémarrer backend
```

---

## 7. Vérifications finales

### Builds
- [ ] `nest build` dans `Back-end/` → 0 erreur TypeScript
- [ ] `npm run build` dans `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/` → 0 erreur

### Tests manuels — Flux Vendeur
- [ ] VENDEUR ouvre "Vente en cours" → voit le catalogue avec images + recherche
- [ ] VENDEUR ajoute produits au panier, sélectionne client depuis la liste, choisit méthode de paiement
- [ ] VENDEUR clique "Envoyer à la caissière" → bascule sur onglet "En attente" → le bon y apparaît
- [ ] Le badge sur "Mes tickets" dans la sidebar affiche le bon en attente
- [ ] VENDEUR peut annuler un bon EN_ATTENTE depuis l'onglet "En attente"
- [ ] Après encaissement par la caissière → le bon disparaît de "En attente"
- [ ] VENDEUR va sur "Mes tickets" → voit uniquement ses ventes ENCAISSÉES

### Tests manuels — Flux Caissier
- [ ] CAISSIER ouvre "File d'attente" → connexion SSE établie (pas de polling visible)
- [ ] Dès qu'un VENDEUR envoie un bon → apparaît instantanément dans la file (sans reload)
- [ ] CAISSIER clique sur un ticket → modal s'ouvre avec liste articles + choix de paiement
- [ ] CAISSIER valide en ESPECES → encaissement réussi, ticket disparaît de la liste
- [ ] CAISSIER valide en CREDIT → doit sélectionner un client enregistré, peut entrer un acompte
- [ ] Page Factures → nouvelle facture visible avec numéro, TVA 19.25%, total TTC
- [ ] Page Primes → score du vendeur incrémenté de 1

### Tests manuels — Navigation
- [ ] Aucun lien vers /bons dans l'interface (pour aucun rôle)
- [ ] Aucun lien vers /caisse-validation dans l'interface (pour aucun rôle)
- [ ] Accès direct à /bons ou /caisse-validation → redirige vers 404 ou dashboard
- [ ] Le menu VENDEUR n'affiche plus "Bons de vente"
- [ ] Le menu CAISSIER n'affiche plus "Validation caisse"

---

## 8. Contraintes rappelées

| Contrainte | Détail |
|---|---|
| ❌ Aucune nouvelle dépendance npm | SSE via `new EventSource()` natif (déjà utilisé) |
| ❌ Ne pas toucher `Font-end/` | Frontend client e-commerce — intouchable |
| ❌ Ne pas exécuter de migration | `prisma db push` est décrit mais non exécuté ici |
| ✅ Commits atomiques | 1 commit par étape : Backend / api.ts / Routing / Sidebar / POSVendeur / FileCaissier / MesTickets |
| ✅ Fichiers BonVente + CaisseValidation | Conservés sur disque, juste retirés du routing et du menu |
| ✅ Logique crédit dans FileCaissier | CONSERVER intégralement (client + acompte + encours) |
| ✅ Catalogue POSVendeur | CONSERVER le design existant (images, recherche, IA, mobile drawer) |
