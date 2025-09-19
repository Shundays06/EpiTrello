
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const port = process.env.PORT || 3001;

// ...autres initialisations...

// Initialiser le board par défaut au démarrage
async function ensureDefaultBoard() {
  if (useDatabase && pool) {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM boards');
    if (parseInt(result.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO boards (name, description) VALUES ($1, $2)',
        ['Board principal', 'Board créé automatiquement']
      );
    }
    client.release();
  }
}

// Initialiser les colonnes de base au démarrage
async function ensureDefaultColumns() {
  if (useDatabase && pool) {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM columns');
    if (parseInt(result.rows[0].count) === 0) {
      const defaultBoardId = 1;
      for (const col of defaultColumns) {
        await client.query(
          'INSERT INTO columns (name, position, board_id) VALUES ($1, $2, $3)',
          [col.name, col.position, defaultBoardId]
        );
      }
    }
    client.release();
  } else {
    if (inMemoryColumns.length === 0) {
      inMemoryColumns = defaultColumns.map(col => ({
        id: nextColumnId++,
        name: col.name,
        position: col.position,
        board_id: 1,
        created_at: new Date().toISOString()
      }));
    }
  }
}

// ...déclaration des variables, pool, etc...
// Appel APRÈS l'initialisation des variables
// Route pour créer une colonne personnalisée
app.post('/api/columns', async (req, res) => {
  try {
    const { name, position, board_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom de la colonne est obligatoire' });
    }
    const pos = position ? parseInt(position) : 1;
    const boardId = board_id ? parseInt(board_id) : 1;
    if (useDatabase && pool) {
      const client = await pool.connect();
      const result = await client.query(
        'INSERT INTO columns (name, position, board_id) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), pos, boardId]
      );
      client.release();
      res.json({ success: true, column: result.rows[0] });
    } else {
      const newCol = {
        id: nextColumnId++,
        name: name.trim(),
        position: pos,
        board_id: boardId,
        created_at: new Date().toISOString()
      };
      inMemoryColumns.push(newCol);
      res.json({ success: true, column: newCol });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Import du modèle Card
const cardModel = require('./models/card')
// Import du modèle Board
const boardModel = require('./models/board')
dotenv.config()
// Import du modèle User
const userModel = require('./models/user')

// Configuration CORS
app.use(cors({
  origin: 'http://localhost:3000', // URL du frontend Next.js
  credentials: true
}))

app.use(express.json())
// Routes API Cards
app.post('/api/cards', async (req, res) => {
  try {
    const { title, description, board_id, column_id, assigned_user_id } = req.body
    if (!title || !board_id || !column_id) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' })
    }
    const card = await cardModel.createCard({ title, description, board_id, column_id, assigned_user_id })
    res.json({ success: true, card })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/cards', async (req, res) => {
  try {
    const cards = await cardModel.getCardsByBoard(req.query.board_id)
    res.json({ success: true, cards })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/cards/:id', async (req, res) => {
  try {
    const card = await cardModel.getCardById(req.params.id)
    if (!card) return res.status(404).json({ success: false, message: 'Carte non trouvée' })
    res.json({ success: true, card })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/cards/:id', async (req, res) => {
  try {
    const { title, description, column_id, assigned_user_id } = req.body
    const card = await cardModel.updateCard(req.params.id, { title, description, column_id, assigned_user_id })
    if (!card) return res.status(404).json({ success: false, message: 'Carte non trouvée' })
    res.json({ success: true, card })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await cardModel.deleteCard(req.params.id)
    res.json({ success: true, message: 'Carte supprimée' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})
// Routes API Boards
app.post('/api/boards', async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom du board est requis' })
    }
    const board = await boardModel.createBoard({ name, description })
    res.json({ success: true, board })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/boards', async (req, res) => {
  try {
    const boards = await boardModel.getAllBoards()
    res.json({ success: true, boards })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/boards/:id', async (req, res) => {
  try {
    const board = await boardModel.getBoardById(req.params.id)
    if (!board) return res.status(404).json({ success: false, message: 'Board non trouvé' })
    res.json({ success: true, board })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/boards/:id', async (req, res) => {
  try {
    const { name, description } = req.body
    const board = await boardModel.updateBoard(req.params.id, { name, description })
    if (!board) return res.status(404).json({ success: false, message: 'Board non trouvé' })
    res.json({ success: true, board })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/boards/:id', async (req, res) => {
  try {
    await boardModel.deleteBoard(req.params.id)
    res.json({ success: true, message: 'Board supprimé' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Routes API Utilisateurs
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' })
    }
    const user = await userModel.createUser({ username, email, password })
    res.json({ success: true, user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await userModel.getAllUsers()
    res.json({ success: true, users })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userModel.getUserById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })
    res.json({ success: true, user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const user = await userModel.updateUser(req.params.id, { username, email, password })
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })
    res.json({ success: true, user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    await userModel.deleteUser(req.params.id)
    res.json({ success: true, message: 'Utilisateur supprimé' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Stockage en mémoire pour simuler la base de données
let inMemoryColumns = []
const inMemoryCards = []
let nextColumnId = 1
let nextCardId = 1

// Modèle de colonnes de base
const defaultColumns = [
  { name: 'À faire', position: 1 },
  { name: 'En cours', position: 2 },
  { name: 'Terminé', position: 3 }
]

// Essayer de se connecter à PostgreSQL, sinon utiliser le stockage en mémoire
let useDatabase = true // Activer PostgreSQL par défaut
let pool = null

try {
  const { Pool } = require('pg')

  // Configuration de la connexion PostgreSQL avec les variables d'environnement
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
  })

  // Test de connexion
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Erreur de connexion PostgreSQL:', err.message)
      useDatabase = false
      console.log('⚠️ Basculement vers le stockage en mémoire')
    } else {
      console.log('✅ Connexion à PostgreSQL établie avec succès')
      console.log('📊 Base de données:', process.env.PGDATABASE)
      console.log('👤 Utilisateur:', process.env.PGUSER)
      useDatabase = true
    }
  })
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation PostgreSQL:', error.message)
  useDatabase = false
  console.log('⚠️ PostgreSQL non disponible, utilisation du stockage en mémoire')
}

// Route pour créer les colonnes de base
app.post('/api/columns/create-default', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL - les tables existent déjà grâce au script init_database.sql
      const client = await pool.connect()

      // Vérifier si les colonnes de base existent déjà
      const existingColumns = await client.query('SELECT * FROM columns ORDER BY position')

      if (existingColumns.rows.length === 0) {
        // Insérer les colonnes de base avec l'ID du board par défaut (board_id = 1)
        const defaultBoardId = 1
        const insertPromises = defaultColumns.map(col =>
          client.query(
            'INSERT INTO columns (name, position, board_id) VALUES ($1, $2, $3)',
            [col.name, col.position, defaultBoardId]
          )
        )

        await Promise.all(insertPromises)
      }

      const result = await client.query('SELECT * FROM columns ORDER BY position')
      client.release()

      res.json({
        success: true,
        message: 'Colonnes de base créées avec succès',
        columns: result.rows
      })
    } else {
      // Utiliser le stockage en mémoire
      if (inMemoryColumns.length === 0) {
        inMemoryColumns = defaultColumns.map(col => ({
          id: nextColumnId++,
          name: col.name,
          position: col.position,
          created_at: new Date().toISOString()
        }))
      }

      res.json({
        success: true,
        message: 'Colonnes de base créées avec succès (stockage mémoire)',
        columns: inMemoryColumns
      })
    }
  } catch (error) {
    console.error('Erreur lors de la création des colonnes:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des colonnes',
      error: error.message
    })
  }
})

// Route pour récupérer toutes les colonnes
app.get('/api/columns', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM columns ORDER BY position')
      client.release()

      res.json({
        success: true,
        columns: result.rows
      })
    } else {
      // Utiliser le stockage en mémoire
      res.json({
        success: true,
        columns: inMemoryColumns
      })
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des colonnes:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des colonnes',
      error: error.message
    })
  }
})

// Route pour créer une carte personnalisée
app.post('/api/cards', async (req, res) => {
  try {
    const { title, description, column_id } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le titre de la carte est obligatoire'
      })
    }

    if (!column_id) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de la colonne est obligatoire'
      })
    }

    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect()

      // Vérifier que la colonne existe
      const columnCheck = await client.query('SELECT id FROM columns WHERE id = $1', [column_id])
      if (columnCheck.rows.length === 0) {
        client.release()
        return res.status(400).json({
          success: false,
          message: 'Colonne introuvable'
        })
      }

      // Obtenir la position suivante pour cette colonne
      const positionResult = await client.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM cards WHERE column_id = $1',
        [column_id]
      )
      const nextPosition = positionResult.rows[0].next_position

      const insertResult = await client.query(`
        INSERT INTO cards (title, description, column_id, position)
        VALUES ($1, $2, $3, $4)
        RETURNING *, (SELECT name FROM columns WHERE id = $3) as column_name
      `, [title.trim(), description ? description.trim() : null, column_id, nextPosition])

      client.release()

      res.json({
        success: true,
        message: 'Carte créée avec succès',
        card: insertResult.rows[0]
      })
    } else {
      // Utiliser le stockage en mémoire
      const column = inMemoryColumns.find(col => col.id === column_id)
      if (!column) {
        return res.status(400).json({
          success: false,
          message: 'Colonne introuvable'
        })
      }

      const card = {
        id: nextCardId++,
        title: title.trim(),
        description: description ? description.trim() : '',
        column_id,
        position: inMemoryCards.filter(c => c.column_id === column_id).length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        column_name: column.name
      }

      inMemoryCards.push(card)

      res.json({
        success: true,
        message: 'Carte créée avec succès (stockage mémoire)',
        card
      })
    }
  } catch (error) {
    console.error('Erreur lors de la création de la carte:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la carte',
      error: error.message
    })
  }
})

