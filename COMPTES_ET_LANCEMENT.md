# NEWOTEG — Comptes & Lancement du projet

> Document de référence pour les comptes utilisateurs, leurs accès, et les commandes pour lancer le projet en local.
> Dernière mise à jour : 2026-05-31

---

## 1. Comptes existants

### Comptes administration (login par **nom d'utilisateur + mot de passe**)

| Username | Nom complet | Rôle | Email | Mot de passe |
|---|---|---|---|---|
| `admin` | Donald | **SUPER_ADMIN** | admin@newoteg.com | *celui que tu as défini* |
| `admin_2` | Super Admin Local | SUPER_ADMIN | admin@newoteg.local | *celui que tu as défini* |
| `fotso` | Fotso | ADMIN | fotso@newoteg.com | *celui que tu as défini* |
| `kely` | kely rachel | ADMIN | kely@newoteg.com | *celui que tu as défini* |
| `noubissi` | Noubissi Kely Rachel | ADMIN | noubissi@newoteg.com | *celui que tu as défini* |

> Les mots de passe sont **hashés avec bcrypt** dans la base — impossible de les récupérer. Si tu en as oublié un, demande-moi de te générer un script de réinitialisation.

### Comptes test boutique (login par **nom d'utilisateur + PIN**)

| Username | Nom complet | Rôle | PIN |
|---|---|---|---|
| `caissier1` | Caissier Test | **CAISSIER** | `1234` |
| `vendeur1` | Vendeur Test | **VENDEUR** | `5678` |

> Sur l'écran de login, sélectionne l'onglet **« PIN boutique »**, saisis le username, puis le PIN.

---

## 2. Matrice d'accès par rôle

| Fonctionnalité | SUPER_ADMIN | ADMIN | CAISSIER | VENDEUR |
|---|:---:|:---:|:---:|:---:|
| **Pilotage** | | | | |
| Tableau de bord | ✅ | ✅ | ❌ | ❌ |
| Analyses (graphes, heatmap) | ✅ | ✅ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ❌ | ❌ |
| **Finance** | | | | |
| Caisse du jour | ✅ | ✅ | ✅ (la sienne) | ❌ |
| Caisse globale | ✅ | ✅ | ❌ | ❌ |
| Coffres | ✅ | ✅ | ❌ | ❌ |
| Échéances (création, modification) | ✅ | ✅ | ❌ | ❌ |
| Suppression d'échéance | ✅ | ❌ | ❌ | ❌ |
| Annulation transaction caisse | ✅ | ❌ | ❌ | ❌ |
| **Boutique** | | | | |
| Vente en cours (POS vendeur) | ✅ | ✅ | ❌ | ✅ |
| Mes tickets (vendeur) | ✅ | ✅ | ❌ | ✅ |
| File d'attente (caissier) | ✅ | ✅ | ✅ | ❌ |
| **E-commerce** | | | | |
| Commandes en ligne | ✅ | ✅ | ❌ | ✅ |
| **Catalogue** | | | | |
| Voir produits | ✅ | ✅ | ✅ | ✅ |
| Voir prix d'achat | ✅ | ✅ | ❌ | ❌ |
| Modifier produits/catégories | ✅ | ✅ | ❌ | ❌ |
| Supprimer produits | ✅ | ❌ | ❌ | ❌ |
| Mouvements & alertes stock | ✅ | ✅ | ❌ | ❌ |
| Achats / réappro | ✅ | ✅ | ❌ | ❌ |
| **Relation** | | | | |
| Clients (fichier) | ✅ | ✅ | ❌ | ✅ |
| Fournisseurs | ✅ | ✅ | ❌ | ❌ |
| Comptes Admin | ✅ | ❌ | ❌ | ❌ |
| Rôles | ✅ | ❌ | ❌ | ❌ |
| **Système** | | | | |
| Paramètres | ✅ | ❌ | ❌ | ❌ |
| Profil personnel | ✅ | ✅ | ✅ | ✅ |

