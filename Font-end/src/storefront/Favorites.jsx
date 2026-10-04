import { Link } from "react-router-dom";
import PageMeta from "./PageMeta";
import { useFavorites } from "../context/FavoritesContext";
import { useI18n } from "../context/I18nContext";
import { resolveImageUrl } from "../utils/mapProduct";
import { adaptProduct } from "./productData";
import useResource from "./useResource";
import { Copy, Card, Crumbs } from "./Elements";
import Footer from "./Footer";

function SavedProduct({ saved }) {
  const resource = useResource("/produits/" + encodeURIComponent(saved.id));
  const { toggleFavorite } = useFavorites();
  if (resource.data)
    return <Card product={adaptProduct(resource.data, resolveImageUrl)} />;
  return (
    <article className="e-state">
      <h2>{saved.model}</h2>
      {resource.loading ? (
        <p role="status">
          <Copy
            fr="Vérification de la référence…"
            en="Checking product details…"
          />
        </p>
      ) : (
        <>
          <p>
            <Copy
              fr="Cette référence ne peut pas être vérifiée pour le moment."
              en="This product cannot be checked at the moment."
            />
          </p>
          <button className="e-btn e-secondary" onClick={resource.retry}>
            <Copy fr="Réessayer" en="Try again" />
          </button>
        </>
      )}
      <button className="e-text-button" onClick={() => toggleFavorite(saved)}>
        <Copy fr="Retirer des favoris" en="Remove from favourites" />
      </button>
    </article>
  );
}

export default function Favorites() {
  const { favorites } = useFavorites();
  const { lang } = useI18n();
  return (
    <>
      <PageMeta />
      <div className="e-wrap e-catalogue">
        <Crumbs title={lang === "fr" ? "Favoris" : "Favourites"} />
        <div className="e-page-lead">
          <h1>
            <Copy fr="Vos références de côté" en="Your saved products" />
          </h1>
          <p>
            <Copy
              fr="Retrouvez vos sélections avec les informations actuelles de la boutique."
              en="Find your saved products with the shop’s current information."
            />
          </p>
        </div>
        {favorites.length ? (
          <div className="e-product-grid e-catalog-grid">
            {favorites.map((saved) => (
              <SavedProduct key={saved.id} saved={saved} />
            ))}
          </div>
        ) : (
          <div className="e-state">
            <h2>
              <Copy
                fr="Aucune référence enregistrée"
                en="No saved products yet"
              />
            </h2>
            <p>
              <Copy
                fr="Utilisez le cœur sur une fiche pour la retrouver ici."
                en="Use the heart on a product to find it here later."
              />
            </p>
            <Link to="/catalogue" className="e-btn">
              <Copy fr="Parcourir le catalogue" en="Browse the catalogue" />
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
