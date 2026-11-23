import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { titleOf } from "./projectPresentation";

const subscribeToPrintTarget = () => () => {};
const getPrintTarget = () => document.body;
const getServerPrintTarget = () => null;

export default function ProjectMaterialPrint({ project, rows, choices, groups, disabled }) {
  const { lang } = useI18n();
  const printTarget = useSyncExternalStore(
    subscribeToPrintTarget, getPrintTarget, getServerPrintTarget,
  );
  const tr = (fr, en) => (lang === "en" ? en : fr);

  const selected = rows.filter((row) => choices[row.id]?.selected);
  const excluded = rows.filter(
    (row) => row.necessaire && !choices[row.id]?.selected && row.reason !== "removed",
  );
  const quantityOf = (row) => Number(choices[row.id]?.quantity);
  const canPrint =
    !disabled &&
    selected.length > 0 &&
    selected.every((row) => {
      const quantity = quantityOf(row);
      return row.reason !== "removed" && /^\d+$/.test(choices[row.id]?.quantity) &&
        Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 10000;
    });
  const formatQuantity = new Intl.NumberFormat(lang === "en" ? "en" : "fr");
  const nameOf = (row) =>
    (lang === "en" && row.product?.englishName) || row.product?.model || row.nomAttendu;
  const referenceOf = (row) =>
    row.product?.reference || row.referenceAttendue || tr("À confirmer", "To confirm");

  return (
    <div className="e-project-print-action">
      <button
        type="button"
        className="e-btn e-secondary"
        disabled={!printTarget || !canPrint}
        onClick={() => window.print()}
      >
        <Printer size={17} aria-hidden="true" />
        {tr("Imprimer la liste de matériel", "Print material list")}
      </button>
      {!canPrint && !disabled && (
        <small>{tr(
          "Sélectionnez au moins une pièce et vérifiez les quantités avant d’imprimer.",
          "Select at least one part and check quantities before printing.",
        )}</small>
      )}
      {printTarget && canPrint && createPortal(
        <article className="e-project-print-sheet" lang={lang}>
          <header>
            <p>NEWOTEG · X-Electronic</p>
            <h1>{tr("Liste de matériel", "Material list")}</h1>
            <h2>{titleOf(project, lang)}</h2>
            <p>{tr("Nombre de groupes pris en compte", "Number of groups accounted for")} · {groups}</p>
          </header>
          <table>
            <thead>
              <tr>
                <th scope="col">{tr("Référence", "Reference")}</th>
                <th scope="col">{tr("Article et rôle", "Item and role")}</th>
                <th scope="col">{tr("Besoin", "Use")}</th>
                <th scope="col">{tr("Quantité totale", "Total quantity")}</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((row) => (
                <tr key={row.id}>
                  <td>{referenceOf(row)}</td>
                  <td><strong>{nameOf(row)}</strong><br />{row.role}</td>
                  <td>{row.necessaire ? tr("Nécessaire", "Required") : tr("Facultatif", "Optional")}</td>
                  <td>{formatQuantity.format(quantityOf(row))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {excluded.length > 0 && (
            <section>
              <h3>{tr("Pièces nécessaires hors sélection", "Required parts outside this selection")}</h3>
              <ul>{excluded.map((row) => <li key={row.id}>{referenceOf(row)} · {nameOf(row)}</li>)}</ul>
            </section>
          )}
          <section>
            <h3>{tr("À prévoir au laboratoire", "Lab preparations")}</h3>
            <p lang="fr">{project.prerequis}</p>
            <p lang="fr">{project.contraintes}</p>
          </section>
          <footer>
            <p>{tr(
              "Quantités choisies pour la préparation. Disponibilité à vérifier auprès de la boutique.",
              "Quantities selected for planning. Check availability with the shop.",
            )}</p>
            <p>newoteg.com/projets/{project.slug}</p>
          </footer>
        </article>,
        printTarget,
      )}
    </div>
  );
}
