const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la connexion PostgreSQL avec les variables d'environnement
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'epitrello',
  port: process.env.PGPORT || 5432,
  // Options supplémentaires pour une meilleure gestion
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000, // Temps avant fermeture d'une connexion inactive
  connectionTimeoutMillis: 2000 // Temps limite pour établir une connexion
});

module.exports = pool;