/**
 * Dictionnaire intelligent de descriptions visuelles.
 * Analyse le nom du produit et sa catégorie pour retourner
 * une description physique détaillée que l'IA peut visualiser.
 */

// ── Règles de détection par pattern dans le nom du produit ──────────────
const PATTERN_RULES = [
  // === COMPOSANTS ELECTRONIQUES ===
  // EEPROM / Mémoires (24Cxx, 93Cxx, etc.)
  { pattern: /^24C\d+/i, desc: "small black 8-pin DIP IC memory EEPROM chip, rectangular black plastic body with two rows of 4 silver metal pins" },
  { pattern: /^93C\d+/i, desc: "small black 8-pin DIP IC memory chip, rectangular black epoxy package with thin silver legs" },
  // Transistors MOSFET (xxNxx pattern)
  { pattern: /^\d+N\d+\s*(GM|PM)?$/i, desc: "MOSFET power transistor in black TO-220 plastic package with 3 silver metal pins and metal heatsink tab" },
  { pattern: /^IRF\d+/i, desc: "IRF MOSFET transistor, black TO-220 package with 3 pins and a metal heat-sink tab on top" },
  { pattern: /^IRFP\d+/i, desc: "large power MOSFET transistor in TO-247 package, big black rectangular body with 3 thick metal pins" },
  // Transistors bipolaires (2Nxxxx, 2SCxxxx, 2SAxxxx)
  { pattern: /^2N\s*\d{3,4}/i, desc: "bipolar transistor, small silver metal can TO-39/TO-18 package with 3 wire leads, or black TO-92 plastic with 3 pins" },
  { pattern: /^2SC[\s_]?\d{3,4}/i, desc: "NPN power transistor in black TO-3P or TO-264 package, large flat body with 3 pins" },
  { pattern: /^2SA[\s_]?\d{3,4}/i, desc: "PNA power transistor in black TO-3P package, large flat body with 3 pins" },
  { pattern: /^2N\s*3055/i, desc: "2N3055 power transistor in shiny metal TO-3 round can package with 2 pins on the bottom" },
  { pattern: /^2N\s*2955/i, desc: "2N2955 power transistor in shiny silver metal TO-3 round can package with 2 pins" },
  // IGBT (xxF xxx)
  { pattern: /^\d+F\s*\d{2,3}/i, desc: "IGBT transistor in black TO-220 or TO-247 package with 3 metal pins" },
  // Régulateurs de tension (78xx, 79xx, LMxxx)
  { pattern: /^78\d{2}/i, desc: "positive voltage regulator IC in black TO-220 package with 3 metal pins, printed markings on front" },
  { pattern: /^79\d{2}/i, desc: "negative voltage regulator IC in TO-220 black package with 3 pins" },
  { pattern: /^LM\d{3,4}/i, desc: "linear voltage regulator integrated circuit in TO-220 or TO-92 black plastic package" },
  // Circuits intégrés audio/video (TDA, STR, AN, LA, STK)
  { pattern: /^TDA\s*\d{3,4}/i, desc: "integrated circuit IC chip in black DIP or SIP multi-pin package, rectangular with many silver pins" },
  { pattern: /^STR\s*\d{3,5}/i, desc: "STR hybrid voltage regulator IC in SIP package, tall rectangular black body with a row of pins on bottom" },
  { pattern: /^AN\s*\d{3,4}/i, desc: "integrated circuit in black DIP package with dual rows of silver metal pins" },
  { pattern: /^LA\s*\d{3,4}/i, desc: "audio amplifier IC in SIP package, rectangular body with a single row of pins" },
  { pattern: /^STK\s*\d{3,5}/i, desc: "power amplifier thick-film hybrid IC in large SIP package, tall black body with many pins in a row" },
  // Diodes et ponts
  { pattern: /^DIODE/i, desc: "electronic diode, small cylindrical glass or black plastic component with colored band marking and 2 wire leads" },
  { pattern: /^PONT\s*(DE\s*)?DIODE/i, desc: "bridge rectifier, small square black plastic component with 4 pins/leads" },
  // Condensateurs
  { pattern: /^CONDENSAT/i, desc: "electrolytic capacitor, cylindrical aluminum can with colored sleeve and 2 wire leads on bottom" },
  { pattern: /^CONDO/i, desc: "electrolytic capacitor, cylindrical aluminum can with plastic sleeve" },
  // Résistances
  { pattern: /^RESIST/i, desc: "resistor, small cylindrical component with colored band markings and 2 axial wire leads" },
  { pattern: /^POTENT/i, desc: "rotary potentiometer, small round component with 3 pins and a rotating metal shaft on top" },
  // Relais
  { pattern: /^RELAIS/i, desc: "electromagnetic relay, small rectangular blue or black plastic box with transparent cover showing the coil inside, multiple pins on bottom" },
  // LED
  { pattern: /^LED\s/i, desc: "light emitting diode LED, small transparent or colored dome shaped component with 2 wire leads" },
  // Fusible
  { pattern: /^FUSIBLE/i, desc: "glass tube fuse, small transparent glass cylinder with metal caps on both ends" },
  // Quartz / Crystal
  { pattern: /^QUARTZ|^CRYSTAL/i, desc: "quartz crystal oscillator, small shiny silver metallic oval can with 2 wire pins" },
  // Bobine / inductance
  { pattern: /^BOBINE|^TRANSFO/i, desc: "transformer or inductor coil, copper wire wound around a ferrite core with pins on bottom" },

  // === OUTILLAGE ===
  { pattern: /FER\s*(A|À)\s*SOUDER/i, desc: "electric soldering iron with orange/yellow handle and long thin metal tip, with power cord" },
  { pattern: /^PINCE/i, desc: "pliers hand tool with rubber-coated handles, one red and one blue, metal jaws" },
  { pattern: /^TOURNEVIS/i, desc: "screwdriver with plastic handle and steel shaft tip" },
  { pattern: /^CUTTER/i, desc: "retractable utility knife cutter with yellow/orange plastic body and metal blade" },
  { pattern: /^CISEAU/i, desc: "scissors with black plastic handles and stainless steel blades" },
  { pattern: /^COLE\s*SILICONE|^COLLE/i, desc: "tube of silicone glue adhesive, small tube with cap" },
  { pattern: /^CHEVILLE/i, desc: "wall anchor plug and screw set, plastic anchor and metal screw" },
  { pattern: /^ETAIN|^SOUDURE/i, desc: "solder wire on a spool, silver-colored thin wire wound on a small reel" },
  { pattern: /^PERCEUSE/i, desc: "electric drill with chuck and trigger, power tool" },
  { pattern: /^PISTOLET.*COLLE/i, desc: "hot glue gun, trigger-operated with plastic body" },
  { pattern: /^LOUPE/i, desc: "magnifying glass with LED lights around the lens, handheld optical magnifier with black handle" },
  { pattern: /^TESTEUR/i, desc: "electronic tester probe tool with display and pointed metal tips" },

  // === AUDIO ===
  { pattern: /^AMPLIFICATEUR.*AUTO/i, desc: "car audio amplifier, rectangular metallic box with cooling fins and RCA input jacks" },
  { pattern: /^AMPLIFICATEUR/i, desc: "audio amplifier unit, metal chassis box with knobs, input jacks, and ventilation holes" },
  { pattern: /^BAFFLE|^HAUT.?PARLEUR/i, desc: "loudspeaker driver cone, round black frame with paper or polypropylene cone and dust cap center" },
  { pattern: /^CASQUE/i, desc: "over-ear headphones with padded ear cups and adjustable headband" },
  { pattern: /^MICRO\b/i, desc: "microphone, handheld dynamic microphone with metal mesh grille head" },
  { pattern: /^ECOUTEUR/i, desc: "in-ear earphones earbuds with cable and 3.5mm jack plug" },
  { pattern: /^ENCEINTE/i, desc: "portable bluetooth speaker, compact cylindrical or rectangular shape with fabric mesh cover" },

  // === CABLES & CONNECTIQUE ===
  { pattern: /^ADAPT.*RCA/i, desc: "RCA audio/video adapter connector plug, metallic with colored rings (red/white/yellow)" },
  { pattern: /^ADAPT.*BNC/i, desc: "BNC connector adapter, metallic bayonet-style coaxial connector" },
  { pattern: /^ADAPT.*HDMI/i, desc: "HDMI adapter connector, black plastic with gold-plated contacts" },
  { pattern: /^ADAPT.*USB/i, desc: "USB adapter connector, small metallic or black plastic" },
  { pattern: /^ADAPT.*JACK|^ADAPT.*6\.5|^ADAPT.*3\.5/i, desc: "audio jack adapter, metallic plug converter between different jack sizes" },
  { pattern: /^ADAPT/i, desc: "electronic adapter connector plug, small metallic component for signal conversion" },
  { pattern: /^CABLE.*HDMI/i, desc: "HDMI cable, black flat cable with HDMI connectors on both ends" },
  { pattern: /^CABLE.*USB/i, desc: "USB cable with connectors on both ends" },
  { pattern: /^CABLE.*RCA/i, desc: "RCA audio video cable with red/white/yellow colored plugs" },
  { pattern: /^CABLE/i, desc: "electronic cable/cord, coiled or straight with connectors on both ends" },
  { pattern: /^FICHE|^PRISE/i, desc: "electrical plug or socket connector" },
  { pattern: /^ATTACHE.*CABLE/i, desc: "plastic cable clip tie mount, small white or black clip for cable management" },
  { pattern: /^ATTACHE.*SACHET/i, desc: "bag of nylon cable ties zip ties, white or black plastic" },
  { pattern: /^ATTACHE.*BOITE/i, desc: "box of cable clips or cable ties, plastic organizer" },
  { pattern: /^DOMINO/i, desc: "terminal block strip, white plastic electrical connector strip with screw terminals" },
  { pattern: /^GAINE/i, desc: "heat shrink tubing sleeve, flexible colored plastic tube for cable insulation" },

  // === CHARGEURS ===
  { pattern: /^CHARGER|^CHARGEUR/i, desc: "AC/DC power adapter charger, black plastic brick with cable and DC barrel plug, wall plug on one end" },

  // === ALIMENTATION ===
  { pattern: /ALIMENTATION\s*STABILISE|ALIMT\s*STABILISE/i, desc: "regulated DC power supply unit, metal casing with ventilation holes, terminal screws, and cooling fan" },
  { pattern: /ALIMT.*LCD|ALIMT.*LED/i, desc: "LCD/LED TV power supply board, green PCB circuit board with capacitors, transformers and connectors" },
  { pattern: /ALIMT.*DVB|ALIMT.*DVD/i, desc: "DVD/DVB decoder power supply board, small green or brown PCB with electronic components" },
  { pattern: /ALIMT|ALIMENTATION/i, desc: "electronic power supply unit with cables and connectors" },

  // === PILES & BATTERIES ===
  { pattern: /^BATERIE.*RECH/i, desc: "rechargeable battery pack, cylindrical lithium-ion cells wrapped in blue or green PVC sleeve with wires" },
  { pattern: /^PILE\b/i, desc: "disposable battery cell, cylindrical with positive and negative terminals" },
  { pattern: /^ACCU/i, desc: "rechargeable NiMH or lithium battery cell" },

  // === TELECOMMANDES ===
  { pattern: /^TELECMDE|^TELECOMMANDE/i, desc: "TV/DVD remote control, elongated black plastic body with rubber buttons arranged in grid pattern, infrared emitter on top" },

  // === VENTILATEURS ===
  { pattern: /^VENTILATEUR/i, desc: "DC cooling fan, square black plastic frame with circular fan blades inside, wire leads" },

  // === SATELLITE & TV ===
  { pattern: /^ANTENNE.*PARAB/i, desc: "satellite dish antenna, round concave white or grey metal dish with LNB arm" },
  { pattern: /^ANTENNE.*RADIO/i, desc: "telescopic radio antenna, thin extendable chrome metal rod" },
  { pattern: /^ANTENNE.*EXT/i, desc: "outdoor TV antenna, metallic elements on a horizontal boom" },
  { pattern: /^ANTENNE/i, desc: "antenna, metallic rod or flat panel for signal reception" },
  { pattern: /^AFFICHEUR/i, desc: "LED electronic display panel board, rectangular with LED dot matrix digits" },
  { pattern: /^LNB/i, desc: "satellite LNB (Low Noise Block), cylindrical device that mounts on satellite dish arm" },
  { pattern: /^DECODEUR|^DVB/i, desc: "digital satellite TV decoder set-top box, rectangular black plastic with front display and buttons" },
  { pattern: /^TETE.*PARAB/i, desc: "satellite dish LNB head unit" },

  // === INFORMATIQUE ===
  { pattern: /^ARDUINO/i, desc: "Arduino microcontroller development board, blue PCB with USB port, microchip, and pin headers" },
  { pattern: /^ATMEGA/i, desc: "ATmega microcontroller chip, black DIP IC package with many pins" },
  { pattern: /^BOITIER.*DISQUE/i, desc: "external hard drive enclosure case, rectangular plastic/metal box with USB port" },
  { pattern: /^CAMERA.*CCTV|^CAMERA.*SECURITE/i, desc: "CCTV security camera, white cylindrical or dome-shaped with lens" },
  { pattern: /^ADAPTATEUR.*BLUETOOTH/i, desc: "small USB Bluetooth dongle adapter, tiny black or white plastic stick" },
  { pattern: /^SOURIS/i, desc: "computer mouse, ergonomic shape with scroll wheel and buttons" },
  { pattern: /^CLAVIER/i, desc: "computer keyboard with keys" },
  { pattern: /^CLE.*USB/i, desc: "USB flash drive memory stick, small and compact" },

  // === MESURE & TEST ===
  { pattern: /^MULTI.*ANALOG/i, desc: "analog multimeter with needle gauge display, rotary selector dial, and two probe leads (red and black)" },
  { pattern: /^MULTI.*DIGIT|^MULTI.*NUMER/i, desc: "digital multimeter with LCD screen, rotary dial selector, and red/black test probe leads" },
  { pattern: /^DETECTEUR.*FAUX.*BILLET/i, desc: "counterfeit money detector UV lamp, handheld or desktop device with UV light" },
  { pattern: /^DETECTEUR.*FUMEE/i, desc: "smoke detector alarm, round white plastic ceiling-mount device" },
  { pattern: /^DETECTEUR.*PASSAGE/i, desc: "motion sensor detector with doorbell chime unit" },

  // === ACCESSOIRES ELECTRIQUES ===
  { pattern: /^ADAPTATEUR.*ALITE|^ADAPTATEUR.*MERKAN/i, desc: "electrical multi-plug power adapter, white plastic with multiple socket outlets" },
  { pattern: /^RALLONGE/i, desc: "extension cord power strip, white cable with multiple outlets" },
  { pattern: /^INTERRUPTEUR/i, desc: "wall light switch, white plastic rectangular plate with toggle or rocker switch" },
  { pattern: /^BOUGIE.*COLLE/i, desc: "hot glue stick, translucent cylindrical adhesive stick for glue gun" },
  { pattern: /^SCOTCH|^RUBAN/i, desc: "roll of adhesive tape, cylindrical roll of tape" },
];

