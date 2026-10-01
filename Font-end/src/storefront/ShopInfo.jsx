import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Search,
  Play,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { renderBoldText } from "../utils/renderBoldText";
import { Crumbs, Modal, Photo } from "./Elements";
import Footer from "./Footer";
import team from "./teamData.json";
import { shopContact as shop } from "./shopContact";
import "./shop-info.css";

const videos = [
  "20260325_133312",
  "20260325_133448",
  "20260325_133526",
  "20260325_133601",
  "20260325_133751",
];

export default function ShopInfo() {
  const { pathname } = useLocation();
  if (pathname === "/about") return <AboutShop />;
  if (pathname === "/contact") return <ContactShop />;
  if (pathname === "/terms" || pathname === "/privacy")
    return <LegalPage privacy={pathname === "/privacy"} />;
  return <MissingPage />;
}
function Meta({ title, description, path, noindex = false }) {
  return (
    <Helmet>
      <title>{title} — X-Electronic / NEWOTEG</title>
      <meta name="description" content={description} />
      {path && <link rel="canonical" href={`https://newoteg.com${path}`} />}
      {noindex && <meta name="robots" content="noindex, follow" />}
    </Helmet>
  );
}
function AboutShop() {
  const { lang, t } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [media, setMedia] = useState(null);
  return (
    <>
      <Meta
        title={tr("Notre histoire", "Our story")}
        description={tr(
          "X-Electronic, la boutique électronique de NEWOTEG à Akwa, Douala. Notre histoire, notre équipe et nos services.",
          "X-Electronic, the NEWOTEG electronics shop in Akwa, Douala. Our history, team and services.",
        )}
        path="/about"
      />
      <div className="e-wrap e-info-page">
        <Crumbs title={tr("À propos", "About")} />
        <section className="e-about-opening">
          <div>
            <h1>
              {tr(
                "X-Electronic, une histoire qui continue.",
                "X-Electronic, a story that continues.",
              )}
            </h1>
            <p className="e-info-intro">
              {tr(
                "La boutique électronique de NEWOTEG, à vos côtés à Douala.",
                "The NEWOTEG electronics shop, here for you in Douala.",
              )}
            </p>
            <p>
              {tr(
                "Vous nous connaissez sous le nom X-Electronic ? Vous êtes au bon endroit. Cette identité historique reste celle de l’activité de distribution électronique de NEWOTEG.",
                "Know us as X-Electronic? You are in the right place. This historic identity remains the name of NEWOTEG’s electronics distribution activity.",
              )}
            </p>
            <Link className="e-btn" to="/catalogue">
              {tr("Explorer la boutique", "Explore the shop")}
              <ArrowRight size={18} />
            </Link>
          </div>
          <figure>
            <button
              className="e-about-photo"
              onClick={() =>
                setMedia({
                  src: "/images/7.jpeg",
                  title: tr("La boutique à Akwa", "Our shop in Akwa"),
                })
              }
              aria-label={tr(
                "Agrandir la photo de la boutique",
                "Enlarge shop photo",
              )}
            >
              <img
                src="/images/7.jpeg"
                alt={tr(
                  "La façade NEWOTEG et son enseigne électronique à Akwa",
                  "The NEWOTEG shop front in Akwa",
                )}
              />
            </button>
            <figcaption>
              <MapPin size={16} />
              Akwa, Camp Yabassi · Douala
            </figcaption>
          </figure>
        </section>
        <section className="e-about-story">
          <div>
            <span className="e-story-year">2011</span>
            <h2>{tr("Le début de l’aventure", "Where it started")}</h2>
            <p>
              {tr(
                "Fondée par Jude FOGUENG, l’activité s’est développée autour de la maintenance audiovisuelle et informatique, puis de la distribution de composants et d’équipements électroniques.",
                "Founded by Jude FOGUENG, the business grew from audiovisual and computer maintenance into the distribution of electronic components and equipment.",
              )}
            </p>
            <p>
              {tr(
                "NEWOTEG regroupe aujourd’hui plusieurs activités. X-Electronic reste votre repère pour les pièces, câbles, accessoires et produits électroniques.",
                "NEWOTEG now brings together several activities. X-Electronic remains your destination for parts, cables, accessories and electronics.",
              )}
            </p>
          </div>
          <figure className="e-founder">
            <Photo
              product={{
                image: "/images/img-equipe/1.webp",
                model: "Jude FOGUENG",
              }}
            />
            <figcaption>
              <strong>Jude FOGUENG</strong>
              <span>{t("about.roleFounder")}</span>
            </figcaption>
          </figure>
        </section>
        <section className="e-about-services">
          <h2>
            {tr("De la référence au projet", "From the part to your project")}
          </h2>
          <div>
            {[
              [
                "/catalogue",
                tr("Trouver votre pièce", "Find your part"),
                tr(
                  "Composants, connectique, alimentation et outillage : partez de votre référence ou explorez les familles.",
                  "Components, connectors, power supplies and tools: search by reference or explore product families.",
                ),
              ],
              [
                "/equivalences",
                tr("Chercher une alternative", "Find an alternative"),
                tr(
                  "Une référence absente ou indisponible ? Recherchez des équivalents parmi les articles de notre catalogue et vérifiez les critères de compatibilité.",
                  "A missing or unavailable reference? Search for alternatives in our catalogue and check their compatibility criteria.",
                ),
              ],
              [
                "/contact",
                tr("Parler à la boutique", "Talk to the shop"),
                tr(
                  "Un connecteur à identifier, une quantité à commander, un doute sur votre choix : expliquez-nous votre besoin.",
                  "Need to identify a connector, order a quantity or check your choice? Tell us what you need.",
                ),
              ],
            ].map(([url, title, body]) => (
              <article key={url}>
                <h3>
                  <Link to={url}>
                    {title}
                    <ArrowRight size={18} />
                  </Link>
                </h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <details className="e-info-details">
          <summary>
            {tr("Rencontrer l’équipe NEWOTEG", "Meet the NEWOTEG team")}
          </summary>
          <div className="e-team-list">
            {team.map((person) => (
              <article key={person.name}>
                <Photo product={{ image: person.image, model: person.name }} />
                <div>
                  <h3>{person.name}</h3>
                  <p>{t(person.role)}</p>
                </div>
              </article>
            ))}
          </div>
        </details>
        <details className="e-info-details">
          <summary>
            {tr("La vie de la boutique en images", "A look inside the shop")}
          </summary>
          <div className="e-shop-media">
            <button
              onClick={() =>
                setMedia({
                  src: "/images/about2.webp",
                  title: tr("À l’intérieur de la boutique", "Inside the shop"),
                })
              }
            >
              <img
                src="/images/about2.webp"
                alt={tr(
                  "Le comptoir et les rangements de composants",
                  "The counter and component storage",
                )}
              />
              <span>{tr("Voir la photo", "View photo")}</span>
            </button>
            <div>
              <h3>{tr("Nos vidéos", "Our videos")}</h3>
              {videos.map((name, index) => (
                <button
                  key={name}
                  onClick={() =>
                    setMedia({
                      src: `/videos/${name}.mp4`,
                      video: true,
                      title: tr(
                        `Vidéo de la boutique ${index + 1}`,
                        `Shop video ${index + 1}`,
                      ),
                    })
                  }
                >
                  <Play size={18} />
                  {tr(
                    `Vidéo de la boutique ${index + 1}`,
                    `Shop video ${index + 1}`,
                  )}
                </button>
              ))}
            </div>
          </div>
        </details>
        <section className="e-shop-visit">
          <div>
            <h2>{tr("Retrouvons-nous à Akwa", "Visit us in Akwa")}</h2>
            <p>
              {tr(
                "Camp Yabassi, Douala. Contactez-nous pour préparer votre visite ou votre retrait.",
                "Camp Yabassi, Douala. Contact us to arrange a visit or collection.",
              )}
            </p>
          </div>
          <Link className="e-btn e-secondary" to="/contact">
            {tr("Coordonnées et horaires", "Contact details and hours")}
          </Link>
        </section>
      </div>
      <Modal
        open={Boolean(media)}
        onClose={() => setMedia(null)}
        title={media?.title || ""}
      >
        {media &&
          (media.video ? (
            <video
              key={media.src}
              src={media.src}
              controls
              playsInline
              preload="metadata"
              className="e-media-view"
            />
          ) : (
            <img src={media.src} alt={media.title} className="e-media-view" />
          ))}
      </Modal>
      <Footer />
    </>
  );
}
function ContactShop() {
  const { lang, t } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [draft, setDraft] = useState(null);
  const preview = useRef();
  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setDraft(null);
  };
  function prepare(e) {
    e.preventDefault();
    const body = `${form.message.trim()}\n\n${form.name.trim()}\n${form.email.trim()}`;
    setDraft({ body, subject: form.subject.trim() });
    requestAnimationFrame(() => preview.current?.focus());
  }
  const title = tr("Parlons de votre projet", "Let’s talk about your project");
  return (
    <>
      <Meta
        title={tr("Contact", "Contact")}
        description={tr(
          "Contactez la boutique NEWOTEG / X-Electronic à Akwa, Douala : téléphone, WhatsApp, e-mail et horaires.",
          "Contact NEWOTEG / X-Electronic in Akwa, Douala: phone, WhatsApp, email and opening hours.",
        )}
        path="/contact"
      />
      <div className="e-wrap e-info-page">
        <Crumbs title="Contact" />
        <div className="e-page-lead">
          <h1>{title}</h1>
          <p>
            {tr(
              "Une référence, un devis, un conseil : notre équipe vous accompagne.",
              "A product, a quote, some advice: our team can help.",
            )}
          </p>
        </div>
        <div className="e-contact-layout">
          <section className="e-contact-direct">
            <h2>{tr("La boutique en direct", "Contact the shop")}</h2>
            <a
              className="e-contact-whatsapp"
              href={shop.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={28} />
              <span>
                <strong>
                  {tr("Écrire sur WhatsApp", "Write on WhatsApp")}
                </strong>
                <small>+237 699 966 160</small>
              </span>
              <ArrowRight size={20} />
            </a>
            <a className="e-contact-call" href={`tel:${shop.phone}`}>
              <Phone size={24} />
              <span>
                <strong>{tr("Appeler la boutique", "Call the shop")}</strong>
                <small>+237 699 966 160</small>
              </span>
            </a>
            <p className="e-second-phone">
              {tr("Autre ligne :", "Other number:")}{" "}
              <a href="tel:+237670478228">+237 670 478 228</a>
            </p>
            <a className="e-contact-email" href={`mailto:${shop.email}`}>
              <Mail size={20} />
              {shop.email}
            </a>
            <div className="e-contact-address">
              <h3>{tr("Passez nous voir", "Visit us")}</h3>
              <p>
                {t("contact.hqTitle")}
                <br />
                <strong>{t("contact.hqAddress")}</strong>
              </p>
              <p>
                {t("contact.logisticsTitle")}
                <br />
                {t("contact.logisticsAddress")}
              </p>
              <a href={shop.maps} target="_blank" rel="noopener noreferrer">
                {tr("Ouvrir dans Google Maps", "Open in Google Maps")}
                <ExternalLink size={15} />
              </a>
            </div>
            <div className="e-contact-hours">
              <h3>{tr("Horaires d’ouverture", "Opening hours")}</h3>
              <p>{t("contact.hoursDetail")}</p>
            </div>
            <Link to="/livraison">
              {tr(
                "Livraison et retrait en boutique",
                "Delivery and shop pickup",
              )}
            </Link>
          </section>
          <section className="e-contact-compose">
            <h2>
              {tr("Expliquez-nous votre besoin", "Tell us what you need")}
            </h2>
            <p>
              {tr(
                "Préparez votre e-mail ici, puis envoyez-le depuis votre messagerie.",
                "Prepare your email here, then send it from your email app.",
              )}
            </p>
            <form className="e-form" onSubmit={prepare}>
              <div className="e-field-grid">
                <label className="e-field">
                  {tr("Votre nom", "Your name")}
                  <input
                    name="name"
                    value={form.name}
                    onChange={change}
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
                <label className="e-field">
                  {tr("Votre e-mail", "Your email")}
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={change}
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
              </div>
              <label className="e-field">
                {tr("Sujet", "Subject")}
                <input
                  name="subject"
                  value={form.subject}
                  onChange={change}
                  required
                  maxLength={120}
                />
              </label>
              <label className="e-field">
                {tr("Votre message", "Your message")}
                <textarea
                  name="message"
                  value={form.message}
                  onChange={change}
                  required
                  maxLength={1500}
                  rows={6}
                  placeholder={tr(
                    "Référence, quantité, utilisation prévue…",
                    "Reference, quantity, intended use…",
                  )}
                />
              </label>
              <button className="e-btn" type="submit">
                {tr("Préparer mon e-mail", "Prepare my email")}
                <ArrowRight size={18} />
              </button>
              <p className="e-contact-privacy">
                <Link to="/privacy">
                  {tr(
                    "Confidentialité de vos informations",
                    "Privacy of your information",
                  )}
                </Link>
              </p>
            </form>
            {draft && (
              <section
                className="e-contact-draft"
                ref={preview}
                tabIndex={-1}
                aria-label={tr("E-mail préparé", "Prepared email")}
              >
                <h3>
                  {tr(
                    "Votre e-mail est prêt à être ouvert",
                    "Your email is ready to open",
                  )}
                </h3>
                <p>
                  {tr(
                    "Il n’a pas encore été envoyé. L’envoi se fait depuis votre messagerie.",
                    "It has not been sent. Send it from your email app.",
                  )}
                </p>
                <strong>{draft.subject}</strong>
                <pre>{draft.body}</pre>
                <a
                  className="e-btn"
                  href={`mailto:${shop.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
                >
                  {tr("Ouvrir ma messagerie", "Open my email app")}
                </a>
                <p>
                  {tr(
                    "Si rien ne s’ouvre, copiez le message ci-dessus et adressez-le à",
                    "If nothing opens, copy the message above and send it to",
                  )}{" "}
                  {shop.email}.
                </p>
              </section>
            )}
          </section>
        </div>
        <div className="e-contact-help">
          <h2>
            {tr("Une réponse déjà disponible ?", "Looking for a quick answer?")}
          </h2>
          <div>
            <Link to="/faq">
              {tr("Questions fréquentes", "Frequently asked questions")}
            </Link>
            <Link to="/commandes">
              {tr("Suivre ma commande", "Track my order")}
            </Link>
            <Link to="/equivalences">
              {tr("Trouver un équivalent", "Find an equivalent")}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
function LegalPage({ privacy }) {
  const { lang, t } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const prefix = privacy ? "privacy" : "terms";
  const counts = privacy ? { 2: 4, 3: 4, 6: 4, 8: 3 } : { 1: 4, 8: 3 };
  const sections = Array.from({ length: 8 }, (_, index) => index + 1);
  return (
    <>
      <Meta
        title={t(`${prefix}.title`)}
        description={
          privacy
            ? tr(
                "Consultez la politique de confidentialité de NEWOTEG.",
                "Read NEWOTEG’s privacy policy.",
              )
            : tr(
                "Consultez les conditions générales d’utilisation du site NEWOTEG.",
                "Read the terms of use of the NEWOTEG website.",
              )
        }
        path={`/${prefix}`}
      />
      <div className="e-wrap e-info-page">
        <Crumbs
          title={
            privacy
              ? tr("Confidentialité", "Privacy")
              : tr("Conditions d’utilisation", "Terms of use")
          }
        />
        <div className="e-page-lead">
          <h1>{t(`${prefix}.title`)}</h1>
          <p>NEWOTEG SARL · X-Electronic</p>
        </div>
        <div className="e-legal-layout">
          <nav
            aria-label={tr("Sommaire du document", "Document contents")}
            className="e-legal-toc"
          >
            <strong>{tr("Dans ce document", "In this document")}</strong>
            {sections.map((i) => (
              <a key={i} href={`#${prefix}-${i}`}>
                {t(`${prefix}.s${i}Title`)}
              </a>
            ))}
            <Link to={privacy ? "/terms" : "/privacy"}>
              {privacy
                ? tr("Conditions d’utilisation", "Terms of use")
                : tr("Politique de confidentialité", "Privacy policy")}
            </Link>
          </nav>
          <article className="e-legal-text">
            {sections.map((i) => (
              <section id={`${prefix}-${i}`} key={i}>
                <h2>{t(`${prefix}.s${i}Title`)}</h2>
                <p>{renderBoldText(t(`${prefix}.s${i}P1`))}</p>
                {counts[i] && (
                  <ul>
                    {Array.from({ length: counts[i] }, (_, j) => (
                      <li key={j}>
                        {renderBoldText(t(`${prefix}.s${i}L${j + 1}`))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <div className="e-legal-contact">
              <h2>{tr("Une question ?", "Any questions?")}</h2>
              <Link to="/contact">
                {tr("Contacter NEWOTEG", "Contact NEWOTEG")}
              </Link>
              <a href={`mailto:${shop.email}`}>{shop.email}</a>
            </div>
          </article>
        </div>
      </div>
      <Footer />
    </>
  );
}
function MissingPage() {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  return (
    <>
      <Meta
        title={tr("Page introuvable", "Page not found")}
        description={tr(
          "Retrouvez votre référence dans le catalogue X-Electronic.",
          "Find your product in the X-Electronic catalogue.",
        )}
        noindex
      />
      <div className="e-wrap e-missing-page">
        <div className="e-missing-code" aria-hidden="true">
          404
        </div>
        <section>
          <h1>
            {tr("Cette page est introuvable.", "This page could not be found.")}
          </h1>
          <p>
            {tr(
              "Le lien a peut-être changé. Retrouvez votre référence ou repartez du catalogue.",
              "The link may have changed. Search for your product or return to the catalogue.",
            )}
          </p>
          <form
            role="search"
            aria-label={tr("Retrouver un produit", "Find a product")}
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                "/catalogue" +
                  (query.trim()
                    ? "?search=" + encodeURIComponent(query.trim())
                    : ""),
              );
            }}
          >
            <label className="e-field">
              {tr("Rechercher une référence", "Search for a reference")}
              <span className="e-missing-search">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={255}
                />
                <button
                  className="e-btn"
                  aria-label={tr(
                    "Rechercher dans le catalogue",
                    "Search catalogue",
                  )}
                >
                  <Search size={20} />
                </button>
              </span>
            </label>
          </form>
          <div className="e-actions">
            <Link className="e-btn" to="/catalogue">
              {tr("Voir le catalogue", "View catalogue")}
            </Link>
            <Link to="/">{tr("Retour à l’accueil", "Back to home")}</Link>
          </div>
          <p className="e-missing-equivalence">
            {tr(
              "Votre pièce est difficile à trouver ?",
              "Having trouble finding your part?",
            )}{" "}
            <Link to="/equivalences">
              {tr("Chercher un équivalent", "Find an equivalent")}
            </Link>
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
}
