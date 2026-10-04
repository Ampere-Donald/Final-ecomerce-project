export const SITE_ORIGIN = "https://newoteg.com";
const privatePath =
  /^\/(?:panier|checkout|suivi-invite|mes-devis|commandes|profile|favourites|login|signup|forgot-password)(?:\/|$)/i;
export const isPrivateDocument = (pathname) => privatePath.test(pathname);
const pages = {
  "/": [
    "La boutique électronique de NEWOTEG",
    "NEWOTEG's electronics shop",
    "Composants, câbles, alimentation et outillage à Douala. Trouvez votre référence ou demandez conseil à la boutique de NEWOTEG.",
    "Components, cables, power supplies and tools in Douala. Find your reference or ask NEWOTEG's shop for advice.",
  ],
  "/catalogue": [
    "Catalogue",
    "Catalogue",
    "Trouvez une référence électronique et comparez ses caractéristiques, son prix et sa disponibilité chez X-Electronic.",
    "Find an electronic reference and compare its specifications, price and availability at X-Electronic.",
  ],
  "/projets": [
    "Projets et matériel",
    "Projects and materials",
    "Préparez votre sélection de matériel à partir des projets publiés par la boutique NEWOTEG.",
    "Prepare a materials selection from projects published by NEWOTEG's shop.",
  ],
  "/offres": [
    "Offres",
    "Offers",
    "Consultez les offres actuellement publiées, leurs prix et leurs conditions chez X-Electronic.",
    "Explore currently published offers, prices and conditions at X-Electronic.",
  ],
  "/arrivages": [
    "Arrivages",
    "Arrivals",
    "Découvrez les références récemment ajoutées au catalogue de X-Electronic.",
    "Discover references recently added to X-Electronic's catalogue.",
  ],
  "/equivalences": [
    "Trouver un équivalent",
    "Find an equivalent",
    "Cherchez une alternative parmi les composants du catalogue NEWOTEG et examinez ses caractéristiques et limites avant de choisir.",
    "Look for an alternative among NEWOTEG catalogue components and check its specifications and limitations before choosing.",
  ],
  "/guides": [
    "Guides et conseils",
    "Guides and advice",
    "Des repères pour choisir vos composants, préparer votre montage et demander un conseil à la boutique.",
    "Guidance for choosing components, preparing your circuit and asking the shop for advice.",
  ],
  "/faq": [
    "Questions fréquentes",
    "Frequently asked questions",
    "Retrouvez les informations sur les commandes, la réception et l'accompagnement chez X-Electronic.",
    "Find information about orders, reception and support at X-Electronic.",
  ],
  "/livraison": [
    "Livraison et retrait",
    "Delivery and pickup",
    "Retrait à Akwa après confirmation de disponibilité. Pour la livraison, frais et délai à confirmer pour votre commande.",
    "Pickup in Akwa after availability confirmation. Delivery fees and timing must be confirmed for your order.",
  ],
  "/about": [
    "À propos de NEWOTEG",
    "About NEWOTEG",
    "Découvrez NEWOTEG et sa boutique X-Electronic à Douala, au service de vos projets électroniques.",
    "Discover NEWOTEG and its X-Electronic shop in Douala, supporting your electronic projects.",
  ],
  "/contact": [
    "Contact et conseil",
    "Contact and advice",
    "Contactez la boutique X-Electronic à Akwa, Douala, pour une référence, un devis ou un conseil.",
    "Contact X-Electronic's shop in Akwa, Douala, for a reference, quote or advice.",
  ],
  "/terms": [
    "Conditions",
    "Terms",
    "Consultez les conditions et les informations à faire confirmer par la boutique avant votre commande.",
    "Read the terms and information to confirm with the shop before ordering.",
  ],
  "/privacy": [
    "Confidentialité",
    "Privacy",
    "Informations sur les données utilisées pour les comptes, commandes et demandes adressées à X-Electronic.",
    "Information about data used for accounts, orders and requests made to X-Electronic.",
  ],
  "/devis": [
    "Demander un devis",
    "Request a quote",
    "Préparez une liste de références et de quantités pour demander une proposition à la boutique NEWOTEG.",
    "Prepare a list of references and quantities to request a proposal from NEWOTEG's shop.",
  ],
};
const privateTitles = {
  panier: ["Votre panier", "Your cart"],
  checkout: ["Votre commande", "Your order"],
  "suivi-invite": ["Suivi privé de commande", "Private order tracking"],
  "mes-devis": ["Mes devis", "My quotes"],
  commandes: ["Mes commandes", "My orders"],
  profile: ["Mon compte", "My account"],
  favourites: ["Mes favoris", "My favourites"],
  login: ["Connexion", "Sign in"],
  signup: ["Créer un compte", "Create an account"],
  "forgot-password": ["Retrouver mon accès", "Recover my access"],
};
export function pageMetadata(pathname, search = "", lang = "fr") {
  const english = lang === "en",
    index = english ? 1 : 0;
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (isPrivateDocument(normalized))
    return {
      title: `${privateTitles[normalized.split("/")[1].toLowerCase()][index]} — X-Electronic`,
      description: english
        ? "Your private space at X-Electronic, NEWOTEG's shop."
        : "Votre espace personnel chez X-Electronic, la boutique de NEWOTEG.",
      canonical: null,
      robots: "noindex, nofollow",
      private: true,
    };
  let entry = pages[normalized];
  if (!entry && /^\/product\/[^/]+$/.test(normalized))
    entry = [
      "Fiche produit",
      "Product details",
      "Caractéristiques, prix et disponibilité d'une référence du catalogue X-Electronic.",
      "Specifications, price and availability of a reference in X-Electronic's catalogue.",
    ];
  if (!entry && /^\/projets\/[^/]+$/.test(normalized))
    entry = [
      "Projet et matériel",
      "Project and materials",
      "Examinez le matériel et les contraintes du projet avant de préparer votre sélection.",
      "Check the project's materials and constraints before preparing your selection.",
    ];
  if (!entry || normalized === "/comparer")
    return {
      title: `${normalized === "/comparer" ? (english ? "Compare products" : "Comparer les produits") : english ? "Page not found" : "Page introuvable"} — X-Electronic`,
      description: english
        ? "Find your reference in X-Electronic's catalogue."
        : "Retrouvez votre référence dans le catalogue X-Electronic.",
      canonical: null,
      robots: "noindex, follow",
      private: false,
    };
  const params = new URLSearchParams(search);
  const filtered =
    (normalized === "/catalogue" &&
      [...params.keys()].some((key) => key !== "page")) ||
    (normalized === "/equivalences" && Boolean(search));
  const page = params.get("page");
  const pagination =
    ["/catalogue", "/projets"].includes(normalized) &&
    /^\d+$/.test(page || "") &&
    Number(page) > 1;
  return {
    title: `${entry[index]} — X-Electronic`,
    description: entry[index + 2],
    canonical:
      SITE_ORIGIN +
      normalized +
      (pagination && ![...params.keys()].some((k) => k !== "page")
        ? `?page=${Number(page)}`
        : ""),
    robots: filtered ? "noindex, follow" : "index, follow",
    private: false,
  };
}
