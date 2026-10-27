# Révision collaborative du catalogue

## Utilisation en boutique

Ouvrir **Révision du catalogue** depuis Produits ou Stock & achats. Sur téléphone, choisir **Commencer la vérification** : chaque article présente sa référence, sa photo, ses prix et les propositions de l’équipe. Les onglets **À vérifier**, **Propositions**, **À discuter** et **Vérifiés** indiquent l’avancement pour les filtres sélectionnés.

Les comptes VENDEUR, CAISSIER et MANAGER proposent une correction ou une confirmation. Les comptes ADMIN et SUPER_ADMIN peuvent corriger et valider directement, accepter une proposition (avec ajustements possibles) ou la refuser. Un refus ne valide jamais les prix actuels. Une discussion nécessite un commentaire. Les actions **Prix**, **Classement** et **Article arrêté** sont indépendantes.

**Valider et suivant** et **Envoyer et suivant** passent à l’article suivant après confirmation du serveur. **Passer** laisse l’article dans son état actuel. Le retour à la liste conserve les filtres et la position. Sur ordinateur, les tarifs détail/demi-gros/gros sont modifiables dans le tableau : sélectionner les lignes puis examiner l’aperçu avant validation groupée. Les éventuels conflits sont affichés article par article.

Un tarif absent est vide. Pour valider, le détail doit être positif et les tarifs renseignés doivent respecter gros ≤ demi-gros ≤ détail. Le tarif promotionnel et sa date de fin sont présentés sur la fiche. Le classement et la vérification ne bloquent pas la vente en ligne.

Les changements des autres membres sont relus toutes les dix secondes lorsque l’écran est visible. Ils ne remplacent pas une saisie en cours. Un conflit affiche les valeurs actuelles et conserve la saisie. L’utilisateur doit comparer avant d’adopter la nouvelle version et de confirmer.

La saisie est conservée en brouillon sur l’appareil, séparément pour chaque compte et article. Elle n’est jamais envoyée automatiquement après une coupure Internet. Garder l’écran ouvert si le navigateur indique que le stockage est indisponible. Un brouillon ne constitue pas une validation. La navigation et l’envoi nécessitent une connexion ; les brouillons sont restaurés lorsque la fiche peut être rechargée.

**Article arrêté** demande confirmation à un admin avant archivage. L’archivage conserve stock et historique, mais retire l’article du site et des nouvelles ventes boutique. Une simple rupture temporaire ne doit pas être traitée comme un arrêt définitif.

## Sous-catégories

Le panneau **Gérer les sous-catégories** permet aux admins de créer ou renommer les sous-catégories sous les catégories existantes. Une sous-catégorie utilisée ne peut pas être supprimée. L’affectation s’effectue dans l’onglet Classement d’une fiche ou dans le formulaire Produits.

Le script `Back-end/scripts/classify-catalogue.cjs` produit par défaut un manifeste sans écrire dans la base. Les règles sont dans `catalogue-taxonomy.cjs`. Elles utilisent des types explicites ou des familles de références identifiées, sans inférence depuis les images. Les références ambiguës sont laissées à examiner. L’application du classement ne valide aucun prix, ni ne déclare le classement contrôlé par un humain.

## Livraison et migration

1. Depuis Back-end : générer Prisma et construire le backend, puis exécuter `node scripts/test-catalogue-revisions.cjs`. Le script crée un cluster PostgreSQL local temporaire, ne lit pas le fichier .env de production et arrête son serveur à la fin.
2. Construire l’admin et le site public. Contrôler TypeScript avec `npm run lint` dans l’admin et exécuter les tests UI concernés.
3. Sauvegarder : `node scripts/backup-database-json.js --output=CHEMIN_ABSOLU.json`.
4. Appliquer uniquement cette migration additive : `node scripts/apply-catalogue-schema.cjs --backup=CHEMIN_ABSOLU.json`. Le script vérifie l’âge et la destination de la sauvegarde, contrôle le stock et le nombre de produits et enregistre le checksum de la migration Prisma. Le démarrage de compatibilité `ensure-schema.js` sait également appliquer ce schéma.
5. Examiner `node scripts/classify-catalogue.cjs`, puis appliquer avec `--apply --backup=CHEMIN_ABSOLU.json`. Le manifeste consigne chaque classement avant/après et sa justification. Les sous-catégories existantes des produits sont préservées.
6. Publier les versions backend, admin et site public ensemble, puis recharger les clients. Les lectures et filtres existants restent compatibles ; `includeSousCategories=true` enrichit `/categories` et `sousCategorieId` filtre `/produits`. L’édition des prix et du classement dans le formulaire Produits transmet désormais les révisions attendues : un ancien client doit être actualisé avant de modifier ces champs.

