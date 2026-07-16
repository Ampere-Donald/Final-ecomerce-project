# Design system Newoteg

## Objectif

Ce référentiel garantit une interface cohérente, lisible et rapide sur les ordinateurs de boutique comme sur les téléphones de 360 px.

## Fondations

- Police : pile système avec Inter si elle est déjà disponible sur l’appareil. Aucun téléchargement de police n’est requis au démarrage.
- Marque : indigo `#1c19a3`, réservé aux actions principales, liens actifs et focus.
- Succès : vert `#047857`.
- Alerte : orange `#b45309`.
- Danger : rouge `#b91c1c`, réservé aux erreurs et actions destructives.
- Fonds : gris très clair pour la page, blanc pour les surfaces.
- Rayon des contrôles : 12 px ; rayon des surfaces : 16 px.
- Cible tactile : 44 px minimum pour toute action courante sur mobile.

## Composants

- `.surface` : carte ou panneau blanc avec bordure et ombre légère.
- `.field` : champ standard de formulaire avec hauteur tactile.
- `Button` : variantes primary, secondary, success, danger et ghost.
- `Toast` : confirmation non bloquante, annoncée aux technologies d’assistance.
- `EmptyState` : état vide avec explication et action facultative.
- `AppErrorBoundary` : récupération après une erreur d’affichage sans laisser un écran blanc.

## Règles d’interaction

- Une action principale visible par écran ou par panneau.
- Les actions de caisse restent visibles en bas sur mobile et respectent la zone sûre Android.
- Le clavier affiche toujours un focus visible.
- Les animations sont automatiquement réduites si le système le demande.
- Les historiques passent en cartes sous 768 px.
- Une erreur explique ce qui s’est passé et si l’opération a été conservée.

## Bénéfice métier

Les vendeurs et caissiers retrouvent les mêmes codes visuels partout, touchent moins souvent la mauvaise action et peuvent reprendre après une erreur sans perdre leur contexte.