// Route pour créer une carte de test
app.post('/api/cards/create-test', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL - les tables existent déjà grâce au script init_database.sql
      const client = await pool.connect()

      // Récupérer l'ID de la première colonne (À faire)
      const columnResult = await client.query('SELECT id FROM columns ORDER BY position LIMIT 1')
      if (columnResult.rows.length === 0) {
        client.release()
        return res.status(400).json({
          success: false,
          message: 'Aucune colonne trouvée. Veuillez créer les colonnes de base d\'abord.'
        })
      }

      const columnId = columnResult.rows[0].id

      // Obtenir la position suivante pour cette colonne
      const positionResult = await client.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM cards WHERE column_id = $1',
        [columnId]
      )
      const nextPosition = positionResult.rows[0].next_position

      // Créer une carte de test
      const insertResult = await client.query(`
        INSERT INTO cards (title, description, column_id, position)
        VALUES ($1, $2, $3, $4)
        RETURNING *, (SELECT name FROM columns WHERE id = $3) as column_name
      `, [
        'Carte de test',
        'Ceci est une carte de test pour démontrer la fonctionnalité d\'EpiTrello',
        columnId,
        nextPosition
      ])

      client.release()

      res.json({
        success: true,
        message: 'Carte de test créée avec succès',
        card: insertResult.rows[0]
      })
    } else {
      // Utiliser le stockage en mémoire
      if (inMemoryColumns.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune colonne trouvée. Veuillez créer les colonnes de base d\'abord.'
        })
      }

      const columnId = inMemoryColumns[0].id

      const testCard = {
        id: nextCardId++,
        title: 'Carte de test',
        description: 'Ceci est une carte de test pour démontrer la fonctionnalité d\'EpiTrello',
        column_id: columnId,
        position: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        column_name: inMemoryColumns[0].name
      }

      inMemoryCards.push(testCard)

      res.json({
        success: true,
        message: 'Carte de test créée avec succès (stockage mémoire)',
        card: testCard
      })
    }
  } catch (error) {
    console.error('Erreur lors de la création de la carte de test:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la carte de test',
      error: error.message
    })
  }
})

