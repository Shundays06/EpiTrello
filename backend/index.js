
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const port = process.env.PORT || 3001;

// Import des modèles
const cardModel = require('./models/card')
const boardModel = require('./models/board')
const userModel = require('./models/user')
const invitationModel = require('./models/invitation')
const boardMemberModel = require('./models/boardMember')
const organizationModel = require('./models/organization')
const organizationMemberModel = require('./models/organizationMember')
const permissionModel = require('./models/permission')
const labelModel = require('./models/label')
const checklistModel = require('./models/checklist')
const dueDateModel = require('./models/dueDate')

// Configuration des middlewares
app.use(cors({
  origin: 'http://localhost:3000', // URL du frontend Next.js
  credentials: true
}))

app.use(express.json())

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

  // Tester la connexion
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Erreur de connexion à PostgreSQL:', err.message)
      console.log('🔄 Bascule vers le stockage en mémoire')
      useDatabase = false
      pool = null
    } else {
      console.log('✅ Connexion à PostgreSQL établie avec succès')
      console.log('📊 Base de données:', process.env.PGDATABASE || 'epitrello')
      console.log('👤 Utilisateur:', process.env.PGUSER || 'postgres')
      release() // Libérer le client de test
    }
  })
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de PostgreSQL:', error.message)
  console.log('🔄 Utilisation du stockage en mémoire')
  useDatabase = false
  pool = null
}

