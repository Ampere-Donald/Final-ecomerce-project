<div align="center">
  <img src="Font-end/public/logo.png" alt="NEWOTEG Logo" width="100" height="auto" />
  <h1>Plateforme E-Commerce NEWOTEG</h1>
  
  [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/)
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
  
  <br>
  
  ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
  ![React (Vite)](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
</div>

---

## 📖 Description
**NEWOTEG** est une plateforme e-commerce moderne et entièrement configurée comprenant trois modules distincts qui tournent en synergie :
1. **L'API Backend** (NestJS) : architecture REST robuste avec Prisma ORM et la gestion du stockage d'images.
2. **Dashboard Admin** (React) : interface back-office complétée avec indicateurs de bords, gestion multicritères des produits (3 images, imports CSV), commandes et clients.
3. **Storefront Client** (React) : boutique moderne UI/UX permettant le parcours complet (Catalogue, Détails, Panier, Checkout, Google Auth).

---

## 🏗️ Structure du Dépôt

```bash
NEWOTEG-ECOMMERCE-main/
│
├── Back-end/                 # Serveur Node.js (NestJS)
│   ├── prisma/               # Schémas PostgreSQL et migrations
│   ├── src/                  # Contrôleurs et Services REST
│   └── uploads/              # Stockage des images produites
│
├── Font-end/                 # Frontend boutique pour les clients finaux (Vite + React)
│
└── Font-end-admin/.../       # Frontend back-office d'administration (Vite + React)
```

---

## 🛠️ Installation en Local

### 1. Prérequis environnementaux
* [Node.js](https://nodejs.org/) (version 20 recommandée)
* Une base de données PostgreSQL installée localement ou hébergée.

### 2. Démarrage du Backend
1. Effectuer une copie de l'environnement :
   `cp Back-end/.env.example Back-end/.env`
2. Configurer `DATABASE_URL` dans le `.env`
3. Installer et lancer :
```bash
cd Back-end
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### 3. Démarrage des Frontends (Admin & Client)
Chaque point d'entrée Front-end utilise le bundler **Vite**.

**Boutique Client :**
```bash
cd Font-end
npm install
npm run dev
```

**Admin Dashboard :**
```bash
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard
npm install
npm run dev
```

*(N.B: Ces applications clientes nécessitent l'API en marche pour l'hydratation des données).*

---

## 🚢 Déploiement en Production

### 1️⃣ Déployer l'API & Base de Données sur Railway
Railway détectera automatiquement l'application NestJS.
1. Connectez le dépôt sur votre tableau de bord [Railway](https://railway.app/).
2. Ajoutez une ressource **"PostgreSQL Database"** au projet Railway.
3. Railway injectera `DATABASE_URL`. Ajoutez les variables supplémentaires :
   - `JWT_SECRET=UnSecretSécurisé`
   - `PORT=3000`
   - `NODE_ENV=production`
   - `FRONTEND_URLS=https://newoteg.com,https://admin.newoteg.com` *(vos domaines Vercel)*
4. Railway exécutera automatiquement :
   - _Build_ : `npm run build` *(ce qui appellera npx prisma generate)*
   - _Start command_ : Le Dockerfile ou un custom start (Railway détecte souvent bien, mais notre Dockerfile a été optimisé).

### 2️⃣ Déployer les Frontends sur Vercel
1. Sur [Vercel](https://vercel.com), ajoutez un New Project connecté au même dépôt Git.
2. Pour l'application **Client**, pointez le *Root Directory* sur : `Font-end`
3. Pour l'application **Admin**, pointez le *Root Directory* sur : `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard`
4. Configurez les **Variables d'Environnement** correspondantes sur les deux instances Vercel :
   - `VITE_API_URL=https://votre-url-api-railway.up.railway.app/api`
   - Variables additionnelles (ex: Google Client ID) avec le préfixe `VITE_`.
5. Validez le déploiement ("Deploy"). Vercel saura qu'il s'agit d'un projet Vite (`npm run build`).

---

## 🔐 Configuration des Variables (`.env`)
Rendez-vous dans les sections respectives pour examiner les fichiers `.env.example`. 

**Backend** requiert impérativement :
- `DATABASE_URL`
- `JWT_SECRET`

**Frontend** (Client API context) :
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`

---
*© 2026 - Plateforme NEWOTEG dévelopée via NestJS et React.*
