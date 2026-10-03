# Suivi privé invité et récupération email — 3 octobre 2026

NEWOTEG retient le SMS, sans fournisseur disponible actuellement, et demande aussi l’email. L’email de suivi est facultatif et distinct de la création de compte. Aucun compte implicite. Retrait Akwa après confirmation ; frais/délai de livraison à confirmer.

L’utilisateur confirme aussi l’absence de service email. Aucun fournisseur SMS/email ni expéditeur réel n’est donc disponible à ce stade ; les envois restent désactivés, sans empêcher le suivi par lien privé.

Ce lot livre le suivi privé des **nouvelles commandes invitées**, la révocation administrative et la récupération email. L6 reste ouvert : annulation/réception par un invité, rattachement facultatif avec preuve renforcée et interface administrative. Les anciennes commandes sans clé ne deviennent pas accessibles sur la seule base d’un téléphone ou d’un numéro.

## Parcours et protection

- Clé CSPRNG de 256 bits générée dans le navigateur et conservée avec le requestId avant l’envoi. Reprise après coupure : même commande, même accès, sans deuxième débit de stock.
- Confirmation E conservée : lien privé à copier et date d’expiration. `/suivi-invite` montre articles/prix historiques, montant des articles, réception et statut ; aucun nom, téléphone, adresse ou coût interne.
- Toute personne qui possède le lien peut lire les articles et le statut : cette limite est expliquée. Session d’onglet, actualisation et fermeture sur l’appareil. Le lien ne permet ni paiement ni action sensible.
- Perte/expiration : numéro et email enregistré au checkout. Code à huit chiffres, dix minutes, usage unique ; cinq échecs épuisent le challenge. Renvoi après soixante secondes, maximum trois demandes par commande/heure, limite HTTP par IP.
- La récupération renouvelle la clé et invalide l’ancien lien. Deux consommations concurrentes ont un seul gagnant. Nouvelle clé conservée avant POST, sans stockage du code : une réponse perdue peut être retrouvée par consultation de cette clé.
- Canal désactivé/non configuré : indisponibilité annoncée et contact boutique. Aucun envoi automatique du lien après checkout dans ce lot. SMS indisponible jusqu’à intégration d’un fournisseur.

Clé reçue seulement dans les corps POST ; fragment du lien retiré avant montage React. Google OAuth limité aux écrans d’authentification. Audit existant sans corps, code ou clé. SHA-256 des clés en base, validité trente jours ; HMAC du code avec identifiant du challenge et secret serveur. Création de commande, reçu de tentative, mouvements de stock et accès dans une même transaction. Un rejeu ne prolonge/réactive jamais un accès expiré, révoqué, renouvelé ou une commande rattachée à un compte.

## API et configuration

`POST /api/commandes/guest/access` : lecture privée. `GET .../guest/channels` : disponibilité uniquement. `POST .../guest/recovery` : demande de code, même message et identifiant factice pour des informations inconnues, sans envoi. Cela évite une révélation explicite dans le contenu, sans garantir des temps de réponse identiques. `POST .../guest/recover` : code et nouvelle clé ; verrou de l’accès, compteur d’échecs réellement committé, renouvellement atomique. Email non délivré, code expiré, révocation ou rattachement empêchent la récupération.

`POST .../guest/admin/:id/revoke` : ADMIN/SUPER_ADMIN, acteur/date/motif ; idempotent, bloque aussi la récupération email. Aucun droit invité d’annulation, réception ou rattachement : ces droits sont explicitement faux dans la réponse.

`Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` pour le suivi. Métadonnées de page ; Worker applique aussi ces en-têtes au document avant JavaScript et aux erreurs API privées. Worker testé localement, non déployé ; contrôle réel d’hébergement restant en L8. Aucune collecte analytique de code, clé, email ou référence de commande.

L’envoi email exige `GUEST_EMAIL_ENABLED=true` et SMTP configuré : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Défaut désactivé. Le transport invité ne journalise ni code, ni destinataire, ni erreur SMTP détaillée. Usages existants de MailService conservés. Expéditeur/domaine et délivrabilité restent à vérifier avant activation ; aucun secret dans le chat.

## Preuves et limites

Migration additive `20261003005000_guest_order_access` : tables accès/challenges, index et clés étrangères. SQL appliqué seulement à `127.0.0.1:55439/newoteg_quote_acceptance_test`. Cela ne réconcilie pas l’ancienne divergence de migration et ne vaut pas migration Railway.

Builds backend/storefront et lints ciblés réussis. Neuf suites backend, 63 tests. Les 52 tests Node storefront passent, dont les tests d’accès privés et du Worker.

`Back-end/scripts/verify-guest-access-local.cjs` refuse une autre base avant toute connexion. Treize contrôles PostgreSQL/HTTP/navigateur passent : reprise concurrente, rollback sur clé réutilisée, confidentialité, limites, expiration/révocation, échec d’envoi, concurrence de récupération, rattachement retirant l’accès, en-têtes et refus de révocation sans authentification. Mobile 390/desktop 1440 px, rechargement et fermeture vérifiés. Une vraie commande fictive sur API locale perd sa réponse puis est reprise sans doublon ni compte. Parcours email avec vrai service et PostgreSQL, transport capturé : réponse perdue récupérée sans deuxième consommation du code.

Preuves : `C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-access/result.json` et captures `tracking-390.png`, `tracking-1440.png`, `email-recovered-390.png`, clés masquées. Commandes/challenges fictifs supprimés, produit de recette désactivé.

Aucun fournisseur email/SMS réel, paiement, Railway ou déploiement. Pilote réel, téléphone physique, activation du canal et derniers parcours L6 restent ouverts.
