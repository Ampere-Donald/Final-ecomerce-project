# Marché extérieur pilote — décision du 31 octobre 2026

**Décision actuelle : développer d’abord l’audience technique francophone et anglophone, tout en consolidant les ventes au Cameroun. Aucune offre commerciale pays n’est prête à ouvrir.** Cette conclusion fait partie des issues prévues par SEO-33 ; elle ne désigne pas artificiellement un pays gagnant.

Le dossier compare les sept destinations proposées ou observées. La sélection commerciale pourra évoluer avec les demandes qualifiées et les preuves logistiques. Le lot anglais prépare l’accès aux contenus ; il ne constitue pas une promesse d’exportation.

## Ce que montrent les données NEWOTEG

Source : export natif Search Console, recherche Web, **30 juillet–29 octobre 2026**. Les chiffres ci-dessous sont relus dans `Countries.csv` du ZIP original ; ce ne sont ni des volumes de recherche nationaux ni des commandes.

| Marché | Clics | Impressions | Zone monétaire institutionnelle | Conclusion permise |
|---|---:|---:|---|---|
| Cameroun, référence de comparaison | 54 | 254 | BEAC | Marché qui concentre les clics observés ; poursuivre le pilote existant |
| République centrafricaine | 1 | 1 | BEAC | Un signal à surveiller ; aucune demande qualifiée prouvée |
| Gabon | 0 | 1 | BEAC | Visibilité trop faible pour établir une demande |
| Congo, Brazzaville | Ligne absente | Ligne absente | BEAC | Aucune mesure exploitable dans cette table ; ne pas convertir l’absence en zéro de marché |
| Tchad | 0 | 1 | BEAC | Visibilité trop faible pour établir une demande |
| Côte d’Ivoire | 0 | 1 | BCEAO | Visibilité trop faible pour établir une demande |
| Sénégal | 0 | 1 | BCEAO | Visibilité trop faible pour établir une demande |
| Bénin | Ligne absente | Ligne absente | BCEAO | Aucune mesure exploitable dans cette table |

