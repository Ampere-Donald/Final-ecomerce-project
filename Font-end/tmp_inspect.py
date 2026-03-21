import csv, json, hashlib

# Category mapping: famille_article_id -> { name, slug, parent }
FAMILLE_MAP = {
    # ── Composants Semi-conducteurs ──
    "101": {"name": "MOSFET", "slug": "mosfet", "parent": "Transistors & MOSFET"},
    "103": {"name": "Transistors Bipolaires", "slug": "transistors-bipolaires", "parent": "Transistors & MOSFET"},
    "102": {"name": "Circuits Intégrés", "slug": "circuits-integres", "parent": "Circuits Intégrés"},
    "107": {"name": "STK Modules", "slug": "stk-modules", "parent": "Circuits Intégrés"},
    "108": {"name": "Modules Audio", "slug": "modules-audio", "parent": "Circuits Intégrés"},
    "117": {"name": "Logic ICs 74HC", "slug": "logic-ics", "parent": "Circuits Intégrés"},
    "118": {"name": "CI Audio TDA/STA", "slug": "ci-audio", "parent": "Circuits Intégrés"},
    "132": {"name": "CI Série TA", "slug": "ci-serie-ta", "parent": "Circuits Intégrés"},
    "111": {"name": "Diodes", "slug": "diodes", "parent": "LED & Diodes"},
    "113": {"name": "LED", "slug": "led", "parent": "LED & Diodes"},
    # ── Passifs ──
    "104": {"name": "Condensateurs Céramiques", "slug": "condensateurs-ceramiques", "parent": "Résistances & Condensateurs"},
    "123": {"name": "Condensateurs Électrolytiques", "slug": "condensateurs-electrolytiques", "parent": "Résistances & Condensateurs"},
    "106": {"name": "Résistances Carbone", "slug": "resistances-carbone", "parent": "Résistances & Condensateurs"},
    "128": {"name": "Résistances de Puissance", "slug": "resistances-puissance", "parent": "Résistances & Condensateurs"},
    "105": {"name": "Résistances Ajustables", "slug": "resistances-ajustables", "parent": "Résistances & Condensateurs"},
    "115": {"name": "Potentiomètres", "slug": "potentiometres", "parent": "Résistances & Condensateurs"},
    "112": {"name": "Fusibles", "slug": "fusibles", "parent": "Résistances & Condensateurs"},
    # ── Connectique ──
    "237": {"name": "Câbles & Cordons", "slug": "cables-cordons", "parent": "Câbles & Connecteurs"},
    "241": {"name": "Fiches & Connecteurs", "slug": "fiches-connecteurs", "parent": "Câbles & Connecteurs"},
    "208": {"name": "Adaptateurs", "slug": "adaptateurs", "parent": "Câbles & Connecteurs"},
    "243": {"name": "Interrupteurs", "slug": "interrupteurs", "parent": "Câbles & Connecteurs"},
    # ── Outils ──
    "240": {"name": "Outils & Soudure", "slug": "outils-soudure", "parent": "Outils & Soudure"},
    # ── Audio & HP ──
    "242": {"name": "Haut-Parleurs", "slug": "haut-parleurs", "parent": "Audio & Haut-Parleurs"},
    # ── Alimentation ──
    "233": {"name": "Chargeurs", "slug": "chargeurs", "parent": "Alimentation"},
    "255": {"name": "Piles & Batteries", "slug": "piles-batteries", "parent": "Alimentation"},
    # ── Accessoires ──
    "268": {"name": "Télécommandes", "slug": "telecommandes", "parent": "Accessoires"},
    "211": {"name": "Ampoules", "slug": "ampoules", "parent": "Accessoires"},
    "215": {"name": "Lecteurs & Multimédia", "slug": "lecteurs-multimedia", "parent": "Multimédia"},
    # ── Électroménager ──
    "616": {"name": "Réfrigérateurs", "slug": "refrigerateurs", "parent": "Électroménager"},
    "620": {"name": "Téléviseurs", "slug": "televiseurs", "parent": "Électroménager"},
}

# Default mapping for unmapped familles
DEFAULT_PARENTS = {
    "1": "Composants Électroniques",
    "2": "Accessoires & Câbles",
    "3": "Connecteurs & Embases",
    "4": "Équipements",
    "5": "Divers",
    "6": "Électroménager",
    "7": "Mobilier & Confort",
}

