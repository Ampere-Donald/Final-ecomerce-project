# Préparer un colis et une cotation — NEWOTEG

Document interne lié à [la décision pays pilote](DECISION_PAYS_PILOTE_SEO_2026-10-31.md). **Aucun tarif, poids, dimension, délai ou accord transporteur n’est confirmé par ce modèle. Aucun message n’est envoyé.**

## 1. Demande et panier

Renseigner un identifiant interne de demande ; conserver les coordonnées personnelles dans le dossier commercial autorisé, hors du dépôt et du collecteur SEO. Définir pays, ville, type de destinataire, références complètes et quantités. Relever le prix courant et la date de confirmation du stock. Vérifier les accessoires, piles/batteries éventuelles, état neuf/usagé et restrictions applicables avec le transporteur ; ne pas déduire leur présence ou absence d’une photographie.

Ne pas regrouper des références uniquement pour augmenter un panier moyen théorique. Le panier à comparer doit répondre à un besoin identifié.

## 2. Mesurer après emballage

| Champ | Valeur à relever | Preuve à conserver |
|---|---|---|
| Références et quantités | À renseigner | Liste du contenu et identifiants catalogue |
| Poids brut du colis | À mesurer, unité explicite | Pesée du colis complet, date et photo de lecture |
| Dimensions extérieures | Longueur × largeur × hauteur, unité explicite | Mesures après emballage et photos |
| Nombre de colis | À compter | Correspondance contenu/colis |
| Conditionnement | À décrire | Protection, calage et éventuelles exigences du produit |
| Valeur déclarée | À confirmer selon les documents requis | Facture/pro forma et périmètre assurance |
| Origine des marchandises | À établir par référence | Document accepté pour l’opération ; pays d’expédition distinct de l’origine |
| Classement douanier | À faire confirmer | Réponse documentée pour les références et l’usage concernés |

Les champs `poids` et `volume` des vingt pilotes sont actuellement null dans l’API publique. Une mesure de composant seul ne suffit pas à donner le poids brut d’un colis. Ne pas inscrire de valeur estimée comme si elle avait été mesurée.

## 3. Modèle de demande de cotation, à compléter avant tout envoi

Objet proposé : cotation marchandise au départ de Douala vers [ville, pays] — [identifiant interne].

> Nous souhaitons étudier l’expédition du panier décrit en pièce jointe, au départ de Douala, Cameroun, vers [destination précise communiquée dans le canal autorisé]. Le colis emballé mesure [dimensions et unités], pèse [poids brut et unité] et contient [références, quantités et accessoires]. Merci de confirmer l’acceptation des marchandises et du conditionnement, la desserte de l’adresse, le service et le suivi proposés, le délai annoncé et ses réserves, ainsi qu’une cotation détaillée avec sa devise, sa validité et les frais inclus/exclus. Merci de préciser qui effectue et paie les formalités, droits/taxes et frais à destination, les justificatifs nécessaires et la procédure en cas de refus de livraison, perte, dommage ou retour. Merci d’indiquer aussi le coût et les conditions d’un retour, ainsi que les modalités d’assurance et d’indemnisation applicables.

Ne pas envoyer ce texte incomplet et ne pas joindre des données client à un service sans destination et usage autorisés. Ce modèle ne choisit pas le partage des responsabilités à la place de la boutique ou du client.

## 4. Lire la réponse reçue

Reporter le transport de départ, les suppléments, le carburant, le dédouanement/prestations, les droits/taxes confirmés, la livraison finale, l’assurance choisie et les frais de paiement/conversion. Pour chaque ligne : montant, devise, payeur, inclusion éventuelle dans une autre ligne, source et date de validité. Marquer les valeurs inconnues « à confirmer », jamais 0. Éviter de compter deux fois un service inclus dans le forfait.

Vérifier les conditions de colis non livré et de retour avant d’annoncer un prix au client. Un tarif public général ou un devis pour un autre pays d’origine ne remplace pas la cotation du trajet retenu.

## 5. Calculer seulement avec les montants documentés

**Coût total supporté par le client** : total de la facture payée à NEWOTEG, plus les montants restant explicitement à sa charge auprès d’autres intervenants. Distinguer clairement ce qui est inclus et ce qui reste à payer. Ne pas ajouter à nouveau un transport déjà compris dans la facture.

**Contribution de la vente pour NEWOTEG** : recettes nettes réellement conservées, moins coût d’achat des articles et coûts additionnels effectivement supportés par NEWOTEG : préparation/emballage, transport, prestations, assurance choisie, encaissement/conversion, support et coûts de non-livraison/retour. Ne pas confondre taxes à reverser et revenu conservé. Une réserve pour retours n’est chiffrée qu’avec une hypothèse identifiée et justifiée ; présenter séparément un scénario de vente normale et un scénario de retour documenté.

Si un montant indispensable manque, le calcul reste incomplet. Ne pas transformer un scénario de travail en prix contractuel, et ne pas réutiliser un ancien devis expiré.

## 6. Passage au pilote

Le dossier retenu doit réunir une demande réelle, des articles confirmés, une cotation encore valable, un encaissement vérifié dans la devise convenue, des modalités de retour acceptables et une personne de support identifiée. Faire confirmer l’offre finale et son périmètre par le commerce avant d’en faire une promesse publique. Aucun envoi test payant ni commande fictive n’est autorisé par ce document.

Après une première opération réelle autorisée, rapprocher les coûts et délais observés des montants annoncés, puis mettre à jour le dossier pays. Une expédition réussie reste une observation limitée ; elle ne garantit pas toutes les zones d’un pays.
