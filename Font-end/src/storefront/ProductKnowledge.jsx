import { FileText, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import TechnicalSource from "./TechnicalSource";
import {
  designationSpecifications,
  mergeEditorialContent,
} from "./productContent";
import { getProductEditorial } from "./productEditorial.js";
import "./productKnowledge.css";

export function EssentialSpecifications({ rows }) {
  const { lang } = useI18n();
  return rows.length ? (
    <div>
      {rows.some((r) => r.designation) && (
        <small className="e-knowledge-muted">
          {lang === "en"
            ? "Catalogue designation"
            : "Indications de la désignation"}
        </small>
      )}
      <dl className="e-knowledge-essentials">
        {rows.map((r, i) => (
          <div key={i}>
            <dd>{r.value}</dd>
            <dt>{r.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  ) : null;
}
export default function ProductKnowledge({ product, content }) {
  const { lang } = useI18n();
  const c = mergeEditorialContent(
    content,
    getProductEditorial(product, lang)?.[lang],
  );
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const technical = product.technicalAttributes || [];
  const designation = designationSpecifications(product, lang);
  const nav = [
    ["product-presentation", tr("Présentation", "Overview")],
    ...(technical.length || designation.length
      ? [["product-specifications", tr("Caractéristiques", "Specifications")]]
      : []),
    ...(c.integration.length
      ? [["product-integration", tr("Pour votre projet", "For your project")]]
      : []),
    ...(c.replacement.length
      ? [
          [
            "product-replacement",
            tr("Avant remplacement", "Before replacement"),
          ],
        ]
      : []),
    ...(c.documents.length
      ? [["product-documentation", tr("Documentation", "Documentation")]]
      : []),
  ];
  return (
    <section
      className="e-knowledge"
      aria-label={tr(
        "Comprendre et choisir ce produit",
        "Understand and choose this product",
      )}
    >
      <nav
        className="e-knowledge-nav"
        aria-label={tr("Rubriques de la fiche", "Product sections")}
      >
        {nav.map(([id, title]) => (
          <a key={id} href={"#" + id}>
            {title}
          </a>
        ))}
      </nav>
      <div className="e-knowledge-layout">
        <div className="e-knowledge-main">
          <section id="product-presentation">
            <h2>{tr("Comprendre ce produit", "Understand this product")}</h2>
            {c.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {c.applications.length > 0 && (
              <>
                <h3>{tr("Applications et usages", "Applications and uses")}</h3>
                <ul>
                  {c.applications.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {(technical.length > 0 || designation.length > 0) && (
            <section id="product-specifications">
              <h2>
                {tr("Caractéristiques techniques", "Technical specifications")}
              </h2>
              <dl className="e-knowledge-specifications">
                {technical.map((a, i) => (
                  <div key={i}>
                    <dt>{a.technicalLabels?.[lang] || a.label}</dt>
                    <dd>
                      {a.values.map((v, j) => (
                        <div key={j}>
                          {v.value}
                          <TechnicalSource source={v.source} />
                        </div>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              {designation.length > 0 && (
                <>
                  <h3>
                    {tr(
                      "Indications de la désignation",
                      "Catalogue designation",
                    )}
                  </h3>
                  <dl className="e-knowledge-specifications">
                    {designation.map((v, i) => (
                      <div key={i}>
                        <dt>{v.label}</dt>
                        <dd>{v.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="e-knowledge-muted">
                    {tr(
                      "Valeurs reprises de la désignation catalogue ; aucune caractéristique supplémentaire n’est déduite.",
                      "Values from the catalogue designation; no additional specifications are inferred.",
                    )}
                  </p>
                </>
              )}
            </section>
          )}
          {c.integration.length > 0 && (
            <section id="product-integration">
              <h2>
                {tr(
                  "Intégrer ce produit à votre projet",
                  "Integrate this product into your project",
                )}
              </h2>
              {c.integration.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <Link className="e-knowledge-link" to="/projets">
                {tr(
                  "Explorer les projets et leurs listes de matériel",
                  "Explore projects and material lists",
                )}{" "}
                →
              </Link>
            </section>
          )}
          {c.missing.length > 0 && (
            <details className="e-knowledge-missing">
              <summary>
                {tr("Informations à préciser", "Information to confirm")}
              </summary>
              <ul>
                {c.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {(c.replacement.length > 0 || c.documents.length > 0) && (
          <aside className="e-knowledge-side">
            {c.replacement.length > 0 && (
              <section
                className="e-knowledge-checklist"
                id="product-replacement"
              >
                <h2>{tr("Avant remplacement", "Before replacement")}</h2>
                <p className="e-knowledge-muted">
                  {tr("Les points à comparer", "Points to compare")}
                </p>
                <ol>
                  {c.replacement.map((r, i) => (
                    <li key={i}>
                      <span aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p>{r}</p>
                    </li>
                  ))}
                </ol>
                <div className="e-knowledge-help">
                  <h3>
                    {tr(
                      "Besoin d’un avis sur votre pièce ?",
                      "Need advice about your part?",
                    )}
                  </h3>
                  <p>
                    {tr(
                      "Préparez une photo du marquage et la référence de votre carte.",
                      "Prepare a marking photo and your board reference.",
                    )}
                  </p>
                  <Link className="e-btn e-secondary" to="/contact">
                    <MessageCircle size={17} />
                    {tr("Demander un conseil", "Ask for advice")}
                  </Link>
                </div>
              </section>
            )}
            {c.documents.length > 0 && (
              <section
                className="e-knowledge-documents"
                id="product-documentation"
              >
                <h2>
                  <FileText size={22} />
                  {tr("Documentation", "Documentation")}
                </h2>
                <ul>
                  {c.documents.map((d, i) => (
                    <li key={i}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        {d.label} ↗
                      </a>
                      <span className="e-knowledge-muted">
                        {d.scope === "family"
                          ? tr(
                              "Document de famille : vérifier la variante.",
                              "Family document: check the variant.",
                            )
                          : tr(
                              "Document de la référence.",
                              "Reference document.",
                            )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>
      {c.faq.length > 0 && (
        <section className="e-knowledge-faq">
          <h2>{tr("Questions techniques", "Technical questions")}</h2>
          {c.faq.map((q, i) => (
            <details key={i}>
              <summary>{q.question}</summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </section>
      )}
    </section>
  );
}
