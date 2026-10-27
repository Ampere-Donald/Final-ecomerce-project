# Découverte des rayons sur mobile et mouvement — 26 octobre 2026

## Problème observé et direction

L’utilisateur demande une boutique plus vivante, exposant plusieurs articles aux visiteurs mobiles. Les deux rayons de l’accueil imposaient `flex-basis:82%` à leurs cartes : une seule référence complète visible sur téléphone. La sélection initiale était limitée à cinq articles. Les contrôles variaient entre sélection et familles ; une rotation des bannières existait déjà, mais sans commande générale commune.

Trois pistes comparées : une vitrine promotionnelle rapide (changements fréquents, attention élevée mais lecture plus difficile), un atelier précis essentiellement manuel (calme, mais découverte moins spontanée), et une boutique vivante contrôlée. Cette dernière est retenue : deux références mobiles complètes, une progression lente d’un article, commandes toujours disponibles, arrêt à l’interaction. La capture Glotelho fournie guide la densité ; la tentative de lecture directe de son accueil a expiré. Aucune nouvelle étude complète de son site n’est prétendue.

La direction E, les photos, le hero, les règles de prix, stock, réception et équivalences sont préservés. Le site n’ajoute aucun article automatiquement au panier. Les remplacements techniques gardent leur présentation lisible et leurs limites ; ils ne deviennent pas une vitrine animée de compatibilités supposées.

## Réalisation

- `ProductRail.jsx` / `product-rail.css` : même rayon pour sélection et collections. Deux cartes jusqu’à 760 px, trois sur tablette, cinq à partir de 1 200 px ; défilement tactile natif, flèches, Début/Fin et compteur. Images, noms sur trois lignes, disponibilité, prix et actions dimensionnés ensemble. La sélection montre jusqu’à dix références provenant du catalogue, sans nouvelle promesse commerciale.
- Catégories sous le hero sur une rangée horizontale mobile : toutes restent accessibles, le visiteur atteint les produits plus tôt. Les cartes associées de la fiche sont également compactées en conservant leur grille mobile.
- `MotionProvider`, `MotionToggle`, `motionPreferences` : préférence système et pause locale commune, accessible dans le menu et le footer. Si le stockage est indisponible, la préférence reste valable pendant la session. Préférence initiale stable pour l’HTML déjà servi ; mise à jour du contexte dans une transition React afin de préserver les frontières d’hydratation.
- `motion.css`, `useRouteMotion` et `StorefrontFrame` : langage commun pour pages, panneaux, boutons, champs, favoris, panier, catégories et apparition des rayons. Les formulaires restent stables pendant la saisie. Le contenu n’est jamais masqué dans l’attente d’un observateur ; sans WAAPI, il reste disponible. Aucun moteur d’animation ajouté.
- Bannières : contrôles locaux conservés, désormais reliés aussi à la pause globale. Le compteur panier s’anime après changement réel du nombre ; aucun faux succès produit par l’animation.
- Chargement catalogue : les lectures publiques commencent après la déclaration UTF-8 mais avant les styles. Le script classique ne doit plus attendre leur téléchargement. En cas de rendu catalogue serveur, les deux chemins d’injection suppriment ce script pour ne pas relire les données. Le repli API, les tris et les filtres restent conservés.
- Génération de l’accueil : le manifeste peut identifier le module partagé par son nom de chunk haché. Les styles suivent désormais l’unique lien Home réel de l’entrée, sans charger les pages privées ; manifeste absent ou ambigu refusé.

## Contrat de mouvement retenu

| Geste | Déclencheur / valeurs / rythme | Responsive et mouvement réduit | Interruption et repli |
| --- | --- | --- | --- |
| Découverte d’un rayon | Après 6 500 ms de lecture, un pas égal à la largeur d’une carte + espace. Scroll natif `smooth`, durée choisie par le navigateur. Pas de boucle de retour : arrêt au dernier produit | 2/3/5 cartes ; aucun départ avant lecture des préférences. Manuel immédiat si mouvement réduit | Seulement si au moins 60 % du rayon est visible et onglet actif. Pause, focus produit, toucher, molette ou flèche arrêtent le timer et le scroll courant. Reprise explicite ; Début/Fin immédiats. Nettoyage timers/observateurs/écouteurs au démontage |
| Bannières | Rotation existante toutes les 9 000 ms, fondu 250 ms | Commande locale et pause globale ; automatique désactivé en préférence réduite | Hors champ, onglet masqué, survol ou interaction : pause. Pas de lien invisible actif ; `inert` conservé |
| Entrée d’un rayon sous le viewport | Une fois, translation Y 8 → 0 px, opacité .86 → 1, 280 ms, `cubic-bezier(.2,.7,.2,1)` | Rien n’est caché avant initialisation ; pas d’animation des éléments déjà visibles au chargement ; rendu statique en mouvement réduit | Annulation en pause, navigation, onglet masqué ou démontage ; aucun remplissage persistant |
| Navigation entre pages | Translation Y 5 → 0 px sur 200 ms, même courbe ; pas de fondu qui masque le contenu | HTML initial de l’accueil conservé ; immédiat en réduction/pause | État métier jamais retardé ; remontage de page remplace la représentation |
| Panneau modal natif | Entrée Y 10 → 0 px, échelle .99 → 1, opacité .85 → 1, 220 ms ; backdrop 180 ms | Même formulaire, clavier et contenu ; aucune animation en réduction/pause, backdrop compris | Fermeture native immédiate, Échap et retour du focus conservés ; pas de timer retardant la fermeture |
| Boutons et champs | Couleur/bordure/ombre 140 ms ; pression échelle .98. Image au survol 1 → 1.035 en 240 ms ; petits liens Y −2 px en 200 ms | Survol uniquement si disponible ; commandes utilisables sans survol | Dernier état CSS courant, pas d’attente réseau imposée ; transitions et zoom retirés en pause/réduction |
| Favori / compteur panier | Accent borné à 240 ms après état réellement changé, échelle max 1.14 / 1.12 | État textuel et attributs accessibles inchangés sans animation | Pas de boucle, pas d’annonce à chaque frame |

