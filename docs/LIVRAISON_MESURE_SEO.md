# Livraison du suivi des demandes et de leur origine

30 octobre 2026 — préparation, non publiée. Référence : [contrat de mesure](CONTRAT_MESURE_SEO.md).

## Périmètre

Deux événements de parcours, catégorie d’origine fermée, attribution optionnelle des créations de devis et commandes, reprise de cette catégorie lors de l’acceptation d’un devis et tableau interne. Les stocks, prix, règles d’acceptation et droits des comptes conservent leurs règles existantes. Aucun événement navigateur ne crée une vente.

La base commune intègre les PR #29 et #31, avec le transport public et la révision du catalogue. Le contrat de schéma préserve leurs exigences et ajoute seulement les éléments d’attribution observés dans la répétition locale. Les anciens fichiers de migration ne sont pas modifiés.

## Ordre de publication et recette

1. Réussite des suites et contrats CI sur le commit exact à fusionner. Le backend porte la migration, la validation des deux vocabulaires et le contrat de schéma combiné.
2. Après déploiement backend, vérifier le démarrage et l’absence de migration échouée depuis les logs de livraison ; ne pas utiliser migrate resolve ni contourner le vérificateur. Contrôler santé et refus anonyme des deux rapports internes. Le collecteur peut rester désactivé pendant la recette publique.
3. Livrer le storefront et son paquet de rendu backend avec le même rendererId. Le client peut envoyer le canal optionnel seulement après disponibilité du serveur compatible. Contrôler de nouveau familles, fiches et sitemap après la transition des deux versions.
4. Livrer l’administration compilée ; contrôler la ligne historique non renseignée, les origines reconnues, les états de chargement/erreur et la période demandée. L’ancienne administration reste compatible avec le rapport sans `version=2`.
5. Activer le collecteur existant avec PARCOURS_METRICS_ENABLED=true lorsque les contrôles passent. Ne pas inventer d’observations de production pour produire un tableau rempli. L’attribution des créations métier reste indépendante de cette option et se vérifie sur des données réelles lorsqu’elles existent.

Les tests de dialogue et de saisie utilisent un collecteur simulé, sans écriture réseau vers la production. Une ouverture WhatsApp de recette ne doit envoyer aucun message. Search Console, Core Web Vitals et positions Google restent à mesurer séparément.

## Retour arrière

Conserver les colonnes et la nouvelle table après migration ; elles sont additives. Ne pas restaurer la base et ne pas supprimer d’observations ou de demandes pour revenir en arrière. Désactiver le collecteur arrête les nouveaux envois sans gêner les achats.

Un ancien binaire applicatif peut lire le schéma enrichi, mais l’ancien vérificateur d’historique refuserait une migration inconnue : **une restauration brute de l’ancienne image backend n’est donc pas un retour arrière valide**. En cas de défaut serveur, préparer une version corrective ou reconstruire la version applicative précédente avec les migrations et le contrat de schéma actuels, puis vérifier cette image avant sa publication. Le storefront doit rester associé au renderer de la version backend effectivement servie ; restaurer les deux ensembles compatibles ensemble. L’ancienne administration peut être restaurée indépendamment, car l’endpoint historique reste compatible.

## Limites à la préparation

La répétition locale est fondée sur un schéma projeté conforme au contrat précédent, avec données synthétiques ; elle ne certifie pas triggers, privilèges ou état des données réelles. Les logs et contrôles de déploiement restent nécessaires. Le classement des origines reste déclaratif et limité à la liste de domaines reconnue ; DIRECT_OU_INCONNU et les lignes historiques nulles ne deviennent pas des visiteurs SEO.