**Note** : l'interface filtre strictement les menus selon le rôle. Un caissier ne voit **que** les menus auxquels il a accès — pas de fonctionnalité grisée.

---

## 3. Lancer le projet en local

### Prérequis
- Node.js 20+ installé
- npm 10+
- Accès internet (la base PostgreSQL est hébergée sur Railway, pas en local)
- Variables d'environnement `Back-end/.env` configurées (DATABASE_URL, JWT_SECRET, etc.)

### 3.1 Backend (NestJS — port **3000** par défaut)

```powershell
# Depuis la racine du projet
cd Back-end
npm install                # 1ʳᵉ fois uniquement
npx prisma generate        # synchronise le client Prisma avec le schéma
npm run start              # démarre sur http://127.0.0.1:3000/api
```

**Si le port 3000 est déjà utilisé** (autre projet), lance sur 3001 :
```powershell
$env:PORT = "3001"; npm run start
```
Et adapte temporairement `Font-end-admin/.../vite.config.ts` ligne `target: 'http://127.0.0.1:3000'` → `3001`.

### 3.2 Frontend Admin (Vite — port 5173 par défaut)

```powershell
# Dans un AUTRE terminal, depuis la racine
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard
npm install                # 1ʳᵉ fois uniquement
npm run dev                # ouvre http://localhost:5173
```

Connecte-toi sur `http://localhost:5173/login` avec un des comptes ci-dessus.

### 3.3 Frontend Client (boutique e-commerce — port 5174 par défaut)

```powershell
# Dans un 3ᵉ terminal
cd Font-end
npm install                # 1ʳᵉ fois uniquement
npm run dev                # ouvre http://localhost:5174
```

### 3.4 Tout-en-un (3 terminaux)

| Terminal | Commande | Port |
|---|---|---|
| Backend | `cd Back-end ; npm run start` | 3000 |
| Frontend admin | `cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard ; npm run dev` | 5173 |
| Frontend client | `cd Font-end ; npm run dev` | 5174 |

---

## 4. Workflow de test recommandé

