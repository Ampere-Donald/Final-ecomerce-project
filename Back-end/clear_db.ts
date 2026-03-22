import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Emptying catalog...");
  try { await prisma.pendingImport.deleteMany({}); } catch (e) {}
  try { await prisma.mouvementStock.deleteMany({}); } catch (e) {}
  try { await prisma.ligneCommande.deleteMany({}); } catch (e) {}
  try { await prisma.ligneAchat.deleteMany({}); } catch (e) {}
  try { await prisma.ligneVente.deleteMany({}); } catch (e) {}
  try { await prisma.valeurAttribut.deleteMany({}); } catch (e) {}
  try { await prisma.attribut.deleteMany({}); } catch (e) {}
  try { await prisma.favori.deleteMany({}); } catch (e) {}
  try { await prisma.produit.deleteMany({}); } catch (e) {}
  try { await prisma.categorie.deleteMany({}); } catch (e) {}
  console.log("Catalog cleared!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
