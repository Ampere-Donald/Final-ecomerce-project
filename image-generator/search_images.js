const axios = require("axios");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
};

/**
 * Recherche d'images via DuckDuckGo (gratuit, pas de clé API)
 * Retourne l'URL de la première image pertinente trouvée, ou null.
 */
async function searchProductImage(productName, categoryHint) {
  // On construit une requête de recherche intelligente
  const query = `${productName} ${categoryHint} product photo`;
  console.log(`   🔍 Recherche image de référence: "${query}"...`);

  try {
    // Étape 1 : obtenir le token de recherche (vqd) depuis DuckDuckGo
    const searchPageRes = await axios.get("https://duckduckgo.com/", {
      params: { q: query, t: "h_", iax: "images", ia: "images" },
      headers: HEADERS,
      timeout: 15000,
    });

    const vqdMatch = searchPageRes.data.match(/vqd=["']([^"']+)["']/);
    if (!vqdMatch) {
      console.log("   ⚠️  Impossible d'obtenir le token de recherche DuckDuckGo.");
      return null;
    }
    const vqd = vqdMatch[1];

    // Étape 2 : requête JSON pour les résultats images
    const imagesRes = await axios.get("https://duckduckgo.com/i.js", {
      params: {
        l: "wt-wt",
        o: "json",
        q: query,
        vqd: vqd,
        f: ",,,,,",
        p: "1",
      },
      headers: {
        ...HEADERS,
        Referer: "https://duckduckgo.com/",
      },
      timeout: 15000,
    });

    const results = imagesRes.data.results;
    if (!results || results.length === 0) {
      console.log("   ⚠️  Aucun résultat image trouvé.");
      return null;
    }

    // On prend la première image assez grande (pas un favicon minuscule)
    for (const r of results) {
      if (r.image && r.width >= 200 && r.height >= 200) {
        console.log(`   ✅ Référence trouvée: ${r.title || "(sans titre)"} (${r.width}x${r.height})`);
        return r.image; // URL directe vers l'image originale
      }
    }

    // Si aucune image assez grande, on prend la première quand même
    if (results[0] && results[0].image) {
      console.log(`   ✅ Référence trouvée (petite): ${results[0].title || "(sans titre)"}`);
      return results[0].image;
    }

    return null;
  } catch (err) {
    console.log(`   ⚠️  Erreur recherche: ${err.message}`);
    return null;
  }
}

module.exports = { searchProductImage };