# Price ranges per parent category (min, max) in FCFA
PRICE_RANGES = {
    "Transistors & MOSFET": (300, 8000),
    "Circuits Intégrés": (500, 25000),
    "LED & Diodes": (50, 3000),
    "Résistances & Condensateurs": (25, 2000),
    "Câbles & Connecteurs": (200, 8000),
    "Outils & Soudure": (1000, 15000),
    "Audio & Haut-Parleurs": (2000, 45000),
    "Alimentation": (500, 10000),
    "Accessoires": (200, 15000),
    "Multimédia": (2000, 50000),
    "Électroménager": (50000, 350000),
    "Composants Électroniques": (100, 5000),
    "Accessoires & Câbles": (200, 8000),
    "Connecteurs & Embases": (100, 3000),
    "Équipements": (5000, 50000),
    "Divers": (200, 10000),
    "Mobilier & Confort": (15000, 150000),
}

def get_category_info(famille_id):
    if famille_id in FAMILLE_MAP:
        info = FAMILLE_MAP[famille_id]
        return info["name"], info["slug"], info["parent"]
    # Auto-map based on first digit
    prefix = famille_id[0] if famille_id else "5"
    parent = DEFAULT_PARENTS.get(prefix, "Divers")
    return f"Famille {famille_id}", f"famille-{famille_id}", parent

def generate_price(code, parent_category):
    """Deterministic price based on code hash"""
    h = int(hashlib.md5(code.encode()).hexdigest(), 16)
    price_range = PRICE_RANGES.get(parent_category, (100, 5000))
    min_p, max_p = price_range
    # Round to nice numbers
    raw = min_p + (h % (max_p - min_p))
    if raw < 500:
        retail = round(raw / 25) * 25
    elif raw < 5000:
        retail = round(raw / 50) * 50
    elif raw < 50000:
        retail = round(raw / 100) * 100
    else:
        retail = round(raw / 500) * 500
    retail = max(retail, min_p)
    # Wholesale: 25-40% discount
    discount = 0.25 + (h % 16) / 100
    wholesale = round(retail * (1 - discount) / 25) * 25
    return retail, wholesale

# Category image URLs
CATEGORY_IMAGES = {
    "Transistors & MOSFET": "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400&auto=format&fit=crop",
    "Circuits Intégrés": "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?q=80&w=400&auto=format&fit=crop",
    "LED & Diodes": "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=400&auto=format&fit=crop",
    "Résistances & Condensateurs": "https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop",
    "Câbles & Connecteurs": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400&auto=format&fit=crop",
    "Outils & Soudure": "https://images.unsplash.com/photo-1588783948922-5aa15e674084?q=80&w=400&auto=format&fit=crop",
    "Audio & Haut-Parleurs": "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=400&auto=format&fit=crop",
    "Alimentation": "https://images.unsplash.com/photo-1609692814858-f7cd2f0afa4f?q=80&w=400&auto=format&fit=crop",
    "Accessoires": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop",
    "Multimédia": "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=400&auto=format&fit=crop",
    "Électroménager": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=400&auto=format&fit=crop",
    "Composants Électroniques": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop",
    "Accessoires & Câbles": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400&auto=format&fit=crop",
    "Connecteurs & Embases": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400&auto=format&fit=crop",
    "Équipements": "https://images.unsplash.com/photo-1588783948922-5aa15e674084?q=80&w=400&auto=format&fit=crop",
    "Divers": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop",
    "Mobilier & Confort": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=400&auto=format&fit=crop",
}

# Parse CSV
products = []
categories_set = {}

with open('XELEC/fournitures.csv', encoding='latin-1') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    
    for row in reader:
        if len(row) < 7:
            continue
        model, code, marque, deleted_at, created_at, updated_at, famille_id = [r.strip() for r in row[:7]]
        
        if deleted_at and deleted_at != 'NULL':
            continue
        if not model or not code:
            continue
            
        cat_name, cat_slug, parent = get_category_info(famille_id)
        retail, wholesale = generate_price(code, parent)
        image = CATEGORY_IMAGES.get(parent, CATEGORY_IMAGES["Composants Électroniques"])
        
        products.append({
            "code": code,
            "model": model.strip(),
            "marque": marque if marque != "NULL" else None,
            "familleId": famille_id,
            "categoryName": cat_name,
            "categorySlug": cat_slug,
            "parentCategory": parent,
            "retailPrice": retail,
            "wholesalePrice": wholesale,
            "image": image,
        })
        
        # Track categories
        if parent not in categories_set:
            categories_set[parent] = {"subcategories": {}, "count": 0}
        categories_set[parent]["count"] += 1
        if cat_slug not in categories_set[parent]["subcategories"]:
            categories_set[parent]["subcategories"][cat_slug] = {
                "name": cat_name, 
                "slug": cat_slug, 
                "count": 0
            }
        categories_set[parent]["subcategories"][cat_slug]["count"] += 1

