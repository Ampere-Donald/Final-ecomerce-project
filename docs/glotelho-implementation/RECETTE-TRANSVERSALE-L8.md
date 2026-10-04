# L8 — Premier parcours transversal local

Le 4 octobre 2026, sept groupes passent sur le storefront existant, les vrais contrôleurs Nest, les vrais JWT et une nouvelle base PostgreSQL 17 jetable. Il s'agit d'une preuve fonctionnelle locale, sans changement du design E ni publication. La règle d'avis validée par NEWOTEG est exercée : un avis par ligne reçue, publication après modération, avis négatif conforme conservé.

## Enchaînements vérifiés

1. Connexion d'un client fictif par le formulaire et l'API réels ; catalogue puis comparaison de deux références et de leurs tensions différentes. Aucune compatibilité électronique réelle n'est déclarée par les fixtures.
2. Projet fictif publié par les routes administratives, sélection de son matériel, panier, retrait Akwa et vérification serveur du montant. La réponse de création de commande est coupée **après** le commit réel ; rechargement et reprise retrouvent une seule commande et une seule déduction de stock.
3. Avis refusé par le serveur avant réception. Confirmation de disponibilité puis retrait via les API boutique ; formulaire d'avis au clavier, note 1/5, coupure après enregistrement et reprise après rechargement. Une autre tentative sur la même ligne est refusée. L'avis reste absent du public jusqu'à la décision de modération, puis le texte négatif devient visible sur la fiche.
4. Prix du catalogue fictif actualisé ; réachat depuis le suivi avec mention du nouveau prix et ajout au panier. Aucun nouvel ordre créé par ce seul ajout ; montant historique conservé. Suivi reçu vérifié à 360, 768 et 1440 pixels sans débordement global, dont la version anglaise. Le scénario principal se déroule à 390 pixels en français.
5. Nouveau parcours anonyme en anglais, sans compte ni panier hérité : projet, livraison à Douala, frais « à confirmer », vérification et commande. Un email fictif est fourni ; aucun compte créé ni message envoyé. Confirmation boutique et passage en livraison par API, suivi privé conservé après rechargement, clé retirée de l'adresse du navigateur. Les réponses privées portent `private, no-store`, `no-referrer` et `noindex`. Email/SMS restent indisponibles.

Les sept groupes comprennent le démarrage isolé et les étapes précédentes ; ce ne sont pas sept commandes. Deux commandes fictives sont créées et supprimées avec leur base. Vérification indépendante après exécution : zéro base `newoteg_e2e_…` restante.

## Reproduire

Prérequis : build backend courant, storefront du worktree disponible sur `127.0.0.1:5187`, cluster local dédié `quote_test` sur le port 55439, Edge et runtime Playwright local. Le backend commercial déjà ouvert sur le port 3000 n'est pas utilisé pour cette recette.

Depuis `Back-end` sous PowerShell :

```powershell
$env:NEWOTEG_E2E_TEST_DATABASE_URL='postgresql://quote_test@127.0.0.1:55439/postgres'
$env:NEWOTEG_E2E_TEST_OUTPUT='C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/end-to-end'
node scripts/verify-end-to-end-local.cjs
```

Le script refuse une autre cible. Il crée sa propre base avec UUID et vérifie que le service applicatif utilise exactement cette base. `.env` est ignoré ; clés héritées effacées, fournisseurs de messages/uploads remplacés par un transport inactif, tâches planifiées absentes, collecte désactivée. Le navigateur redirige les requêtes API locales vers ce serveur éphémère ; leurs réponses ne sont pas simulées. Les destinations extérieures sont bloquées. Le schéma est issu du modèle et des CHECK source, **pas** d'un historique de migrations fabriqué. La répétition des migrations et de la restauration est documentée séparément dans `PREPRODUCTION-L8.md`.

Preuves : `output/implementation-work/captures/end-to-end/result.json`, `browser-evidence.json` et captures comparaison, commande reprise, avis publié, réachat, suivi reçu et invité. Les traces excluent JWT, clés privées, mots de passe et corps des requêtes. Les captures utilisent uniquement des données fictives ; les produits sans photos restent explicitement sans visuel. Le rapport principal est remplacé par un état d'échec si la recette échoue ; d'anciennes captures de diagnostic peuvent subsister dans ce répertoire.

Le pont du navigateur intégré a refusé sa connexion ; Edge indépendant a servi à la recette. Captures mobile et ordinateur inspectées. Aucun trafic externe n'a été observé ni bloqué pendant l'exécution réussie.

## Couverture encore ouverte

Cette recette confirme la chaîne client → API boutique → client. Les gestes de préparation, retrait et modération dans **l'interface administrative** restent à relier à cette même chaîne. Elle n'exerce pas encore le devis complet, la recommandation d'équivalence, les codes invités avec transport capturé, la réception finale d'une livraison invitée, ni le règlement réel. Les tests antérieurs par module continuent d'apporter leurs preuves distinctes.

Le garde global de limitation de débit, le serveur de production complet, HTTPS/CORS de la cible, image de livraison, réseau lent, performance/indexation, concurrence de stock globale, téléphone physique et gestes de l'équipe restent à vérifier dans L8. Aucun fournisseur email/SMS disponible ; aucun service réel activé. Les références, projets, cas de compatibilité et conditions SAV demandent toujours la validation métier NEWOTEG. La recette n'apporte aucune mesure de succès commercial et n'autorise pas la publication L9.
