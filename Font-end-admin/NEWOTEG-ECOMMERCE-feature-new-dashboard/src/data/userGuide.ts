export type GuideRole = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEUR' | 'CAISSIER' | 'MANAGER';

export type GuideWorkflow = {
  title: string;
  steps: string[];
  note?: string;
};

export type GuideRoleContent = {
  role: GuideRole;
  label: string;
  subtitle: string;
  accessMode: string;
  mission: string;
  mainMenus: string[];
  dailyFocus: string[];
  canDo: string[];
  limits: string[];
  workflows: GuideWorkflow[];
  alerts: string[];
};

export type TroubleshootingItem = {
  problem: string;
  cause: string;
  action: string;
};

export const guideRoleOrder: GuideRole[] = ['SUPER_ADMIN', 'ADMIN', 'VENDEUR', 'CAISSIER', 'MANAGER'];

export const allGuidesAllowedRoles = ['SUPER_ADMIN', 'ADMIN'];

export const canReadAllGuides = (role?: string | null) =>
  allGuidesAllowedRoles.includes(role || '');

export const normalizeGuideRole = (role?: string | null): GuideRole =>
  guideRoleOrder.includes(role as GuideRole) ? (role as GuideRole) : 'VENDEUR';

export const roleGuideContent: Record<GuideRole, GuideRoleContent> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super admin',
    subtitle: 'Direction et controle total',
    accessMode: 'Mot de passe',
    mission:
      "Controle les acces, les validations sensibles, les parametres et la surveillance globale de l'activite.",
    mainMenus: [
      'Tableau de bord',
      'Analyses',
      'Notifications',
      'Caisse globale',
      'Coffres',
      'Paie',
      'Employes',
      'Roles',
      'Parametres',
    ],
    dailyFocus: [
      'Verifier le tableau de bord et les notifications importantes.',
      'Controler les alertes stock, les echeances et la caisse globale.',
      'Traiter les validations sensibles comme les factures virtuelles.',
      'Gerer les acces employes si un poste change dans la boutique.',
    ],
    canDo: [
      'Creer, modifier, desactiver et supprimer les comptes employes.',
      'Changer les roles et reinitialiser les acces.',
      'Rouvrir une caisse du jour fermee si la situation le justifie.',
      'Approuver ou refuser les factures virtuelles.',
      'Modifier les prix critiques et les parametres systeme.',
      'Consulter tous les guides de formation.',
    ],
    limits: [
      'Eviter de vendre au comptoir avec le compte super admin si un vendeur peut le faire.',
      'Limiter le nombre de comptes super admin.',
      'Toujours changer un role avec un motif clair.',
    ],
    workflows: [
      {
        title: 'Creer un employe',
        steps: [
          'Ouvrir Employes ou Comptes Admin.',
          'Cliquer sur Nouvel employe ou Creer.',
          'Renseigner nom, identifiant et role.',
          'Definir un PIN pour VENDEUR ou CAISSIER.',
          'Definir un mot de passe pour ADMIN ou SUPER_ADMIN.',
          'Enregistrer puis tester la connexion.',
        ],
      },
      {
        title: 'Traiter une facture virtuelle',
        steps: [
          'Ouvrir Factures puis Factures virtuelles.',
          'Filtrer sur En attente.',
          'Verifier vendeur, client, facture reelle et majoration.',
          'Approuver si le dossier est correct.',
          'Refuser avec motif si la demande n est pas justifiee.',
        ],
      },
    ],
    alerts: [
      'Une reouverture de caisse doit rester exceptionnelle.',
      'Un compte inactif ne peut plus se connecter.',
      'Les comptes PIN sont reserves au personnel de boutique.',
    ],
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    subtitle: 'Responsable operationnel',
    accessMode: 'Mot de passe',
    mission:
      'Pilote la boutique au quotidien : ventes, stock, clients, achats, caisse et suivi financier courant.',
    mainMenus: [
      'Tableau de bord',
      'Analyses',
      'Caisse du jour',
      'Caisse globale',
      'Credits clients',
      'Echeances',
      'Produits',
      'Stock',
      'Achats',
      'Clients',
      'Fournisseurs',
    ],
    dailyFocus: [
      'Lire le tableau de bord et les analyses.',
      'Verifier les ruptures et alertes stock.',
      'Suivre les achats, fournisseurs et mouvements stock.',
      'Controler les credits clients et les echeances.',
      'Surveiller la caisse du jour et la caisse globale.',
    ],
    canDo: [
      'Gerer le catalogue et les categories selon les droits actifs.',
      'Suivre les mouvements de stock et les inventaires.',
      'Consulter les factures, proformas et primes vendeurs.',
      'Gerer les clients, credits et fournisseurs.',
      'Consulter tous les guides de formation.',
    ],
    limits: [
      'Ne gere pas normalement les roles ni les parametres systeme.',
      'Ne doit pas remplacer le super admin pour les validations sensibles.',
      'Les suppressions et modifications critiques doivent etre controlees.',
    ],
    workflows: [
      {
        title: 'Routine responsable boutique',
        steps: [
          'Se connecter par mot de passe.',
          'Consulter Tableau de bord et Analyses.',
          'Ouvrir Alertes stock pour identifier les ruptures.',
          'Verifier Commandes en ligne et Credits clients.',
          'Controler Caisse du jour puis Caisse globale.',
        ],
      },
      {
        title: 'Suivre le stock',
        steps: [
          'Ouvrir Produits pour rechercher un article.',
          'Utiliser Mouvements stock pour comprendre les variations.',
          'Verifier Inventaire lorsque le stock physique semble different.',
          'Planifier un achat ou un reapprovisionnement si le seuil est atteint.',
        ],
      },
    ],
    alerts: [
      'Une vente a credit doit toujours etre rattachee a un client enregistre.',
      'Une rupture de stock doit etre traitee avant de proposer le produit au client.',
      'Le role ADMIN reste operationnel, pas systeme.',
    ],
  },
  VENDEUR: {
    role: 'VENDEUR',
    label: 'Vendeur',
    subtitle: 'Vente comptoir',
    accessMode: 'PIN boutique',
    mission:
      'Recherche les produits, conseille le client, prepare le panier et envoie le bon au caissier.',
    mainMenus: ['Vente en cours', 'Mes tickets', 'Commandes en ligne', 'Produits', 'Clients', 'Proformas'],
    dailyFocus: [
      'Ouvrir Vente en cours.',
      'Rechercher ou scanner les produits demandes.',
      'Verifier stock, prix et quantites avant envoi.',
      'Envoyer le bon au caissier.',
      'Suivre les ventes encaissees dans Mes tickets.',
    ],
    canDo: [
      'Creer un bon de vente.',
      'Creer une proforma pour un client.',
      'Consulter les produits disponibles.',
      'Utiliser les equivalences de composants electroniques du catalogue.',
      'Suivre son score et ses tickets.',
    ],
    limits: [
      'Ne finalise pas l encaissement.',
      'Ne modifie pas les stocks ni les parametres.',
      'Ne doit pas proposer une equivalence hors catalogue.',
      'Ne doit pas envoyer un panier sans verifier la quantite disponible.',
    ],
    workflows: [
      {
        title: 'Faire une vente',
        steps: [
          'Ouvrir Vente en cours.',
          'Rechercher le produit par nom, marque, code ou scan.',
          'Ajouter les articles au panier.',
          'Verifier la quantite et le prix.',
          'Selectionner le client si necessaire.',
          'Choisir le mode de paiement annonce.',
          'Envoyer le bon au caissier.',
          'Verifier ensuite Mes tickets lorsque la vente est encaissee.',
        ],
      },
      {
        title: 'Chercher une equivalence',
        steps: [
          'Utiliser Equivalence uniquement pour les composants electroniques.',
          'Chercher par reference, famille, marque ou designation.',
          'Ajouter seulement une suggestion presente dans le catalogue.',
          'Signaler au responsable si aucun produit catalogue ne correspond.',
        ],
        note:
          'Exemples valides : diode, transistor, resistance, condensateur, circuit integre, connecteur, capteur, relais, regulateur.',
      },
      {
        title: 'Creer une proforma',
        steps: [
          'Ajouter les produits au panier.',
          'Cliquer sur Creer proforma.',
          'Renseigner les informations client si necessaire.',
          'Imprimer ou remettre la proforma au client.',
        ],
      },
    ],
    alerts: [
      'Une proforma n est pas une vente encaissee.',
      'Une equivalence doit pointer vers un produit reel du catalogue.',
      'Un bon envoye au caissier reste en attente tant qu il n est pas encaisse.',
    ],
  },
  CAISSIER: {
    role: 'CAISSIER',
    label: 'Caissier',
    subtitle: 'Encaissement et caisse du jour',
    accessMode: 'PIN boutique',
    mission:
      'Encaisse les bons, imprime les tickets ou factures, suit la caisse du jour et gere les paiements clients.',
    mainMenus: ['Caisse du jour', 'Credits clients', 'Factures', 'Proformas', 'Produits'],
    dailyFocus: [
      'Verifier que la caisse du jour est ouverte.',
      'Traiter les tickets dans A encaisser.',
      'Controler le mode de paiement avant validation.',
      'Imprimer ticket ou facture apres encaissement.',
      'Suivre les credits clients et les reglements.',
    ],
    canDo: [
      'Encaisser un bon envoye par un vendeur.',
      'Enregistrer une vente a credit avec client obligatoire.',
      'Consulter les encaissements du jour.',
      'Imprimer les tickets et factures.',
      'Ajouter une operation de caisse si le droit est disponible dans la session.',
    ],
    limits: [
      'Ne cree pas normalement le panier de vente.',
      'Ne rouvre pas une caisse fermee.',
      'Ne valide pas une vente a credit sans client enregistre.',
      'Ne gere pas les roles, les prix ou les parametres.',
    ],
    workflows: [
      {
        title: 'Encaisser un ticket',
        steps: [
          'Ouvrir Caisse du jour.',
          'Aller dans A encaisser.',
          'Selectionner le ticket en attente.',
          'Verifier vendeur, articles, total et mode de paiement.',
          'Pour CREDIT, selectionner un client enregistre.',
          'Saisir un acompte si le client paie une partie.',
          'Cliquer sur Encaisser.',
          'Imprimer le ticket ou la facture.',
        ],
      },
      {
        title: 'Fermer la journee',
        steps: [
          'Verifier les encaissements du jour.',
          'Controler les entrees et sorties.',
          'Comparer le solde logiciel avec l argent reel.',
          'Fermer la caisse si tout est correct.',
          'Demander au super admin si une reouverture est necessaire.',
        ],
      },
    ],
    alerts: [
      'La caisse fermee ne doit pas etre rouverte sans raison claire.',
      'Le credit client demande toujours une fiche client.',
      'Un ticket en attente n est pas encore une vente encaissee.',
    ],
  },
  MANAGER: {
    role: 'MANAGER',
    label: 'Manager',
    subtitle: 'Role technique partiel',
    accessMode: 'Mot de passe',
    mission:
      "Role present dans le schema et certains controles backend, mais parcours interface encore incomplet.",
    mainMenus: ['Produits', 'Achats partiels selon backend'],
    dailyFocus: [
      'Ne pas utiliser ce role pour le premier deploiement boutique.',
      'Preferer ADMIN pour un responsable boutique.',
      'Preferer VENDEUR ou CAISSIER pour le personnel comptoir.',
    ],
    canDo: [
      'Peut etre utilise plus tard pour un niveau intermediaire.',
      'Peut couvrir certaines validations achat selon les controles backend.',
    ],
    limits: [
      'La sidebar actuelle ne donne pas un parcours complet au manager.',
      'Formation boutique non recommandee avec ce role pour le moment.',
    ],
    workflows: [
      {
        title: 'Utilisation recommandee',
        steps: [
          'Garder le role en reserve.',
          'Former les responsables avec le role ADMIN.',
          'Documenter le besoin exact avant de finaliser un parcours manager.',
        ],
      },
    ],
    alerts: [
      'Role a eviter pendant la premiere installation boutique.',
      'A clarifier avant ouverture a un utilisateur reel.',
    ],
  },
};

