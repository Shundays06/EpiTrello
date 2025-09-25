const { Pool } = require('pg')
const pool = new Pool()

// Créer une carte
async function createCard({ title, description, board_id, column_id, assigned_user_id }) {
  const result = await pool.query(
    'INSERT INTO cards (title, description, board_id, column_id, assigned_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, description, board_id, column_id, assigned_user_id]
  )
  return result.rows[0]
}

// Récupérer une carte par son id
async function getCardById(id) {
  const result = await pool.query('SELECT * FROM cards WHERE id = $1', [id])
  return result.rows[0]
}

// Récupérer toutes les cartes d'un board
async function getCardsByBoard(board_id) {
  const result = await pool.query('SELECT * FROM cards WHERE board_id = $1', [board_id])
  return result.rows
}

// Mettre à jour une carte
async function updateCard(id, { title, description, column_id, assigned_user_id }) {
  const result = await pool.query(
    'UPDATE cards SET title = $1, description = $2, column_id = $3, assigned_user_id = $4 WHERE id = $5 RETURNING *',
    [title, description, column_id, assigned_user_id, id]
  )
  return result.rows[0]
}

// Supprimer une carte
async function deleteCard(id) {
  await pool.query('DELETE FROM cards WHERE id = $1', [id])
  return true
}

// Déplacer une carte vers une nouvelle colonne/position
async function moveCard(id, { column_id, position }) {
  const result = await pool.query(
    'UPDATE cards SET column_id = $1, position = COALESCE($2, position) WHERE id = $3 RETURNING *',
    [column_id, position, id]
  )
  return result.rows[0]
}

module.exports = {
  createCard,
  getCardById,
  getCardsByBoard,
  updateCard,
  deleteCard,
  moveCard,
}
