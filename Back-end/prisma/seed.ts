import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Connexion identique au DatabaseService du backend ──────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── 28 catégories NEWOTEG (composants électroniques) ───────────────────────
const CATEGORIES = [
  { nom: 'MOSFET', description: 'Transistors à effet de champ MOSFET : N-Channel, P-Channel, Gate Drive' },
  { nom: 'Transistors Bipolaires', description: 'Transistors BJT NPN et PNP (2N3904, BC547, 2N3055, 2N5551...)' },
  { nom: 'IGBT & Thyristors', description: 'Transistors de puissance IGBT, SCR Thyristors, TRIAC' },
  { nom: 'Mémoires & EEPROM', description: 'Mémoires Flash, RAM, EEPROM série (24Cxx, 25Cxx, AT28Cxx)' },
  { nom: 'Amplificateurs & Audio', description: 'Amplis opérationnels, amplis audio (TDA, LM386, NE5532)' },
  { nom: 'Régulateurs de Tension', description: 'Régulateurs linéaires LDO et switching (7805, LM317, AMS1117)' },
  { nom: 'Microcontrôleurs & Logic', description: 'MCU, portes logiques, décodeurs, comparateurs (74xx, CMOS)' },
  { nom: 'Diodes Redresseuses', description: 'Diodes PN standard, ponts redresseurs (1N4007, 1N5408)' },
  { nom: 'Diodes Zener', description: 'Régulation de tension par diodes Zener (3.3V à 100V)' },
  { nom: 'Diodes Schottky', description: 'Diodes haute vitesse et faible Vf (1N5819, SR540)' },
  { nom: 'LED & Optronique', description: 'DEL (toutes couleurs), optovariateurs, photodiodes, capteurs IR' },
  { nom: 'Condensateurs Électrolytiques', description: 'Condensateurs polarisés aluminium, 1µF à 47000µF' },
  { nom: 'Condensateurs Céramiques', description: 'Condensateurs non-polarisés, SMD et traversants (pF à µF)' },
  { nom: 'Condensateurs Tantale & Autres', description: 'Tantale, polypropylène, polyester (MKT, MKP)' },
  { nom: 'Résistances', description: 'Résistances couche carbone, couche métallique, bobinées (1/4W à 5W)' },
  { nom: 'Inductances & Bobines', description: "Self, inductances d'arrêt, transformateurs de signal et de puissance" },
  { nom: 'Thermistances & Varistors', description: 'NTC/PTC pour protection et mesure de température, varistors MOV' },
  { nom: 'Modules Arduino & ESP', description: 'Cartes de développement Arduino, ESP8266, ESP32, Raspberry Pi' },
  { nom: 'Afficheurs LCD & LED', description: 'Écrans LCD 16x2/20x4, matrices LED, 7 segments, OLED I2C/SPI' },
  { nom: 'Modules de Puissance', description: 'Convertisseurs DC-DC, chargeurs Li-ion, drivers moteur (L298N, ULN2003)' },
  { nom: 'Capteurs & Détecteurs', description: 'Capteurs de température, humidité, pression, PIR, ultrasons' },
  { nom: 'Connecteurs & Bornes', description: 'Headers pin, connecteurs JST, Dupont, borniers PCB à vis' },
  { nom: 'Câbles & Fils', description: 'Fils de liaison, nappes FPC, câbles coaxiaux et blindés' },
  { nom: 'Outils & Soudure', description: 'Fers à souder, stations de reprise, pompes à dessouder, pinces' },
  { nom: 'Consommables Soudure', description: 'Étain (60/40, sans plomb), flux, pâte à braser, mèche' },
  { nom: 'Protections & Boîtiers', description: 'Dissipateurs thermiques, pâte thermique, boîtiers plastique et métal' },
  { nom: 'Alimentations & Batteries', description: 'Blocs secteur, packs Li-Ion/LiPo, accus NiMH, chargeurs' },
  { nom: 'Divers & Consommables', description: 'Accessoires non classifiés, petites fournitures atelier' },
];

async function main() {
  console.log('🌱  Démarrage du seed des catégories NEWOTEG...\n');

  for (const cat of CATEGORIES) {
    const result = await prisma.categorie.upsert({
      where: { nom: cat.nom },
      update: {},
      create: cat,
    });
    console.log(`  ✅  ${result.nom}`);
  }

  console.log(`\n✨  Seed terminé ! ${CATEGORIES.length} catégories insérées/vérifiées.`);
}

main()
  .catch((e) => {
    console.error('❌  Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