export const workflowMap = [
  { label: 'Vendeur', detail: 'prepare le panier' },
  { label: 'Bon', detail: 'attend le caissier' },
  { label: 'Caissier', detail: 'verifie et encaisse' },
  { label: 'Facture', detail: 'ticket ou facture imprimee' },
];

export const mobileInstallSteps = [
  'Ouvrir ce site dans Chrome sur le telephone ou la tablette.',
  "Toucher le bouton \"Installer l'application\" affiche sur l'ecran de connexion (ou le menu ⋮ de Chrome > \"Ajouter a l'ecran d'accueil\" si le bouton n'apparait pas).",
  "Ouvrir l'application depuis son icone sur l'ecran d'accueil, comme une app normale.",
  'Mettre a jour Chrome via le Play Store si la version est ancienne (Android 5 ou 6).',
];

export const installChecklist = [
  'Creer au moins un compte SUPER_ADMIN.',
  'Creer les comptes ADMIN, VENDEUR et CAISSIER.',
  'Tester une connexion mot de passe.',
  'Tester un PIN vendeur et un PIN caissier.',
  'Verifier produits, prix et stocks.',
  'Faire une vente test vendeur vers caissier.',
  'Encaisser la vente test.',
  'Imprimer un ticket et une facture.',
  'Tester une proforma.',
  'Tester une vente a credit avec client de test.',
  'Fermer et controler la caisse du jour.',
];