Les appartenances monétaires sont documentées par la [BEAC](https://www.beac.int/beac/la-beac/) et la [BCEAO](https://www.bceao.int/fr/content/histoire-du-franc-cfa). Elles ne démontrent ni l’acceptation d’un moyen de paiement, ni ses frais, ni la facilité d’un remboursement. Le mot « FCFA » ne suffit pas à définir une chaîne d’encaissement entre les deux zones.

L’export totalise 58 clics et 405 impressions. L’échantillon ne permet pas de classer le potentiel des pays. Une recherche ciblée dans la messagerie connectée, limitée aux échanges identifiés NEWOTEG et aux destinations/export, n’a pas fourni de résultat exploitable ; ce contrôle limité ne prouve pas l’absence de demandes reçues par téléphone, WhatsApp ou ailleurs. Aucun message n’a été envoyé.

## Stock, colis et parcours : contrôle concret

Lecture anonyme des vingt fiches pilotes sur l’API publique : **20 réponses HTTP 200, 20 stocks positifs à cet instant, 16 prix publics positifs, 4 prix non renseignés**. Les champs `poids` et `volume` sont présents mais valent **null pour les vingt produits**. Le contrôle ne mesure pas un colis emballé et ne garantit pas la disponibilité future ou un réapprovisionnement.

Le parcours actuel recueille ville et adresse, laisse les frais/délais à confirmer et précise qu’aucun paiement en ligne n’intervient à cette étape. Le DTO de commande ne porte pas de pays structuré. C’est une limite constatée du parcours, pas une preuve d’impossibilité d’exporter : un devis manuel pourrait être étudié après confirmation de ses modalités.

Preuves locales : `output/seo-implementation/country-pilot-2026-10-31/public-product-logistics-check.json` et `country-comparison.json`. Aucun coût fournisseur, marge privée, prix de transport, délai contractuel ou résultat de paiement n’est inventé.

## Pourquoi une destination proche n’est pas encore une offre vendable

Le site [DHL Cameroun propose un accès aux cotations et expéditions internationales](https://www.dhl.com/cm-fr/home/express.html). Cela fournit un point de départ pour demander un devis ; cela ne vérifie pas un trajet Douala–destination, une adresse, un colis, un tarif ou un délai pour NEWOTEG. Le lien de cotation a redirigé vers MyDHL+ sans fournir de devis exploitable dans cet environnement. Aucun compte créé, aucune réservation, aucun envoi payé. Le guide tarifaire France trouvé en recherche est écarté : ce n’est pas un tarif au départ du Cameroun.

Pour le Gabon, la [douane distingue les marchandises originaires de la communauté et les conditions du régime préférentiel](https://douanes.ga/medias/documents/15/la-fiscalite-douaniere). **Expédier depuis le Cameroun ne suffit pas à établir cette origine.** Les composants du pilote n’ont pas de justificatif d’origine export vérifié ici. Aucun code douanier, droit, exonération ou taxe n’est donc appliqué au calcul. Cette page institutionnelle ne remplace pas la confirmation actuelle applicable à l’envoi et à son destinataire.

## Comparaison commerciale à compléter sur preuves

Les informations suivantes manquent pour chacune des sept destinations. Leur absence reste « non établi » ; elle n’est ni notée zéro ni remplacée par une moyenne.

| Critère de SEO-33 | État actuel | Pièce nécessaire pour décider |
|---|---|---|
| Demande | Clics seulement ; demandes qualifiées non établies | Référence, quantité, ville/pays et besoin réel, sans publier les coordonnées du client |
| Stock adapté | Vingt références disponibles lors du contrôle | Quantités du panier demandé et possibilité de réapprovisionnement confirmées |
| Coût rendu et marge | Non calculables | Prix courant, coût interne autorisé, colis mesuré, cotation détaillée, taxes et frais documentés |
| Paiement | Aucun encaissement transfrontalier vérifié | Moyen accepté, devise de règlement, frais, délai, preuve de réception et remboursement possible |
| Délai | Non confirmé par trajet | Service, adresse couverte, délai annoncé, réserves douanières, suivi et traitement d’une non-livraison |
| Retours | Conditions et coût non confirmés | Responsabilités, procédure, adresse de retour, transport et frais applicables validés |
| Support | Français/anglais préparés sur le site | Personne responsable, canal et horaires réellement assurés pour ce pilote |

Une fois les preuves réunies, comparer les destinations sur les six critères de la stratégie : demande, adéquation du stock, marge après expédition/retours, livraison, paiement/support, différenciation. Une note 0–5 reste un jugement documenté ; aucune moyenne ne doit compenser un blocage de livraison, de paiement ou de retour. Les pondérations et la marge minimale acceptable restent à fixer avec le commerce, à partir de ses contraintes réelles.

## Prochaine action réalisable

Utiliser la [fiche de préparation des colis et cotations](PREPARATION_COLIS_COTATION_PAYS_PILOTE.md). Elle contient les références existantes et les champs de mesure, sans poids ni dimensions supposés. Comparer d’abord le **même panier** et les **mêmes responsabilités de livraison** entre les destinations ayant une demande réelle ; sinon la comparaison des tarifs serait trompeuse. La RCA mérite une vérification de demande en raison du clic observé, sans priorité commerciale déduite d’un seul clic.

Le dossier de cotation peut être préparé ici ; peser les colis et confirmer un service réel exige une preuve opérationnelle. Les modèles de demande restent internes tant qu’un envoi n’a pas été explicitement autorisé. Les questions déjà posées sur les retours et horaires restent en attente ; elles ne sont pas reposées dans ce dossier.

## Conséquences SEO mises en œuvre dans le plan

Conserver les contenus français et les traductions anglaises admissibles sur le domaine `.com`. Google distingue [versions linguistiques et versions régionales](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) : une traduction anglaise n’a pas à représenter un nouveau pays de livraison.

Les prochains efforts portent sur la publication vérifiée des guides, le maillage produit/famille/guide et la mesure par pays sur des périodes comparables. Aucun seuil de clics n’est présenté comme une validation commerciale. Les demandes réelles devront être qualifiées séparément des données Search Console, sans ajouter de coordonnées privées au collecteur public de parcours.

Une page pays ne sera préparée pour publication qu’avec une offre distincte et utile : destination/zone réellement desservie, références disponibles, prix et devise explicites, paiement, frais et responsabilités, délais, retours et support confirmés. Multiplier des pages quasi identiques par pays qui renvoient au même parcours n’apporterait pas cette information ; cela rejoint les exemples de [pages satellites décrits par Google](https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse).

**État de SEO-33 : étude documentaire et décision d’étape produites ; pays commercial non sélectionné faute de modalités confirmées.** Aucune page pays, offre export, tarif, promesse ou campagne n’a été publiée. Le plan SEO complet reste en cours.
