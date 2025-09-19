const { Pool } = require('pg')
const pool = new Pool()

// Créer un board
async function createBoard({ name, description }) {
  const result = await pool.query(
    'INSERT INTO boards (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  )
  return result.rows[0]
}

// Récupérer un board par son id
async function getBoardById(id) {
  const result = await pool.query('SELECT * FROM boards WHERE id = $1', [id])
  return result.rows[0]
}

// Récupérer tous les boards
async function getAllBoards() {
  const result = await pool.query('SELECT * FROM boards')
  return result.rows
}

// Mettre à jour un board
async function updateBoard(id, { name, description }) {
  const result = await pool.query(
    'UPDATE boards SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  )
  return result.rows[0]
}

// Supprimer un board
async function deleteBoard(id) {
  await pool.query('DELETE FROM boards WHERE id = $1', [id])
  return true
}

module.exports = {
  createBoard,
  getBoardById,
  getAllBoards,
  updateBoard,
  deleteBoard,
}
