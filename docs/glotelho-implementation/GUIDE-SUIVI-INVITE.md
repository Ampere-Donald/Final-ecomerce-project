# Gérer le suivi sans compte en boutique

3 octobre 2026 · Fonctionnement intégré localement, activation réelle des messages non effectuée.

## Consulter l’état

Un ADMIN ou SUPER_ADMIN ouvre **Commandes → Détails → Suivi sans compte**. Les vendeurs et caissiers ne disposent pas de cette gestion ; le serveur refuse également leurs appels directs. L’écran affiche les dates d’émission et d’expiration, l’état, et le motif/date d’une révocation. Aucune clé privée, adresse email de récupération ou code n’est accessible dans ce panneau.

| État | Conséquence |
| --- | --- |
| Lien actif | Le détenteur peut lire les articles et le statut. Modifier la commande exige une preuve distincte. |
| Lien expiré | La lecture est fermée ; la récupération exige l’email enregistré et un canal configuré. |
| Accès révoqué | Lecture et codes en attente bloqués. La commande et ses articles restent conservés. |
| Commande rattachée au compte | Le client utilise son compte. Le suivi invité est fermé. |
| Commande avec compte | Aucun accès invité à gérer. |
| Aucun accès invité | Ancienne commande ou checkout sans accès privé ; cet écran ne crée pas de clé. |

## Révoquer un accès

1. Actualiser l’état, notamment après une demande de récupération du client.
2. Choisir **Préparer la révocation de l’accès**, saisir le motif sans code, clé ou coordonnées, puis confirmer la fermeture.
3. Choisir **Révoquer l’accès invité**. Le serveur vérifie la version courante, enregistre l’acteur/date/motif et invalide les codes en attente dans une transaction.
4. Vérifier le résultat affiché. Une révocation ne supprime pas la commande, ne l’annule pas, ne rembourse pas et ne modifie ni stock ni encaissement.

Si l’accès a changé, actualiser avant une nouvelle demande. Si la réponse réseau est perdue, utiliser **Vérifier le résultat de la révocation** : cela relit l’état sans renvoyer la révocation. Une répétition conserve le premier acteur, la date et le motif. Des reçus minimaux d’actions déjà terminées peuvent rester consultables avec leurs preuves séparées ; ils ne rouvrent ni le lien ni la commande.

## Accompagner le client

Le client conserve son lien après le checkout et peut fermer l’accès sur son appareil. Ne jamais demander de transmettre un code à l’équipe ou coller une clé dans un journal. Un téléphone ou numéro de commande seul ne prouve pas la propriété. L’administration ne fabrique ni ne renvoie une nouvelle clé et ne rattache pas une commande à un compte à la place du client.

En cas de lien perdu : la récupération autonome utilise l’email du checkout quand le service est activé. Sans email enregistré ou sans fournisseur disponible, aucun contournement n’est offert. La procédure humaine de résolution et de vérification d’identité doit être définie par NEWOTEG avant le pilote réel.

Les canaux indiqués « service configuré » ne garantissent pas la délivrabilité à une adresse donnée. Cet écran n’envoie aucun message. Actuellement, aucun fournisseur email/SMS NEWOTEG n’est disponible : les envois réels restent désactivés. Retrait Akwa après confirmation de la boutique ; frais et délai de livraison à confirmer.

## Avant activation réelle

Valider fournisseur/expéditeur et délivrabilité, procédure humaine de perte d’accès, responsables et entretien des challenges. Tester sur téléphone réel avec l’équipe et en préproduction isolée. Les preuves locales ne valent pas mise en production ni autorisation de publication.
## Entretien automatique

Le nettoyage est désactivé par défaut. Après validation des migrations et du retour arrière, l’exploitation peut activer `GUEST_CHALLENGE_CLEANUP_ENABLED=true` : passage horaire à :15, au plus 2 000 lignes. Codes périmés conservés au moins 24 heures ; reçus de reprise conservés 30 jours. Les accès et commandes restent inchangés. Un échec fixe dans les journaux impose une vérification ; le prochain passage réessaie. Désactiver le flag arrête les prochains passages, sans restaurer les codes déjà périmés supprimés.