La migration ne modifie ni les prix ni le stock. Les propositions et événements sont conservés dans des tables dédiées avec contrôle de rôle et réponses sans cache. Des triggers PostgreSQL incrémentent les révisions distinctes de prix, classement et activité pour tous les flux (y compris imports et achats). Les modifications externes invalident la vérification du sujet concerné. Le stockage d’une validation et de son historique est transactionnel, les écritures sur un produit sont sérialisées et l’identifiant d’opération rend les nouvelles tentatives idempotentes.

Un retour à une version applicative antérieure peut conserver le schéma additif. Pour annuler des affectations initiales, utiliser exclusivement les identifiants du manifeste, vérifier que le classement n’a pas été modifié ensuite, et remettre les anciens rattachements dans une transaction sauvegardée. Ne pas restaurer toute la base après de nouvelles ventes, et ne pas supprimer les tables d’historique.

### Continuité entre les pages sur téléphone

Au dernier article d’une page, « suivant » charge et ouvre directement le premier article de la page suivante avec les mêmes filtres. « Passer » suit ce parcours sans envoyer de décision. Ce passage entre pages est couvert par un test d’interface supplémentaire. Le contrôle visuel sur téléphone reste nécessaire avant la mise en ligne.

## État vérifié le 24 octobre 2026

La base de production a été sauvegardée puis migrée. Les 15 catégories et leurs identifiants sont conservés. 55 sous-catégories ont été créées et 849 des 1 932 articles actifs ont reçu un premier classement ; 1 083 restent à examiner. La comparaison complète des 7 110 lignes produit confirme zéro modification des prix, du stock ou de l’activité. Aucun prix n’a été validé automatiquement.

Le manifeste et le contrôle avant/après sont dans `output/catalogue-revision`. Les tests passent : 10 scénarios PostgreSQL/API sur base isolée, 17 tests d’interface concernés et 34 tests de régression backend. Les builds backend, admin et site public ainsi que TypeScript admin ont été contrôlés. L’interface applicative n’a pas été déployée durant cette intervention. La vérification visuelle à 360, 390 et 768 px avec clavier réel reste à effectuer : le navigateur intégré n’est pas accessible et le contrôle local des navigateurs est désactivé dans les réglages Work.

## Contrôle complémentaire du 26 octobre 2026

Le navigateur intégré reste inaccessible, mais le navigateur de test isolé `agent-browser` a permis de contrôler les composants réels de révision avec des données fictives et un adaptateur qui bloque les appels externes. La navigation complète de l’application et les échanges avec le backend ne sont pas couverts par cet aperçu ; les scénarios API sur PostgreSQL sont vérifiés séparément.

- Inspection visuelle aux formats 360 × 800, 390 × 844 et 768 × 1024 : aucun débordement horizontal sur les fiches contrôlées ; barre d’action entièrement dans la fenêtre.
- Mode hors ligne : envoi désactivé, saisie conservée à 1450 puis restaurée après retour du réseau et rechargement, prix actuel toujours à 1500 jusqu’à validation.
- Compte employé : bouton « Envoyer et suivant » ; son brouillon à 1300 n’apparaît pas dans le compte admin, qui conserve 1500.
- Validation admin suivie de l’ouverture du prochain article ; « Passer » traverse la pagination directement vers l’article suivant.
- Contraste des textes secondaires renforcé et groupe « Sujet de vérification » doté d’un rôle accessible. Après correction, aucune violation détectée par axe sur les fiches Prix et Classement. Ce contrôle local ne constitue pas une certification globale d’accessibilité.
- Espace disponible réduit à 360 × 420 : champ amené à l’écran et actions accessibles. Il s’agit d’une simulation de fenêtre réduite, pas d’un clavier virtuel réel.

Les captures et rapports axe sont dans `output/catalogue-revision/qa-mobile-2026-10-26`. Les deux suites ciblées passent, soit 8 tests, dont le test supplémentaire de passage entre pages. Le contrôle TypeScript et le build admin passent après les corrections d’accessibilité. **Restent à vérifier sur un téléphone réel : le clavier virtuel, les zones de sécurité et l’absence de superposition avec la navigation complète. Aucun déploiement applicatif n’a été effectué.**