### Test 1 — Login multi-rôles
1. Ouvre `http://localhost:5173/login`
2. **Tab Mot de passe** : connecte-toi avec `admin` → tu vois TOUS les menus
3. Déconnecte-toi (icône en bas du sidebar)
4. **Tab PIN boutique** : connecte-toi avec `caissier1` / `1234` → tu vois UNIQUEMENT Finance (Caisse du jour) + Boutique (File d'attente) + Profil
5. Déconnecte-toi → reconnecte avec `vendeur1` / `5678` → tu vois UNIQUEMENT Boutique (Vente en cours + Mes tickets) + E-commerce + Catalogue (lecture sans prix achat) + Relation (Clients) + Profil

### Test 2 — Workflow vendeur → caissier (nécessite 2 navigateurs ou 2 sessions)
1. Session 1 : connecte `vendeur1`
2. Va sur **« Vente en cours »** (`/pos`)
3. Cherche un produit, clique pour l'ajouter au panier
4. Renseigne optionnellement nom/téléphone client
5. Clique **« Envoyer au caissier »** → tu es redirigé vers « Mes tickets » → un ticket apparaît avec compte à rebours 15 min
6. Session 2 : connecte `caissier1` dans un autre navigateur
7. Va sur **« File d'attente »** (`/file-caissier`) → le ticket du vendeur apparaît
8. Clique sur le ticket → modal « Encaisser » s'ouvre
9. Choisis méthode de paiement (Espèces / Mobile Money / Carte / Virement)
10. Clique **« Encaisser »** → le ticket disparait de la file, le solde de la Caisse du jour augmente
11. Côté `vendeur1` rafraîchis « Mes tickets » → le ticket apparaît en statut **« Encaissé »**

### Test 3 — Fermeture de caisse
1. Connecté en `caissier1`, va sur **« Caisse du jour »** (`/caisse-jour`)
2. Vérifie le solde courant
3. Clique **« Fermer la caisse »** → modal de confirmation
4. Confirme → la caisse passe en statut **FERMÉE**
5. Connecte-toi en `admin` → va sur **« Caisse globale »** → tu vois la ligne de transfert de clôture

### Test 4 — Sortie tracée pendant la journée
1. Connecté en `caissier1`, va sur **« Caisse du jour »**
2. Clique **« Opération »** → modal
3. Sélectionne **Sortie**, montant `5000`, motif « Achat fournitures bureau »
4. Confirme → la ligne apparaît dans la liste des opérations
5. Le solde diminue de 5000 FCFA

---

## 5. Crons actifs

| Cron | Fréquence | Heure | Action |
|---|---|---|---|
| Alerte caisse non fermée | Quotidien | 19h00 Africa/Douala | Notif + email SUPER_ADMIN si la caisse du jour est encore ouverte |
| Expiration tickets vendeur | Toutes les minutes | — | Marque comme EXPIRE les tickets EN_ATTENTE > 15 min |
| Alertes échéances | Quotidien | 07h00 Africa/Douala | Envoie les rappels d'échéances selon `joursAlerteAvant` |

---

## 6. Endpoints API utiles (port 3000)

### Auth
- `POST /api/admin-auth/login` → body `{ username, motDePasse }` → JWT 24h
- `POST /api/admin-auth/login-pin` → body `{ username, pin }` → JWT 4h
- `GET /api/admin-auth/me` → utilisateur courant

### Caisse du jour
- `GET /api/caisse-jour/aujourdhui` → caisse du jour (auto-créée si absente) + solde temps réel
- `POST /api/caisse-jour/:id/operation` → body `{ typeOperation, montant, motif }`
- `POST /api/caisse-jour/:id/fermer` → body `{ note? }`

### Tickets
- `POST /api/tickets` → body `{ clientId?, nomClient?, telephoneClient?, lignes:[{produitId, quantite}] }`
- `GET /api/tickets/en-attente` → file caissier
- `GET /api/tickets/mes-tickets` → tickets du vendeur connecté
- `POST /api/tickets/:id/encaisser` → body `{ methodePaiement }`
- `POST /api/tickets/:id/annuler` → body `{ motif? }`

### Caisse globale & coffres
- `GET /api/caisse/solde-global` → solde caisse principale + tous coffres
- `POST /api/caisse/transferer` → vers un coffre
- `GET /api/coffres` → liste coffres
- `POST /api/echeances` → créer échéance

---

## 7. Dépannage rapide

| Problème | Solution |
|---|---|
| `Cannot POST /api/xxx` | Backend pas démarré ou stale. Tue le process sur port 3000 et relance. |
| Login refusé alors que le username existe | Compte désactivé (`is_active = false`) ou mot de passe oublié. Demande un reset. |
| Le PIN refuse mon login | Seuls les comptes CAISSIER et VENDEUR peuvent utiliser le PIN. Vérifie le rôle. |
| Sidebar vide pour un rôle | Le rôle n'a accès à aucune page configurée. Vérifie `src/utils/permissions.ts`. |
| Migration Prisma bloque | `npx prisma migrate status` puis `npx prisma migrate deploy` |
| Erreur Cloudinary | Vérifie `CLOUDINARY_*` dans `.env` ; l'upload d'images en a besoin. |

---

## 8. Réinitialiser un mot de passe (script ad hoc)

Si tu oublies un mot de passe, exécute depuis `Back-end/` :

```powershell
node -e "require('dotenv').config(); const {Client}=require('pg'); const bcrypt=require('bcrypt'); const c=new Client({connectionString:process.env.DATABASE_URL}); (async()=>{await c.connect(); const h=await bcrypt.hash('NOUVEAU_MDP_ICI',12); await c.query('UPDATE admin_user SET mot_de_passe=$1 WHERE username=$2',[h,'USERNAME_ICI']); console.log('OK'); await c.end();})()"
```

Remplace `NOUVEAU_MDP_ICI` par le mot de passe souhaité (8 caractères minimum) et `USERNAME_ICI` par le username concerné.

---

**Document généré pour faciliter l'onboarding et le test multi-rôles de NEWOTEG.**