// ── Descriptions de fallback par catégorie ──────────────────────────────
const CATEGORY_FALLBACKS = {
  "Composants_Electroniques": "electronic component, small black IC chip or transistor in plastic package with metal pins, on white background",
  "Composants Électroniques": "electronic component, small black IC chip or transistor in plastic package with metal pins, on white background",
  "Audio_and_Son": "audio equipment device, speaker or amplifier, professional product",
  "Cables_and_Connectique": "cable connector adapter plug, electronic connector component",
  "Chargeurs_and_Power_Banks": "AC/DC wall charger power adapter, black plastic with cable",
  "Alimentation_and_Energie": "power supply unit, metal or plastic box with cables",
  "Piles_and_Batteries": "battery cell or rechargeable battery pack",
  "Telecommandes": "TV remote control, black plastic with rubber buttons",
  "Télécommandes": "TV remote control, black plastic with rubber buttons",
  "Ventilateurs": "DC cooling fan, square black frame with fan blades",
  "Satellite_and_TV": "satellite TV equipment, antenna or decoder box",
  "Informatique_and_Reseaux": "computer / networking equipment or peripheral device",
  "Mesure_and_Test": "electronic test and measurement instrument",
  "Outillage": "hand tool for electronics repair, soldering or cutting",
  "Accessoires_electriques": "electrical accessory, plug adapter or cable management",
  "Accessoires électriques": "electrical accessory, plug adapter or cable management",
  "Loupe_and_Optique": "magnifying glass with LED lights, optical inspection tool",
  "Divers": "electronic component or accessory",
  "Sans_categorie": "electronic product",
};

/**
 * Analyse le nom du produit et retourne une description visuelle détaillée.
 * @param {string} productName - Nom du produit (ex: "24C02", "FER A SOUDER 40W")
 * @param {string} category - Nom de la catégorie
 * @returns {string} - Description visuelle pour le prompt IA
 */
function getVisualDescription(productName, category) {
  const name = productName.trim();

  // Chercher dans les patterns
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(name)) {
      return rule.desc;
    }
  }

  // Fallback par catégorie
  return CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS["Divers"];
}

module.exports = { getVisualDescription, PATTERN_RULES, CATEGORY_FALLBACKS };
