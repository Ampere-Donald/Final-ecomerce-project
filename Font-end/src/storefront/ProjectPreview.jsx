import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Copy } from "./Elements";
import { levels, titleOf, summaryOf, materialImage } from "./projectPresentation";

export function ProjectVisual({ project }) {
  const image = materialImage(project.imageUrl);
  const [failed, setFailed] = useState("");
  return image && failed !== image ? (
    <img
      src={image}
      alt=""
      width="600"
      height="400"
      loading="lazy"
      onError={() => setFailed(image)}
    />
  ) : (
    <div className="e-project-visual-fallback">
      <FileText size={36} aria-hidden="true" />
      <Copy fr="Liste de matériel" en="Material list" />
    </div>
  );
}
export default function ProjectListItem({ project }) {
  const { lang } = useI18n();
  return (
    <article className="e-project-list-item">
      <Link
        className="e-project-list-visual"
        to={`/projets/${project.slug}`}
        aria-label={titleOf(project, lang)}
      >
        <ProjectVisual project={project} />
      </Link>
      <div>
        <span className="e-project-level">
          <Copy fr={levels[project.niveau][0]} en={levels[project.niveau][1]} />
        </span>
        <h2>
          <Link to={`/projets/${project.slug}`}>{titleOf(project, lang)}</Link>
        </h2>
        <p>{summaryOf(project, lang)}</p>
        <p className="e-project-availability">
          {project.lignes.length} <Copy fr="références" en="references" /> ·{" "}
          <Copy
            fr={
              project.materielRequisDisponible
                ? "Matériel requis disponible"
                : "Certaines pièces sont à vérifier"
            }
            en={
              project.materielRequisDisponible
                ? "Required material available"
                : "Some parts need checking"
            }
          />
        </p>
        <Link className="e-project-open" to={`/projets/${project.slug}`}>
          <Copy fr="Préparer le matériel" en="Prepare the material" />
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
