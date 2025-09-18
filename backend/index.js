const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS
app.use(cors({
  origin: 'http://localhost:3000', // URL du frontend Next.js
  credentials: true
}));

app.use(express.json());

// Stockage en mémoire pour simuler la base de données
let inMemoryColumns = [];
let inMemoryCards = [];
let nextColumnId = 1;
let nextCardId = 1;

// Modèle de colonnes de base
const defaultColumns = [
  { name: 'À faire', position: 1 },
  { name: 'En cours', position: 2 },
  { name: 'Terminé', position: 3 }
];

// Essayer de se connecter à PostgreSQL, sinon utiliser le stockage en mémoire
let useDatabase = false; // Forcer l'utilisation du stockage en mémoire pour l'instant
let pool = null;

if (useDatabase) {
  try {
    const { Pool } = require('pg');
    pool = new Pool();
    useDatabase = true;
    console.log('✅ Connexion à PostgreSQL établie');
  } catch (error) {
    console.log('⚠️ PostgreSQL non disponible, utilisation du stockage en mémoire');
    useDatabase = false;
  }
} else {
  console.log('📝 Utilisation du stockage en mémoire (PostgreSQL désactivé)');
}

// Route pour créer les colonnes de base
app.post('/api/columns/create-default', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect();
      
      // Créer la table columns si elle n'existe pas
      await client.query(`
        CREATE TABLE IF NOT EXISTS columns (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          position INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insérer les colonnes de base
      const values = defaultColumns.map(col => `('${col.name}', ${col.position})`).join(', ');
      await client.query(`
        INSERT INTO columns (name, position) 
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `);

      const result = await client.query('SELECT * FROM columns ORDER BY position');
      client.release();

      res.json({
        success: true,
        message: 'Colonnes de base créées avec succès',
        columns: result.rows
      });
    } else {
      // Utiliser le stockage en mémoire
      if (inMemoryColumns.length === 0) {
        inMemoryColumns = defaultColumns.map(col => ({
          id: nextColumnId++,
          name: col.name,
          position: col.position,
          created_at: new Date().toISOString()
        }));
      }

      res.json({
        success: true,
        message: 'Colonnes de base créées avec succès (stockage mémoire)',
        columns: inMemoryColumns
      });
    }
  } catch (error) {
    console.error('Erreur lors de la création des colonnes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des colonnes',
      error: error.message
    });
  }
});

// Route pour récupérer toutes les colonnes
app.get('/api/columns', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM columns ORDER BY position');
      client.release();

      res.json({
        success: true,
        columns: result.rows
      });
    } else {
      // Utiliser le stockage en mémoire
      res.json({
        success: true,
        columns: inMemoryColumns
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des colonnes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des colonnes',
      error: error.message
    });
  }
});

// Route pour créer une carte de test
app.post('/api/cards/create-test', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect();
      
      // Créer la table cards si elle n'existe pas
      await client.query(`
        CREATE TABLE IF NOT EXISTS cards (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          column_id INTEGER REFERENCES columns(id),
          position INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Récupérer l'ID de la première colonne (À faire)
      const columnResult = await client.query('SELECT id FROM columns ORDER BY position LIMIT 1');
      if (columnResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune colonne trouvée. Veuillez créer les colonnes de base d\'abord.'
        });
      }

      const columnId = columnResult.rows[0].id;

      // Créer une carte de test
      const testCard = {
        title: 'Carte de test',
        description: 'Ceci est une carte de test pour démontrer la fonctionnalité d\'EpiTrello',
        column_id: columnId,
        position: 1
      };

      const insertResult = await client.query(`
        INSERT INTO cards (title, description, column_id, position)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [testCard.title, testCard.description, testCard.column_id, testCard.position]);

      client.release();

      res.json({
        success: true,
        message: 'Carte de test créée avec succès',
        card: insertResult.rows[0]
      });
    } else {
      // Utiliser le stockage en mémoire
      if (inMemoryColumns.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune colonne trouvée. Veuillez créer les colonnes de base d\'abord.'
        });
      }

      const columnId = inMemoryColumns[0].id;

      const testCard = {
        id: nextCardId++,
        title: 'Carte de test',
        description: 'Ceci est une carte de test pour démontrer la fonctionnalité d\'EpiTrello',
        column_id: columnId,
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        column_name: inMemoryColumns[0].name
      };

      inMemoryCards.push(testCard);

      res.json({
        success: true,
        message: 'Carte de test créée avec succès (stockage mémoire)',
        card: testCard
      });
    }
  } catch (error) {
    console.error('Erreur lors de la création de la carte de test:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la carte de test',
      error: error.message
    });
  }
});

// Route pour récupérer toutes les cartes
app.get('/api/cards', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect();
      const result = await client.query(`
        SELECT c.*, col.name as column_name 
        FROM cards c 
        LEFT JOIN columns col ON c.column_id = col.id 
        ORDER BY c.position
      `);
      client.release();

      res.json({
        success: true,
        cards: result.rows
      });
    } else {
      // Utiliser le stockage en mémoire
      const cardsWithColumnNames = inMemoryCards.map(card => ({
        ...card,
        column_name: inMemoryColumns.find(col => col.id === card.column_id)?.name || 'Colonne inconnue'
      }));

      res.json({
        success: true,
        cards: cardsWithColumnNames
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes',
      error: error.message
    });
  }
});

// Route pour récupérer les cartes d'une colonne spécifique
app.get('/api/columns/:columnId/cards', async (req, res) => {
  try {
    const { columnId } = req.params;
    const client = await pool.connect();
    const result = await client.query(`
      SELECT c.*, col.name as column_name 
      FROM cards c 
      LEFT JOIN columns col ON c.column_id = col.id 
      WHERE c.column_id = $1 
      ORDER BY c.position
    `, [columnId]);
    client.release();

    res.json({
      success: true,
      cards: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes de la colonne:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes de la colonne',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('Bienvenue sur EpiTrello API !');
});

app.listen(port, () => {
  console.log(`Serveur backend EpiTrello lancé sur le port ${port}`);
});
