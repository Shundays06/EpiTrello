const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const pool = new Pool();

// Modèle de colonnes de base
const defaultColumns = [
  { name: 'À faire', position: 1 },
  { name: 'En cours', position: 2 },
  { name: 'Terminé', position: 3 }
];

// Route pour créer les colonnes de base
app.post('/api/columns/create-default', async (req, res) => {
  try {
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
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM columns ORDER BY position');
    client.release();

    res.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des colonnes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des colonnes',
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
