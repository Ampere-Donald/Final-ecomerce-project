import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Copy } from "./Elements";
import useResource from "./useResource";
import { readProjectPage } from "./projectData";
import ProjectListItem from "./ProjectPreview";
import "./projects.css";

export default function ProjectTeaser() {
  const resource = useResource("/projets?page=1&limit=2");
  let rows = [];
  try {
    if (resource.data) rows = readProjectPage(resource.data).rows;
  } catch {
    /* Keep access to the project library if its preview is unavailable. */
  }
  return (
    <section className="e-section e-project-teaser">
      <div className="e-section-head">
        <div>
          <h2>
            <Copy
              fr="Un projet, les pièces pour le réaliser"
              en="A project and the parts to build it"
            />
          </h2>
          <p>
            <Copy
              fr="Objectif, accessoires et quantités, réunis dans une liste préparée par la boutique."
              en="Purpose, accessories and quantities, together in a list prepared by the shop."
            />
          </p>
        </div>
        <Link to="/projets">
          <Copy fr="Voir les projets" en="View projects" />{" "}
          <ArrowRight size={17} />
        </Link>
      </div>
      {rows.length > 0 && (
        <div className="e-projects-list">
          {rows.map((p) => (
            <ProjectListItem key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
