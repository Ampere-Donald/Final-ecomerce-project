module.exports = {
  // Modèle le moins cher et le plus rapide
  MODEL: "black-forest-labs/flux-schnell",
  
  // Paramètres par défaut de génération
  GENERATION_PARAMS: {
    "go_fast": true,
    "megapixels": "1", // Résolution standard ~1024x1024
    "num_outputs": 1,
    "aspect_ratio": "1:1",
    "output_format": "webp", // Prêt direct pour le web !
    "output_quality": 80
  },

  // 1ère passe : une image principale de face/isométrique par produit.
  // Plus tard on pourra faire des variations pour image2 et image3.
  BASE_PROMPT: "Ultra-realistic e-commerce product photography, photorealistic, 8k resolution, shot on DSLR, macro lens, incredibly detailed, lifelike textures, professional bright studio lighting, pure white background. Product: {productName}. Category: {category}.",

  // On peut affiner par catégorie si besoin (ex: "composant électronique macro")
  CATEGORY_MODIFIERS: {
    "Composants_Electroniques": "Close-up macro photography of electronic component, highly detailed PCB and pins",
    "Loupe_and_Optique": "Magnifying glass / optical tool, sharp glass reflection",
    "Audio_and_Son": "High-end audio equipment, sleek design",
    "Cables_and_Connectique": "Tech cable/connector neatly coiled",
    "Ventilateurs": "Cooling fan, industrial clean look",
    "Telecommandes": "TV remote control lying flat on white surface"
  }
};
