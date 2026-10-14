import { Copy } from "./Elements";
import { useI18n } from "../context/I18nContext";

const labels = {
  DIRECT_DOCUMENTE: [
    "Remplacement direct documenté",
    "Documented direct replacement",
  ],
  ADAPTATION_NECESSAIRE: ["Adaptation nécessaire", "Adaptation required"],
  REFUSE: ["Remplacement refusé", "Replacement rejected"],
  A_CONFIRMER: ["Remplacement à confirmer", "Replacement needs confirmation"],
};
export default function ReplacementDecision({ dossier, onUseScope }) {
  const { lang } = useI18n();
  const applicable = dossier.correspondAuMontage;
  return (
    <section
      className={`e-replacement-decision e-replacement-decision--${dossier.verdict.toLowerCase()}`}
    >
      <h4>{labels[dossier.verdict][lang === "en" ? 1 : 0]}</h4>
      <p className="e-replacement-scope-state">
        <Copy
          fr={
            applicable
              ? "Dossier relu pour le montage indiqué."
              : "Dossier relu pour l’usage ci-dessous. Son application à votre montage reste à vérifier."
          }
          en={
            applicable
              ? "Reviewed dossier for the circuit you described."
              : "Reviewed dossier for the use below. Its applicability to your circuit still needs checking."
          }
        />
      </p>
      <dl>
        <div>
          <dt>
            <Copy fr="Usage relu" en="Reviewed use" />
          </dt>
          <dd>{dossier.application}</dd>
        </div>
        <div>
          <dt>
            <Copy fr="Motif" en="Reason" />
          </dt>
          <dd>{dossier.justification}</dd>
        </div>
        <div>
          <dt>
            <Copy fr="Limites" en="Limits" />
          </dt>
          <dd>{dossier.limites}</dd>
        </div>
        {dossier.adaptations && (
          <div>
            <dt>
              <Copy fr="Adaptations nécessaires" en="Required adaptations" />
            </dt>
            <dd>{dossier.adaptations}</dd>
          </div>
        )}
      </dl>
      {!applicable && (
        <button
          type="button"
          className="e-text-button e-replacement-use"
          onClick={() => onUseScope(dossier.application)}
        >
          <Copy fr="Rechercher pour cet usage" en="Search for this use" />
        </button>
      )}
      <details>
        <summary>
          <Copy fr="Document et relecture" en="Document and review" />
        </summary>
        <p>
          {dossier.reference} ·{" "}
          {new Date(dossier.reluLe).toLocaleDateString(
            lang === "en" ? "en-GB" : "fr-CM",
          )}
        </p>
        <a href={dossier.source.url} target="_blank" rel="noopener noreferrer">
          {dossier.source.document}
        </a>
        <p>
          {dossier.source.repere}
          {dossier.source.revision && ` · ${dossier.source.revision}`}
        </p>
        <p>
          <Copy
            fr="Cette décision porte sur la référence et l’usage décrits. Si votre montage diffère, demandez conseil avant le remplacement."
            en="This decision concerns the stated reference and use. If your circuit differs, ask for advice before replacing the part."
          />
        </p>
      </details>
    </section>
  );
}
