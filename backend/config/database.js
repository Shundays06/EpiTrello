const { Pool } = require('pg');
require('dotenv').config();

// Stockage en mémoire pour le fallback
const inMemoryData = {
  users: [],
  boards: [],
  cards: [],
  columns: [],
  invitations: []
};

// Configuration de la connexion PostgreSQL avec les variables d'environnement
let pool = null;
let useDatabase = true;

try {
  pool = new Pool({
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

  // Tester la connexion
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
      console.log('🔄 Bascule vers le stockage en mémoire');
      useDatabase = false;
      pool = null;
    } else {
      console.log('✅ Connexion à PostgreSQL établie avec succès');
      release();
    }
  });
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de PostgreSQL:', error.message);
  console.log('🔄 Utilisation du stockage en mémoire');
  useDatabase = false;
  pool = null;
}

// Fonction pour obtenir l'instance de base de données
function getDbInstance() {
  return {
    pool,
    useDatabase,
    inMemoryData
  };
}

module.exports = {
  pool,
  getDbInstance,
  inMemoryData
};