// Configuration de la base de données

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
    const { name, board_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom de la colonne est obligatoire' });
    }
    const boardId = board_id ? parseInt(board_id) : 1;
    
    if (useDatabase && pool) {
      const client = await pool.connect();
      
      // Calculer la position suivante en prenant le MAX + 1
      const positionResult = await client.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM columns WHERE board_id = $1',
        [boardId]
      );
      const nextPosition = positionResult.rows[0].next_position;
      
      const result = await client.query(
        'INSERT INTO columns (name, position, board_id) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), nextPosition, boardId]
      );
      client.release();
      res.json({ success: true, column: result.rows[0] });
    } else {
      // Pour le stockage en mémoire, calculer la position suivante
      const existingColumns = inMemoryColumns.filter(col => col.board_id === boardId);
      const nextPosition = existingColumns.length > 0 
        ? Math.max(...existingColumns.map(col => col.position)) + 1 
        : 1;
        
      const newCol = {
        id: nextColumnId++,
        name: name.trim(),
        position: nextPosition,
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

// Route pour récupérer les cartes d'un board spécifique
app.get('/api/boards/:boardId/cards', async (req, res) => {
  try {
    const { boardId } = req.params
    const cards = await cardModel.getCardsByBoard(boardId)
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

// Route pour déplacer une carte
app.patch('/api/cards/:id/move', async (req, res) => {
  try {
    const { id } = req.params
    const { column_id, position } = req.body
    
    if (!column_id) {
      return res.status(400).json({ success: false, message: 'column_id est requis' })
    }

    const card = await cardModel.moveCard(id, { column_id, position })
    if (!card) return res.status(404).json({ success: false, message: 'Carte non trouvée' })
    
    res.json({ success: true, card })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Routes API Boards
app.post('/api/boards', async (req, res) => {
  try {
    const { name, description, owner_id, organization_id } = req.body
    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom du board est requis' })
    }
    if (!owner_id) {
      return res.status(400).json({ success: false, message: 'L\'ID du propriétaire est requis' })
    }

    const board = await boardModel.createBoard({ name, description, owner_id, organization_id })
    
    // Créer automatiquement les trois colonnes de base pour le nouveau board
    if (useDatabase && pool) {
      const client = await pool.connect()
      try {
        for (const col of defaultColumns) {
          await client.query(
            'INSERT INTO columns (name, position, board_id) VALUES ($1, $2, $3)',
            [col.name, col.position, board.id]
          )
        }
      } finally {
        client.release()
      }
    } else {
      // Pour le stockage en mémoire
      for (const col of defaultColumns) {
        inMemoryColumns.push({
          id: nextColumnId++,
          name: col.name,
          position: col.position,
          board_id: board.id,
          created_at: new Date().toISOString()
        })
      }
    }
    
    res.json({ success: true, board })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/boards', async (req, res) => {
  try {
    const { user_id } = req.query
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id requis pour récupérer les boards' 
      })
    }

    const boards = await boardModel.getAllBoards(user_id)
    res.json({ success: true, boards })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/boards/:id', async (req, res) => {
  try {
    const { user_id } = req.query
    const board = await boardModel.getBoardById(req.params.id, user_id)
    
    if (!board) {
      return res.status(404).json({ 
        success: false, 
        message: user_id ? 'Board non trouvé ou accès refusé' : 'Board non trouvé' 
      })
    }
    
    res.json({ success: true, board })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/boards/:id', async (req, res) => {
  try {
    const { name, description, user_id } = req.body
    const board = await boardModel.updateBoard(req.params.id, { name, description }, user_id)
    
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board non trouvé' })
    }
    
    res.json({ success: true, board })
  } catch (error) {
    if (error.message.includes('Permissions insuffisantes')) {
      res.status(403).json({ success: false, message: error.message })
    } else {
      res.status(500).json({ success: false, message: error.message })
    }
  }
})

app.delete('/api/boards/:id', async (req, res) => {
  try {
    const { user_id } = req.body
    await boardModel.deleteBoard(req.params.id, user_id)
    res.json({ success: true, message: 'Board supprimé' })
  } catch (error) {
    if (error.message.includes('Seul le propriétaire')) {
      res.status(403).json({ success: false, message: error.message })
    } else {
      res.status(500).json({ success: false, message: error.message })
    }
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

// Route pour créer des utilisateurs par défaut
app.post('/api/users/create-default', async (req, res) => {
  try {
    const defaultUsers = [
      { username: 'Admin', email: 'admin@epitrello.com', password: 'password123' },
      { username: 'Dev1', email: 'dev1@epitrello.com', password: 'password123' },
      { username: 'Dev2', email: 'dev2@epitrello.com', password: 'password123' },
      { username: 'Designer', email: 'designer@epitrello.com', password: 'password123' },
      { username: 'PM', email: 'pm@epitrello.com', password: 'password123' }
    ];

    const existingUsers = await userModel.getAllUsers();
    
    if (existingUsers.length === 0) {
      const createdUsers = [];
      for (const userData of defaultUsers) {
        try {
          const user = await userModel.createUser(userData);
          createdUsers.push(user);
        } catch (error) {
          console.log(`Utilisateur ${userData.username} existe déjà ou erreur:`, error.message);
        }
      }
      res.json({ 
        success: true, 
        message: `${createdUsers.length} utilisateurs par défaut créés`, 
        users: createdUsers 
      });
    } else {
      res.json({ 
        success: true, 
        message: 'Des utilisateurs existent déjà', 
        users: existingUsers 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
})

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
    const { board_id } = req.query;
    
    if (useDatabase && pool) {
      // Utiliser PostgreSQL
      const client = await pool.connect()
      let result;
      
      if (board_id) {
        // Filtrer par board_id si fourni
        result = await client.query('SELECT * FROM columns WHERE board_id = $1 ORDER BY position', [parseInt(board_id)])
      } else {
        // Retourner toutes les colonnes sinon
        result = await client.query('SELECT * FROM columns ORDER BY position')
      }
      
      client.release()

      res.json({
        success: true,
        columns: result.rows
      })
    } else {
      // Utiliser le stockage en mémoire
      let columns = inMemoryColumns;
      
      if (board_id) {
        // Filtrer par board_id si fourni
        columns = inMemoryColumns.filter(col => col.board_id === parseInt(board_id));
      }
      
      res.json({
        success: true,
        columns: columns
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

// Route pour supprimer une colonne
app.delete('/api/columns/:id', async (req, res) => {
  try {
    const columnId = parseInt(req.params.id);
    
    if (useDatabase && pool) {
      const client = await pool.connect();
      
      // Vérifier si la colonne existe
      const columnCheck = await client.query('SELECT * FROM columns WHERE id = $1', [columnId]);
      if (columnCheck.rows.length === 0) {
        client.release();
        return res.status(404).json({
          success: false,
          message: 'Colonne non trouvée'
        });
      }
      
      // Supprimer toutes les cartes de cette colonne d'abord
      await client.query('DELETE FROM cards WHERE column_id = $1', [columnId]);
      
      // Supprimer la colonne
      await client.query('DELETE FROM columns WHERE id = $1', [columnId]);
      
      client.release();
      
      res.json({
        success: true,
        message: 'Colonne supprimée avec succès'
      });
    } else {
      // Utiliser le stockage en mémoire
      const columnIndex = inMemoryColumns.findIndex(col => col.id === columnId);
      
      if (columnIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Colonne non trouvée'
        });
      }
      
      // Supprimer les cartes de cette colonne d'abord
      const cardsToRemove = inMemoryCards.filter(card => card.column_id === columnId);
      cardsToRemove.forEach(card => {
        const cardIndex = inMemoryCards.findIndex(c => c.id === card.id);
        if (cardIndex > -1) {
          inMemoryCards.splice(cardIndex, 1);
        }
      });
      
      // Supprimer la colonne
      inMemoryColumns.splice(columnIndex, 1);
      
      res.json({
        success: true,
        message: 'Colonne supprimée avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la colonne:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la colonne',
      error: error.message
    });
  }
});

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

// Routes API Board Members
app.get('/api/boards/:boardId/members', async (req, res) => {
  try {
    const { boardId } = req.params
    const { user_id } = req.query

    // Vérifier que l'utilisateur a accès au board
    if (user_id) {
      const hasAccess = await boardMemberModel.hasAccessToBoard(user_id, boardId)
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès refusé à ce board' 
        })
      }
    }

    const members = await boardMemberModel.getBoardMembers(boardId)
    res.json({ success: true, members })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/boards/:boardId/members', async (req, res) => {
  try {
    const { boardId } = req.params
    const { user_id, role = 'member', added_by } = req.body

    if (!user_id || !added_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id et added_by sont requis' 
      })
    }

    // Vérifier que celui qui ajoute a les permissions (owner ou admin)
    const adderAccess = await boardMemberModel.hasAccessToBoard(added_by, boardId)
    if (!adderAccess || !['owner', 'admin'].includes(adderAccess.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permissions insuffisantes pour ajouter des membres' 
      })
    }

    const member = await boardMemberModel.addMemberToBoard({
      board_id: parseInt(boardId),
      user_id: parseInt(user_id),
      role,
      added_by: parseInt(added_by)
    })

    res.json({ success: true, member })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/boards/:boardId/members/:userId', async (req, res) => {
  try {
    const { boardId, userId } = req.params
    const { removed_by } = req.body

    // Vérifier que celui qui supprime a les permissions
    if (removed_by) {
      const removerAccess = await boardMemberModel.hasAccessToBoard(removed_by, boardId)
      if (!removerAccess || !['owner', 'admin'].includes(removerAccess.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permissions insuffisantes pour supprimer des membres' 
        })
      }
    }

    const removedMember = await boardMemberModel.removeMemberFromBoard(
      parseInt(boardId), 
      parseInt(userId)
    )

    if (!removedMember) {
      return res.status(404).json({ 
        success: false, 
        message: 'Membre non trouvé' 
      })
    }

    res.json({ success: true, message: 'Membre supprimé du board' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Mettre à jour le système d'invitations pour ajouter automatiquement l'utilisateur au board
app.post('/api/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await invitationModel.acceptInvitation(token);
    
    // Ajouter l'utilisateur au board automatiquement
    try {
      await boardMemberModel.addMemberToBoard({
        board_id: result.invitation.board_id,
        user_id: result.user.id,
        role: 'member',
        added_by: result.invitation.invited_by
      })
    } catch (memberError) {
      // Si l'utilisateur est déjà membre, ce n'est pas grave
      console.log('Utilisateur déjà membre du board ou erreur:', memberError.message)
    }
    
    res.json({ 
      success: true, 
      message: 'Invitation acceptée avec succès et accès au board accordé',
      invitation: result.invitation,
      user: result.user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Routes API Invitations
app.post('/api/invitations', async (req, res) => {
  try {
    const { email, board_id, invited_by } = req.body;
    
    if (!email || !board_id || !invited_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, board_id et invited_by sont requis' 
      });
    }

    // Valider le format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Format d\'email invalide' 
      });
    }

    // Vérifier que le board existe
    const board = await boardModel.getBoardById(board_id);
    if (!board) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board non trouvé' 
      });
    }

    // Vérifier que l'utilisateur qui invite existe
    const inviter = await userModel.getUserById(invited_by);
    if (!inviter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur invitant non trouvé' 
      });
    }

    const invitation = await invitationModel.createInvitation({
      email,
      board_id: parseInt(board_id),
      invited_by: parseInt(invited_by)
    });

    res.json({ 
      success: true, 
      message: 'Invitation créée avec succès',
      invitation 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/invitations', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email requis en paramètre de requête' 
      });
    }

    const invitations = await invitationModel.getInvitationsByEmail(email);
    
    res.json({ 
      success: true, 
      invitations 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/invitations/all', async (req, res) => {
  try {
    const invitations = await invitationModel.getAllInvitations();
    
    res.json({ 
      success: true, 
      invitations 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/invitations/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = await invitationModel.getInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invitation non trouvée' 
      });
    }

    res.json({ 
      success: true, 
      invitation 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post('/api/invitations/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = await invitationModel.declineInvitation(token);
    
    res.json({ 
      success: true, 
      message: 'Invitation déclinée',
      invitation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES ORGANISATIONS
// =====================================

// Créer une organisation
app.post('/api/organizations', async (req, res) => {
  try {
    const { name, description, owner_id } = req.body;
    
    if (!name || !owner_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nom et le propriétaire sont requis' 
      });
    }

    const organization = await organizationModel.createOrganization({
      name,
      description: description || '',
      owner_id
    });

    res.status(201).json({ 
      success: true, 
      organization 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer toutes les organisations (avec accès utilisateur)
app.get('/api/organizations', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    const organizations = await organizationModel.getAllOrganizations(user_id ? parseInt(user_id) : null);
    
    res.json({ 
      success: true, 
      organizations 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer une organisation par son ID
app.get('/api/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    
    const organization = await organizationModel.getOrganizationById(
      parseInt(id), 
      user_id ? parseInt(user_id) : null
    );
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organisation non trouvée ou accès refusé' 
      });
    }

    // Récupérer aussi les membres
    const members = await organizationMemberModel.getOrganizationMembers(parseInt(id));
    
    res.json({ 
      success: true, 
      organization: {
        ...organization,
        members
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Mettre à jour une organisation
app.put('/api/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, user_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nom est requis' 
      });
    }

    const organization = await organizationModel.updateOrganization(
      parseInt(id),
      { name, description },
      user_id ? parseInt(user_id) : null
    );
    
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organisation non trouvée' 
      });
    }

    res.json({ 
      success: true, 
      organization 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Supprimer une organisation
app.delete('/api/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    const success = await organizationModel.deleteOrganization(
      parseInt(id),
      user_id ? parseInt(user_id) : null
    );
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organisation non trouvée' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Organisation supprimée avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES MEMBRES D'ORGANISATION
// =====================================

// Ajouter un membre à une organisation
app.post('/api/organizations/:id/add-member', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'member', added_by } = req.body;
    
    if (!user_id || !added_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'L\'ID utilisateur et l\'ajouteur sont requis' 
      });
    }

    // Vérifier que l'ajouteur a les permissions
    const adderRole = await organizationMemberModel.isMemberOfOrganization(parseInt(id), parseInt(added_by));
    if (!adderRole || !['owner', 'admin'].includes(adderRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Permissions insuffisantes pour ajouter des membres' 
      });
    }

    const member = await organizationMemberModel.addMemberToOrganization({
      organization_id: parseInt(id),
      user_id: parseInt(user_id),
      role,
      added_by: parseInt(added_by)
    });

    res.status(201).json({ 
      success: true, 
      member 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les membres d'une organisation
app.get('/api/organizations/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    
    // Vérifier que l'utilisateur a accès à l'organisation
    if (user_id) {
      const userRole = await organizationMemberModel.isMemberOfOrganization(parseInt(id), parseInt(user_id));
      if (!userRole) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès refusé à cette organisation' 
        });
      }
    }

    const members = await organizationMemberModel.getOrganizationMembers(parseInt(id));
    
    res.json({ 
      success: true, 
      members 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Mettre à jour le rôle d'un membre
app.put('/api/organizations/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role, updated_by } = req.body;
    
    if (!role || !updated_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le rôle et l\'ID de l\'utilisateur qui modifie sont requis' 
      });
    }

    const member = await organizationMemberModel.updateMemberRole(
      parseInt(id),
      parseInt(userId),
      role,
      parseInt(updated_by)
    );

    res.json({ 
      success: true, 
      member 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Retirer un membre d'une organisation
app.delete('/api/organizations/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { removed_by } = req.body;
    
    if (!removed_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'L\'ID de l\'utilisateur qui retire est requis' 
      });
    }

    const success = await organizationMemberModel.removeMemberFromOrganization(
      parseInt(id),
      parseInt(userId),
      parseInt(removed_by)
    );
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Membre non trouvé' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Membre retiré avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Quitter une organisation (auto-retrait)
app.post('/api/organizations/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'L\'ID utilisateur est requis' 
      });
    }

    const success = await organizationMemberModel.leaveOrganization(
      parseInt(id),
      parseInt(user_id)
    );
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vous n\'êtes pas membre de cette organisation' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Vous avez quitté l\'organisation avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES LABELS
// =====================================

// Créer un label
app.post('/api/labels', async (req, res) => {
  try {
    const { name, color, board_id, created_by } = req.body;
    
    if (!name || !color || !board_id || !created_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'name, color, board_id et created_by sont requis' 
      });
    }

    const label = await labelModel.createLabel({
      name: name.trim(),
      color,
      board_id: parseInt(board_id),
      created_by: parseInt(created_by)
    });

    res.status(201).json({ 
      success: true, 
      label 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les labels d'un board
app.get('/api/boards/:boardId/labels', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const labels = await labelModel.getLabelsByBoard(parseInt(boardId));
    
    res.json({ 
      success: true, 
      labels 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Mettre à jour un label
app.put('/api/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, user_id } = req.body;
    
    if (!name || !color) {
      return res.status(400).json({ 
        success: false, 
        message: 'name et color sont requis' 
      });
    }

    const label = await labelModel.updateLabel(
      parseInt(id),
      { name: name.trim(), color },
      user_id ? parseInt(user_id) : null
    );
    
    if (!label) {
      return res.status(404).json({ 
        success: false, 
        message: 'Label non trouvé' 
      });
    }

    res.json({ 
      success: true, 
      label 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Supprimer un label
app.delete('/api/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await labelModel.deleteLabel(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Label non trouvé' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Label supprimé avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Ajouter un label à une carte
app.post('/api/cards/:cardId/labels/:labelId', async (req, res) => {
  try {
    const { cardId, labelId } = req.params;
    const { added_by } = req.body;
    
    if (!added_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'added_by est requis' 
      });
    }

    const cardLabel = await labelModel.addLabelToCard(
      parseInt(cardId),
      parseInt(labelId),
      parseInt(added_by)
    );

    if (!cardLabel) {
      return res.status(409).json({ 
        success: false, 
        message: 'Ce label est déjà associé à cette carte' 
      });
    }

    res.status(201).json({ 
      success: true, 
      cardLabel 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Retirer un label d'une carte
app.delete('/api/cards/:cardId/labels/:labelId', async (req, res) => {
  try {
    const { cardId, labelId } = req.params;
    
    const success = await labelModel.removeLabelFromCard(
      parseInt(cardId),
      parseInt(labelId)
    );
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Association carte-label non trouvée' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Label retiré de la carte avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les labels d'une carte
app.get('/api/cards/:cardId/labels', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const labels = await labelModel.getCardLabels(parseInt(cardId));
    
    res.json({ 
      success: true, 
      labels 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les cartes avec leurs labels
app.get('/api/boards/:boardId/cards-with-labels', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const cards = await labelModel.getCardsWithLabels(parseInt(boardId));
    
    res.json({ 
      success: true, 
      cards 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les couleurs disponibles pour les labels
app.get('/api/labels/colors', async (req, res) => {
  try {
    const colors = labelModel.getAvailableColors();
    
    res.json({ 
      success: true, 
      colors 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES CHECKLISTS
// =====================================

// Créer une nouvelle checklist pour une carte
app.post('/api/cards/:cardId/checklists', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, user_id } = req.body;
    
    if (!title || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'title et user_id sont requis' 
      });
    }
    
    const checklist = await checklistModel.createChecklist(
      parseInt(cardId),
      title,
      parseInt(user_id)
    );
    
    res.json({ 
      success: true, 
      checklist 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Obtenir toutes les checklists d'une carte
app.get('/api/cards/:cardId/checklists', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const checklists = await checklistModel.getChecklistsByCardId(parseInt(cardId));
    
    res.json({ 
      success: true, 
      checklists 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Modifier une checklist
app.put('/api/checklists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, user_id } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'title est requis' 
      });
    }
    
    const checklist = await checklistModel.updateChecklist(
      parseInt(id),
      title,
      parseInt(user_id)
    );
    
    if (!checklist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checklist non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      checklist 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Supprimer une checklist
app.delete('/api/checklists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await checklistModel.deleteChecklist(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checklist non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Checklist supprimée avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Créer un nouvel élément de checklist
app.post('/api/checklists/:checklistId/items', async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { text, user_id } = req.body;
    
    if (!text || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'text et user_id sont requis' 
      });
    }
    
    const item = await checklistModel.createChecklistItem(
      parseInt(checklistId),
      text,
      parseInt(user_id)
    );
    
    res.json({ 
      success: true, 
      item 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Obtenir tous les éléments d'une checklist
app.get('/api/checklists/:checklistId/items', async (req, res) => {
  try {
    const { checklistId } = req.params;
    
    const items = await checklistModel.getChecklistItems(parseInt(checklistId));
    
    res.json({ 
      success: true, 
      items 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Modifier un élément de checklist
app.put('/api/checklist-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, is_completed, user_id } = req.body;
    
    if (text === undefined && is_completed === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'text ou is_completed est requis' 
      });
    }
    
    const item = await checklistModel.updateChecklistItem(
      parseInt(id),
      text,
      is_completed,
      parseInt(user_id)
    );
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Élément de checklist non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      item 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Supprimer un élément de checklist
app.delete('/api/checklist-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await checklistModel.deleteChecklistItem(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        message: 'Élément de checklist non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Élément de checklist supprimé avec succès' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES DATES D'ÉCHÉANCE ET NOTIFICATIONS
// =====================================

// Définir une date d'échéance pour une carte
app.put('/api/cards/:cardId/due-date', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { due_date, user_id } = req.body;
    
    if (!due_date || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'due_date et user_id sont requis' 
      });
    }
    
    const card = await dueDateModel.updateCardDueDate(
      parseInt(cardId),
      due_date,
      parseInt(user_id)
    );
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'Carte non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      card 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Marquer une date d'échéance comme terminée ou non terminée
app.put('/api/cards/:cardId/due-date/complete', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { user_id, completed = true } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id est requis' 
      });
    }
    
    let card;
    if (completed) {
      card = await dueDateModel.markDueDateCompleted(
        parseInt(cardId),
        parseInt(user_id)
      );
    } else {
      card = await dueDateModel.markDueDateUncompleted(parseInt(cardId));
    }
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'Carte non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      card 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Supprimer une date d'échéance
app.delete('/api/cards/:cardId/due-date', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await dueDateModel.removeDueDate(parseInt(cardId));
    
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'Carte non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      card 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Obtenir les cartes dues bientôt pour un utilisateur
app.get('/api/users/:userId/cards-due-soon', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const cards = await dueDateModel.getCardsDueSoon(parseInt(userId));
    
    res.json({ 
      success: true, 
      cards 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Obtenir les notifications d'un utilisateur
app.get('/api/users/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    const notifications = await dueDateModel.getUserNotifications(
      parseInt(userId), 
      parseInt(limit) || 20
    );
    
    res.json({ 
      success: true, 
      notifications 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Marquer une notification comme lue
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id est requis' 
      });
    }
    
    const notification = await dueDateModel.markNotificationAsRead(
      parseInt(notificationId),
      parseInt(user_id)
    );
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification non trouvée' 
      });
    }
    
    res.json({ 
      success: true, 
      notification 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Marquer toutes les notifications comme lues
app.put('/api/users/:userId/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await dueDateModel.markAllNotificationsAsRead(parseInt(userId));
    
    res.json({ 
      success: true, 
      updated: result.updated 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Obtenir le nombre de notifications non lues
app.get('/api/users/:userId/notifications/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const count = await dueDateModel.getUnreadNotificationCount(parseInt(userId));
    
    res.json({ 
      success: true, 
      count 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Créer manuellement les notifications d'échéance (pour tester)
app.post('/api/notifications/create-due-date-notifications', async (req, res) => {
  try {
    await dueDateModel.createDueDateNotifications();
    
    res.json({ 
      success: true, 
      message: 'Notifications d\'échéance créées' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// =====================================
// ROUTES POUR LES PERMISSIONS
// =====================================

// Vérifier si un utilisateur a une permission spécifique
app.post('/api/permissions/check', async (req, res) => {
  try {
    const { user_id, permission, context, resource_id } = req.body;
    
    if (!user_id || !permission || !context) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id, permission et context sont requis' 
      });
    }

    const hasPermission = await permissionModel.userHasPermission(
      parseInt(user_id),
      permission,
      context,
      resource_id ? parseInt(resource_id) : null
    );

    res.json({ 
      success: true, 
      hasPermission,
      user_id,
      permission,
      context,
      resource_id
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer toutes les permissions d'un utilisateur
app.get('/api/users/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const permissions = await permissionModel.getUserPermissions(parseInt(userId));
    
    res.json({ 
      success: true, 
      permissions,
      user_id: parseInt(userId)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer toutes les permissions disponibles
app.get('/api/permissions', async (req, res) => {
  try {
    const permissions = await permissionModel.getAllPermissions();
    
    res.json({ 
      success: true, 
      permissions 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Récupérer les organisations d'un utilisateur
app.get('/api/users/:userId/organizations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const organizations = await organizationMemberModel.getUserOrganizations(parseInt(userId));
    
    res.json({ 
      success: true, 
      organizations 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/', (req, res) => {
  res.send('Bienvenue sur EpiTrello API !')
})

app.listen(port, async () => {
  console.log(`Serveur backend EpiTrello lancé sur le port ${port}`)
  
  // Initialiser les tables de checklists
  await checklistModel.initializeTables();
  
  // Initialiser les tables de dates d'échéance et notifications
  await dueDateModel.initializeTables();
  
  // Créer les notifications d'échéance toutes les 30 minutes
  setInterval(async () => {
    await dueDateModel.createDueDateNotifications();
  }, 30 * 60 * 1000); // 30 minutes
})
