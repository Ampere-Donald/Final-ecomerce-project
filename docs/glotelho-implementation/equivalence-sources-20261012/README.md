# Équivalences : sources du catalogue et contraintes du montage

## Changement concret

La recherche d’équivalents recevait principalement les noms, descriptions et codes commerciaux. Elle reçoit désormais aussi un sous-ensemble des caractéristiques documentées et relues du catalogue, ainsi que les contraintes facultatives indiquées par le client. Les sources de la fiche cible sont transmises séparément quand la demande part d’un produit.

Le formulaire FR/EN comporte « Votre montage et ses contraintes (facultatif) », limité à 500 caractères. Modifier la pièce ou le montage retire les anciens résultats et annule la requête en cours. Un refus temporaire conserve les deux saisies. Le texte du montage est transmis au moteur configuré pour cette demande et participe à la clé du cache ; il n’est pas ajouté au journal persistant des suggestions.

Les identités fabricant et alias documentés participent également à la sélection des pièces en stock, avec la même recherche exacte normalisée que le catalogue. Une correspondance de référence n’établit pas une compatibilité technique. Les prix et disponibilités restent ceux de la projection publique, après réservations boutique.

Les résultats permettent d’ouvrir les caractéristiques et leurs sources : document, page/section, conditions et date de relecture. Sans source actuelle, l’absence est explicite. La source documente la pièce proposée ; elle ne valide pas son remplacement dans le montage du client. Le repli sans fournisseur reste une correspondance catalogue à vérifier.

## Contrat et limites

- Projection exclusivement dérivée des enregistrements actuels en base : état `DOCUMENTE`, relecture présente et versions valeur/attribut/produit concordantes. Brouillon, contradiction, inconnue ou preuve obsolète exclus. Les sources inventées par le fournisseur ne sont pas publiées.
- Identité du relecteur, coûts internes et autres champs privés exclus. Une modification de source, de fiche cible, de stock, de prix ou de montage invalide la réponse en cache.
- Lecture limitée à 24 attributs et 6 valeurs documentées par attribut ; au plus 12 caractéristiques retournées par pièce. Le contexte fournisseur contient au plus 12 000 caractères de sources candidates, avec des enregistrements JSON entiers. Il s’agit d’un sous-ensemble, jamais d’une vérification exhaustive. La sélection lexicale existante reste limitée à 300 candidats, puis 40 transmis au moteur et 5 propositions affichées.
- Le score du moteur ne devient pas un certificat de compatibilité ; aucun remplacement automatique ni ajout au panier introduit.

Pas de nouvelle migration dans cet incrément. Il dépend des deux migrations candidates de PR #10, déjà répétées sur schéma historique/restauration synthétique. La répétition Railway 18.6 antérieure reste datée de la version à une migration ; elle ne prouve pas le déploiement de cette version. Préproduction Railway différée conformément à la demande humaine. PR #10 reste en brouillon ; aucune publication ou annotation d’article réel effectuée ici.

## Vérification

- Builds backend et storefront moderne/legacy réussis ; lint ciblé réussi. Suite backend complète : 61 suites / 465 tests, puis 10 tests ciblés après ajout du contrôle du budget JSON. Les 113 tests Node storefront passent.
- [result.json](result.json) : 18 groupes PostgreSQL/Nest/HTTP réels, avec export/restauration d’un schéma baseline synthétique, application des deux migrations exactes, conservation des lignes, contrat de structure, JWT/rôles, concurrence et invalidation. Recherche par référence documentée, contexte fournisseur, invalidation du cache et absence du montage dans les journaux contrôlés. DTO public refuse un montage non textuel ou supérieur à 500 caractères ; repli sans fournisseur renvoie la source catalogue actuelle et une compatibilité inconnue.
- [browser-result.json](browser-result.json) : 12 parcours du build en français/anglais, 390/768/1440 px, bundles moderne et legacy. Le formulaire poste au vrai serveur local/Nest/PostgreSQL de recette ; les seules lectures du shell sont simulées. Sources ouvrables, clavier, focus des résultats non masqué, retrait des résultats sur édition, reprise après 429 et absence de source passent. Aucune erreur JavaScript, sortie réseau externe ou autre écriture API.
- Captures [mobile](modern-fr-390.png) et [desktop](modern-fr-1440.png) inspectées. La capture intégrale part du haut pour éviter le déplacement artificiel des éléments fixes/sticky ; le focus des résultats est vérifié avant cette remise en haut.
- Les trois bases temporaires sont supprimées en fin de recette. Aucun appel Gemini réel, envoi email/SMS ou commande boutique. Sources et produits des captures sont exclusivement synthétiques.

Recette : `Back-end/scripts/verify-technical-provenance-local.cjs --equivalence-browser`, avec PostgreSQL local autorisé et preview du build en loopback. Le test navigateur nécessite le canal IPC de cette recette et refuse une cible extérieure.

## Suite de l’objectif A–Z

Cet incrément avance L1/L3 : il prépare une recherche mieux informée et des résultats examinables. Restent la saisie/relecture de véritables caractéristiques par famille, les cas de remplacement acceptés par les techniciens et le pilote client. Les validations métier, fournisseurs de récupération, exploitation et téléphone physique du plan restent ouverts. L’objectif A–Z demeure actif ; l’étape Railway différée n’est pas déclarée accomplie.
