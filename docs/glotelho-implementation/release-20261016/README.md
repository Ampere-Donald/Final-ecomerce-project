# Livraison technique — 16 octobre 2026

Publication demandée explicitement par le propriétaire avec report des étapes métier 1 à 4 : données et équivalences, projet pilote, fournisseurs email/SMS, recette boutique. Ces critères restent au plan A–Z ; aucune validation réelle n'est créée au nom de Mr Jude Fogueng. Préproduction Railway toujours différée.

## Version publiée

PR #10 fusionnée sur main def60d7654affff03cf7faaf9d59e01a552a5a29. Boutique https://newoteg.com/ : Cloudflare fbe6ab1d-c819-4abf-92e9-0964470d9006 à 100 %. Administration https://admin.newoteg.com/ : a0bd9350-8bce-408c-a67d-5ce31c29af77 à 100 %. Backend Railway 3eff37a7-6748-4290-9d7b-4972e5e51101 : statut du commit et Deployment success, API/base/stockage OK.

CI complète 38945282163 et trois images/contrats 38945282032 réussis sur le commit fusionné. Les changements récents de main, sélection d'accueil et images produit, sont conservés. Les nouvelles sources, dictionnaire technique, administration des décisions et découverte des dossiers relus sont publiés. Autre usage, source périmée et suggestion automatique ne reçoivent pas une validation technique par défaut.

## Base et migrations

Sauvegarde cohérente réelle PostgreSQL 18.6 créée le 15 octobre en lecture seule et conservée hors Git. Restauration locale isolée le 16 octobre, quatre migrations appliquées : 68 tables métier et 61 enregistrements historiques conservés, contrat de livraison réussi et aucune relecture créée. Base temporaire supprimée et cluster arrêté proprement.

Lecture de production après publication : zéro migration en attente, contrat structurel et historique complets réussis. Trois nouvelles tables vides. Le contrôle distant utilise l'export Git LF identique au paquet Linux ; la migration dictionnaire du checkout Windows est CRLF et ne doit pas servir d'empreinte du paquet. Aucune empreinte distante réécrite et aucune exception historique ajoutée.

## Vérification publique

Builds storefront/admin réussis. Seize ressources publiques modernes/legacy et styles correspondent par SHA-256 au build, y compris équivalences, fiche et comparaison. Accueil/catalogue/équivalences/devis/panier répondent 200, recherche du registre 201 sans cache, administration anonyme 401, dictionnaire disponible.

Huit groupes navigateur : équivalences FR 390/768/1440 et EN 390, accueil et protection admin 390/1440. Formulaire, vrai registre public, focus du titre sous le header, retrait des résultats après édition, absence de débordement et d'erreur JavaScript vérifiés. Aucune écriture métier. Captures mobile et desktop inspectées.

Limites : réponse du moteur de suggestions simulée vide dans cette recette pour éviter les appels fournisseur ; registre interrogé réellement. Les verdicts et leur chaîne isolée ont leurs recettes dédiées antérieures. Pas de téléphone physique, session opérateur, verdict réel ou compatibilité physique prouvés ici. RUM Cloudflare bloqué pendant les essais.

## Après publication

Email/SMS et collecteur métier désactivés, aucun projet public. Renderer catalogue expérimental désactivé, catalogue client existant fonctionnel. Données et équivalences à valider par Mr Jude Fogueng, projet pilote, fournisseurs, recette opérateur, préproduction et performances restent reportés ou ouverts. Incrément livré ; objectif A–Z toujours actif.

Preuves jointes : public-verification.json, public-browser.json, database-after.json, rehearsal-report.json, public-status.json, release-status.json. Aucun secret, dump ou donnée client dans le dépôt.
