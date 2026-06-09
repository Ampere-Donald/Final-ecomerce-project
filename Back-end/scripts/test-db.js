require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

prisma.produit.count()
  .then(n => { console.log('Connexion OK — produits en DB:', n); })
  .catch(e => { console.error('Erreur:', e.message); })
  .finally(() => { prisma.$disconnect(); pool.end(); });
