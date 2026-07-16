# Variables d’environnement Newoteg

Ce document inventorie les noms requis sans exposer aucune valeur.

## Backend

| Variable | Obligation | Usage |
|---|---|---|
| `DATABASE_URL` | Requise | Connexion PostgreSQL |
| `JWT_SECRET` | Requise | Signature des sessions client et admin |
| `PORT` | Optionnelle | Port HTTP, 3000 par défaut |
| `NODE_ENV` | Recommandée | Mode production/développement |
| `FRONTEND_URLS` | Recommandée | Origines CORS supplémentaires, séparées par virgule |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Selon usage | Envoi des courriels |
| `GOOGLE_CLIENT_ID` | Selon usage | Connexion Google |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Selon usage | Recherche d’équivalences |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Selon stockage | Images Cloudinary |
| `RUN_PRISMA_MIGRATIONS` | Optionnelle | Migration au bootstrap ; préférer la commande de déploiement explicite |

## Panneau admin

| Variable | Obligation | Usage |
|---|---|---|
| `VITE_API_URL` | Requise en production | URL du backend, avec ou sans suffixe `/api` |

## Site client

| Variable | Obligation | Usage |
|---|---|---|
| `VITE_API_URL` | Requise en production | URL du backend |
| `VITE_GOOGLE_CLIENT_ID` | Selon usage | Connexion Google |

Les secrets restent dans le gestionnaire d’environnement de l’hébergeur. Ils ne doivent jamais être inscrits dans Git, un ticket, une capture ou un journal.