# Sort products by model name
products.sort(key=lambda p: p["model"])

# Build categories list
parent_slug_map = {
    "Transistors & MOSFET": "transistors",
    "Circuits Intégrés": "circuits-integres",
    "LED & Diodes": "led-diodes",
    "Résistances & Condensateurs": "resistances",
    "Câbles & Connecteurs": "cables",
    "Outils & Soudure": "outils",
    "Audio & Haut-Parleurs": "audio",
    "Alimentation": "alimentation",
    "Accessoires": "accessoires",
    "Multimédia": "multimedia",
    "Électroménager": "electromenager",
    "Composants Électroniques": "composants",
    "Accessoires & Câbles": "accessoires-cables",
    "Connecteurs & Embases": "connecteurs",
    "Équipements": "equipements",
    "Divers": "divers",
    "Mobilier & Confort": "mobilier",
}

categories = []
for parent_name, data in sorted(categories_set.items(), key=lambda x: -x[1]["count"]):
    categories.append({
        "name": parent_name,
        "slug": parent_slug_map.get(parent_name, parent_name.lower().replace(" ", "-")),
        "count": data["count"],
        "image": CATEGORY_IMAGES.get(parent_name, ""),
        "subcategories": sorted(data["subcategories"].values(), key=lambda s: -s["count"])
    })

# Write output
with open('tmp_products_output.json', 'w', encoding='utf-8') as f:
    json.dump({"total": len(products), "products": products[:5], "categories": categories}, f, indent=2, ensure_ascii=False)

print(f"Total products: {len(products)}")
print(f"Total parent categories: {len(categories)}")
for c in categories:
    print(f"  {c['name']}: {c['count']} products, {len(c['subcategories'])} subcategories")

# Write the actual JS data files
# 1. Categories data
with open('src/data/categoriesData.js', 'w', encoding='utf-8') as f:
    f.write("// Auto-generated from XELEC database\n")
    f.write("// Category mapping for NEWOTEG e-commerce\n\n")
    f.write("export const categories = ")
    json.dump(categories, f, indent=2, ensure_ascii=False)
    f.write(";\n\n")
    f.write("export const getCategoryBySlug = (slug) => {\n")
    f.write("    for (const cat of categories) {\n")
    f.write("        if (cat.slug === slug) return cat;\n")
    f.write("        const sub = cat.subcategories.find(s => s.slug === slug);\n")
    f.write("        if (sub) return { ...sub, parentCategory: cat.name, parentSlug: cat.slug };\n")
    f.write("    }\n")
    f.write("    return null;\n")
    f.write("};\n\n")
    f.write("export const getParentCategories = () => categories;\n\n")
    f.write("export default categories;\n")

# 2. Products data  
with open('src/data/productsData.js', 'w', encoding='utf-8') as f:
    f.write("// Auto-generated from XELEC database — {} products\n".format(len(products)))
    f.write("// NEWOTEG e-commerce product catalogue\n\n")
    f.write("const products = ")
    json.dump(products, f, ensure_ascii=False)
    f.write(";\n\n")
    f.write("export const formatFCFA = (amount) => {\n")
    f.write("    return amount.toLocaleString('fr-FR') + ' FCFA';\n")
    f.write("};\n\n")
    f.write("export const getProductByCode = (code) => {\n")
    f.write("    return products.find(p => p.code === code);\n")
    f.write("};\n\n")
    f.write("export const getProductsByCategory = (categorySlug) => {\n")
    f.write("    return products.filter(p => p.categorySlug === categorySlug || p.parentCategory.toLowerCase().replace(/[\\s&]/g, '-').replace(/--+/g, '-') === categorySlug);\n")
    f.write("};\n\n")
    f.write("export const searchProducts = (query) => {\n")
    f.write("    const q = query.toLowerCase();\n")
    f.write("    return products.filter(p => p.model.toLowerCase().includes(q) || p.code.includes(q));\n")
    f.write("};\n\n")
    f.write("export const getAllProducts = () => products;\n\n")
    f.write("export default products;\n")

print("\nJS data files written to src/data/")
