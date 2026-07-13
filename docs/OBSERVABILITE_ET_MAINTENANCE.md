# Observabilité et maintenance Newoteg

## Identifiant de corrélation

Chaque appel HTTP reçoit un identifiant `X-Request-Id`. Le navigateur en génère un ; le backend le valide ou en crée un nouveau, le renvoie dans l’en-tête et l’ajoute aux réponses d’erreur.

Lorsqu’un utilisateur signale une erreur, demander la « Référence » affichée dans le message. Cette valeur permet de retrouver la même opération dans les journaux backend sans demander mot de passe, PIN, jeton ou contenu du panier.

## Santé

`GET /api/health` contrôle :

- le processus API ;
- une requête simple à PostgreSQL ;
- l’accès en lecture et écriture au dossier `uploads`.

Le statut HTTP est 200 si tout va bien et 503 si un composant est dégradé. L’état d’impression reste local au poste et apparaît dans le tableau de bord et les paramètres d’impression.

## Journaux impression et synchronisation

- Chaque tentative d’impression est enregistrée dans `print_event` avec document, original/duplicata, résultat, poste, imprimante, utilisateur et code d’échec. Le contenu du ticket n’est pas journalisé.
- Les échecs de synchronisation sont ajoutés au journal d’activité avec le code, le type d’opération, l’identifiant idempotent, le poste et `X-Request-Id`. Le panier, le client, le montant et les moyens d’authentification ne sont jamais envoyés au diagnostic.
- Si le réseau empêche l’envoi du diagnostic, la file locale conserve l’indicateur et l’envoie au retour de la connexion avant la nouvelle tentative.
- Les administrateurs consultent les impressions dans **Journal impressions** et les événements de synchronisation dans l’activité du compte concerné.

## Audits de dépendances

État de production après correction le 13 juillet 2026 :

| Application | Avant | Après |
|---|---:|---:|
| Backend | 23 (16 élevées, 7 modérées) | 3 modérées |
| Admin | 18 (1 critique, 8 élevées) | 1 faible |
| Site client | 6 (5 élevées, 1 modérée) | 0 |

`xlsx`, sans correctif disponible, a été remplacé par `read-excel-file`. Nodemailer a été mis à niveau après compilation et tests. Les trois alertes backend restantes sont transitives via Prisma 7 ; la proposition npm est un retour majeur vers Prisma 6 et n’est pas appliquée.

## CI

Chaque push et pull request vers `main` vérifie séparément :

- backend : installation reproductible, génération Prisma, build,  tests et audit de production ;
- admin : TypeScript, build PWA et audit de production ;
- site client : ESLint, build et audit de production.

## Sauvegarde et restauration

1. Effectuer un `pg_dump` avant toute migration de production.
2. Conserver le dump chiffré avec la version Git et la date.
3. Appliquer les migrations avec `npm run prisma:migrate:deploy`.
4. Vérifier `/api/health`, une connexion, une vente de recette et une impression.
5. En cas d’échec, remettre la version applicative précédente puis restaurer le dump uniquement si la migration a modifié des données incompatibles.