Le contrôle global arrête CSS, WAAPI et rotations ; les commandes manuelles restent présentes. L’absence d’IntersectionObserver désactive la rotation automatique et les reveals, sans retirer les produits. La grille, les sélecteurs explicites et les propriétés d’espacement de repli évitent d’imposer `:is()` aux navigateurs historiques ciblés. Un build legacy exercé dans Edge ne prouve pas le comportement d’un téléphone Android physique.

## Vérifications et portée

134 tests Node réussis ; build moderne/legacy et lint ciblé réussis. Recette `Font-end/tests/verify-motion-discovery.cjs` : produits/états réels de l’interface avec API fictive strictement locale, 360/390/768/1440, FR/EN, chemin legacy, défilement à vitesse réelle, arrêt du déplacement, clavier, réduction initiale et en cours, pause globale persistante, focus du dialogue et six routes publiques. Aucun appel d’écriture ou fournisseur.

La première vérification de réduction du mouvement exigeait exactement zéro pixel de scroll : l’ancrage natif produit un arrondi de 1 px. La tolérance finale est inférieure à 2 px, sans changement du comportement produit. Un défaut distinct d’hydratation a été reproduit et corrigé par la transition du contexte ; le test de recherche avant hydratation passe ensuite, avec champ/nœud/focus conservés. Les contrôles finaux surveillent aussi les erreurs de console de cette phase, et pas seulement les exceptions de page.

Le test de styles bloqués reproduit zéro lecture anticipée sur l’ancien build, puis passe sur le candidat : six chemins moderne/legacy à trois largeurs, partage des lectures et de la photo, changement de tri et reprise après réponse indisponible/malformée. Aucune donnée client persistante.

Les mesures de chargement, vérifications du catalogue réel, version publiée et preuves de livraison sont consignées à la suite lorsqu’elles sont terminées. Les émulations ne prouvent ni lecteur d’écran, ni téléphone physique, ni performance terrain ou hausse des ventes. Les étapes métier reportées du plan A–Z restent ouvertes.

## Recette finale et catalogue réel

[Recette de mouvement](motion-browser.json) : quinze groupes réussis, aucune erreur de page/hydratation ni écriture réseau. Le test de pause des bannières confirme aussi la fin immédiate de la transition et le maintien de la sélection manuelle avec exclusion du focus des slides inactifs. Le cas sans stockage confirme que la pause de session survit à une modification de la préférence système. [Hydratation de la recherche](header-hydration.json) : deux cas réussis, champ/nœud conservés, suggestions seulement lorsque le champ est encore actif. [Lectures anticipées](prefetch-browser.json) : huit groupes réussis.

[Catalogue réel](live-browser.json) : six produits actuellement retournés pour cette sélection, deux complets à 390 px et cinq à 1 440 px ; catégories sur une rangée mobile, vraie collection de condensateurs chargée et rotation/arrêt vérifiés. Ce contrôle utilise un adaptateur CORS pour les réponses GET réelles de l’API vers le port local, que l’API n’autorise pas directement. Il ne simule pas les produits et ne prouve pas le CORS de production. Le domaine public conserve son origine autorisée ; contrôle navigateur natif à répéter après publication. [Mobile](mobile-live.png), [rayon sur bureau](desktop-live.png).

Le premier pilote local direct avait donc échoué sur l’origine du port ; la configuration de production n’a pas été élargie. Un arrêt du pilote lors du nettoyage des requêtes a également été corrigé dans son transport isolé ; aucun incident de commande ni de données boutique. Ces tentatives ne sont pas annoncées comme recettes réussies.

[Mesure publique avant livraison](performance-before.json), profil inchangé 390 px / réseau 1,6 Mbit/s / CPU ×4 / cache froid : LCP 4 484 / 5 112 / 6 464 ms, médiane 5 112 ms ; CLS maximal 0,00471 et JS transféré environ 203 ko. C’est une référence synthétique, pas un p75 de clients. Le budget LCP 2 500 ms reste ouvert ; aucun gain après livraison n’est encore annoncé ici. Les quatre bundles communs inspectés gagnent environ 1,7 ko gzip au total malgré l’ajout de mouvement, sans nouvelle dépendance ; ce relevé de fichiers n’est pas une mesure réseau complète.