// Route pour récupérer toutes les cartes
app.get('/api/cards', async (req, res) => {
  try {
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect()
      const result = await client.query(`
        SELECT c.*, col.name as column_name 
        FROM cards c 
        LEFT JOIN columns col ON c.column_id = col.id 
        ORDER BY c.position
      `)
      client.release()

      res.json({
        success: true,
        cards: result.rows
      })
    } else {
      // Utiliser le stockage en mémoire
      const cardsWithColumnNames = inMemoryCards.map(card => ({
        ...card,
        column_name: inMemoryColumns.find(col => col.id === card.column_id)?.name || 'Colonne inconnue'
      }))

      res.json({
        success: true,
        cards: cardsWithColumnNames
      })
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes',
      error: error.message
    })
  }
})

// Route pour récupérer les cartes d'une colonne spécifique
app.get('/api/columns/:columnId/cards', async (req, res) => {
  try {
    const { columnId } = req.params

    if (useDatabase && pool) {
      const client = await pool.connect()
      const result = await client.query(`
        SELECT c.*, col.name as column_name 
        FROM cards c 
        LEFT JOIN columns col ON c.column_id = col.id 
        WHERE c.column_id = $1 
        ORDER BY c.position
      `, [columnId])
      client.release()

      res.json({
        success: true,
        cards: result.rows
      })
    } else {
      // Utiliser le stockage en mémoire
      const columnCards = inMemoryCards
        .filter(card => card.column_id === parseInt(columnId))
        .map(card => ({
          ...card,
          column_name: inMemoryColumns.find(col => col.id === card.column_id)?.name || 'Colonne inconnue'
        }))
        .sort((a, b) => a.position - b.position)

      res.json({
        success: true,
        cards: columnCards
      })
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes de la colonne:', error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cartes de la colonne',
      error: error.message
    })
  }
})

app.get('/', (req, res) => {
  res.send('Bienvenue sur EpiTrello API !')
})

app.listen(port, () => {
  console.log(`Serveur backend EpiTrello lancé sur le port ${port}`)
})
