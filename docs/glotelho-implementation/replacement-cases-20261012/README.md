# Registre serveur des décisions de remplacement — 12 octobre 2026

## Rôle dans le plan

L3 exige de distinguer remplacement direct documenté, adaptation nécessaire et compatibilité à confirmer, avec les contraintes de l’application. Les caractéristiques relues d’une pièce et les scores du moteur ne fournissaient pas de décision sur une paire de pièces. Ce registre ajoute une décision humaine indépendante, pour une référence exacte, un candidat catalogue et un usage déclaré. Il reste à raccorder ses formulaires administratifs et son affichage aux résultats publics ; cet incrément est le contrat serveur, pas un parcours utilisateur achevé.

Verdicts explicites : `DIRECT_DOCUMENTE`, `ADAPTATION_NECESSAIRE`, `REFUSE`, `A_CONFIRMER`. Une adaptation exige son descriptif et ne peut être cachée dans un verdict direct. Justification, limites, document/URL HTTPS/page de la référence recherchée et valeurs sources choisies du candidat sont requis. Une cible catalogue facultative exige aussi ses propres valeurs relues. Les références absentes du catalogue peuvent être documentées séparément, sans créer de faux produit.

La relecture est distincte de la sauvegarde. Elle confirme la version du dossier et l’empreinte des sources que l’administration a consultées ; l’identité et l’heure viennent du serveur authentifié. Chaque pièce du cas doit avoir des valeurs sélectionnées avec documentation actuelle, document et page/section. Ce contrôle porte sur la sélection, pas sur l’exhaustivité des paramètres nécessaires : le technicien reste responsable de leur choix et de la validité physique du remplacement. Mr Jude Fogueng est le responsable désigné ; aucun compte, dossier ou verdict réel n’est créé en son nom.

## Contrat

Routes administratives `GET/POST /equivalence/cas`, `GET/PATCH /equivalence/cas/:id`, `POST /equivalence/cas/:id/relire`, réservées ADMIN/SUPER_ADMIN, `private, no-store`. Liste bornée aux 50 derniers dossiers et historique de lecture borné aux 20 dernières relectures ; toutes les preuves restent conservées en base. Un doublon référence/candidat/usage est refusé. Modification et relecture concurrentes ont un seul gagnant ; une version ou empreinte périmée impose une nouvelle lecture. Aucun endpoint n’édite ou ne supprime les preuves historiques.

`POST /equivalence/cas/evaluer` est public et sans cache. Entrée : référence ou UUID cible, application et au plus cinq UUID candidats distincts. Sortie : décision courante ou `null` par candidat. Aucune donnée de brouillon, identité de relecteur, empreinte privée, historique ou coût interne. Une absence de décision ne vaut jamais remplacement direct. Ce contrat ne transforme pas un score fournisseur en verdict et ne substitue pas une pièce au panier.

La correspondance des décisions est exacte : normalisation Unicode NFC et espaces, sans changement de casse, ponctuation, suffixe ou unité. La recherche catalogue existante continue de gérer les accents/casse ; sa correspondance approximative ne suffit pas à réutiliser une validation technique. Un autre usage ou suffixe, des sources choisies modifiées/supprimées, une identité/catégorie modifiée, le retrait du dossier ou une relecture périmée retirent la décision publique. Une cible catalogue est liée à son UUID, pas à un nom approchant.

Stock disponible après réservations et statut actif sont relus à chaque évaluation avec le service catalogue existant. Cette lecture est distincte de la transaction cohérente du dossier et des preuves ; ce n’est pas une réservation ni une garantie de stock à l’achat. La famille actuellement autorisée reste Composants Électroniques ; l’ouverture d’autres familles et les cas réels demandent la validation technique prévue par L1/L3.

Une pièce liée à un dossier ne peut pas être supprimée : HTTP 409 explique de la désactiver. Aucun média ou événement de suppression n’est déclenché en cas de refus. L’archivage retire la décision publique tout en conservant l’historique.

## Vérification

Build backend et lint ciblé réussis. Suite complète intermédiaire : 63 suites / 474 tests, puis quatre tests ciblés sur le contrat et la suppression liée à l’historique après les derniers raffinements. Les dernières preuves PostgreSQL/Nest/HTTP sont dans [result.json](result.json). Elles couvrent les quatre migrations additives candidates, sauvegarde/restauration du baseline synthétique, structure/lignes historiques conservées, droits JWT/DTO, estampilles forgées, valeurs étrangères/non relues, concurrence, quatre verdicts, suffixe/usage/casse, modification de source seule, cible modifiée, rupture/archive, valeur supprimée et preuves conservées. Aucune écriture Railway, aucun fournisseur, commande, message, donnée client ou décision physique réelle.

Recette : `Back-end/scripts/verify-technical-provenance-local.cjs --update-contract`, exclusivement sur le cluster local explicitement autorisé `quote_test`/loopback/55439. Les 26 groupes passent ; trois bases temporaires créées et retirées par le script. Treize tests des gardes de démarrage/images passent après actualisation du contrat ; la CI de la tête exacte est référencée dans la PR. Aucun test navigateur de ces nouveaux formulaires n’est annoncé : les interfaces restent à implémenter.

## Livraison et travaux restants

Quatrième migration additive : deux tables et un enum, sans reprise automatique ni validation des fiches historiques. PR #10 demeure en brouillon, pas de publication. Backend/migrations avant interfaces. Le baseline main antérieur à PR #10 peut être restauré applicativement en conservant les structures ; pas de suppression des décisions/preuves pour forcer un retour. La répétition réelle Railway 18.6 antérieure ne concernait qu’une migration ; la version à quatre migrations dispose de la répétition synthétique, pas d’une nouvelle préproduction Railway. Cette étape reste différée à la demande humaine.

Suite nécessaire : administration utilisable pour sélectionner les pièces/preuves, consulter la version courante et relire explicitement ; intégrer les pièces relues à la sélection même si la référence est absente ou la présélection lexicale les omet ; résultats FR/EN présentant le verdict et son périmètre, avec reprise sûre si l’évaluation échoue ; vérification navigateur/mobile du parcours complet ; véritable jeu de cas accepté/refusé par Mr Jude Fogueng et contrôle des familles avant ouverture. Les autres lots, dépendances externes et critères métier du plan A–Z restent ouverts. L’objectif reste actif.