export const troubleshootingItems: TroubleshootingItem[] = [
  {
    problem: "L'utilisateur ne voit pas un menu",
    cause: "Son role n'a pas la permission",
    action: "Verifier le role depuis Employes ou Comptes Admin.",
  },
  {
    problem: 'Le PIN ne marche pas',
    cause: 'Mauvais identifiant, PIN absent ou compte non boutique',
    action: 'Reconfigurer le PIN et verifier que le role est VENDEUR ou CAISSIER.',
  },
  {
    problem: 'Le mot de passe ne marche pas',
    cause: 'Compte PIN seulement ou mot de passe incorrect',
    action: 'Reinitialiser l acces depuis un compte SUPER_ADMIN.',
  },
  {
    problem: 'Le caissier ne voit aucun ticket',
    cause: 'Aucun bon envoye ou caisse non ouverte',
    action: 'Verifier Vente en cours puis Caisse du jour.',
  },
  {
    problem: 'Vente a credit impossible',
    cause: 'Aucun client enregistre selectionne',
    action: 'Creer ou selectionner une fiche client avant encaissement.',
  },
  {
    problem: 'Equivalence vide',
    cause: 'Produit hors catalogue ou recherche trop vague',
    action: 'Rechercher par code, marque ou famille, sinon signaler le manque au responsable.',
  },
  {
    problem: 'Facture virtuelle bloquee',
    cause: 'En attente d approbation',
    action: 'Demander au SUPER_ADMIN d approuver ou refuser la demande.',
  },
];

export const menuMatrix = [
  { menu: 'Tableau de bord', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { menu: 'Analyses', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { menu: 'Caisse du jour', roles: ['SUPER_ADMIN', 'ADMIN', 'CAISSIER'] },
  { menu: 'Caisse globale', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { menu: 'Credits clients', roles: ['SUPER_ADMIN', 'ADMIN', 'CAISSIER'] },
  { menu: 'Vente en cours', roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEUR'] },
  { menu: 'Mes tickets', roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEUR'] },
  { menu: 'Commandes en ligne', roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEUR'] },
  { menu: 'Produits', roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEUR', 'CAISSIER', 'MANAGER'] },
  { menu: 'Stock et inventaire', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { menu: 'Achats', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { menu: 'Employes', roles: ['SUPER_ADMIN'] },
  { menu: 'Roles', roles: ['SUPER_ADMIN'] },
  { menu: 'Parametres', roles: ['SUPER_ADMIN'] },
];

