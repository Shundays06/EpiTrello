const { Pool } = require('pg')
const pool = new Pool()

// Créer un utilisateur
async function createUser({ username, email, password }) {
  const result = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
    [username, email, password]
  )
  return result.rows[0]
}

// Récupérer un utilisateur par son id
async function getUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0]
}

// Récupérer tous les utilisateurs
async function getAllUsers() {
  const result = await pool.query('SELECT * FROM users')
  return result.rows
}

// Mettre à jour un utilisateur
async function updateUser(id, { username, email, password }) {
  const result = await pool.query(
    'UPDATE users SET username = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
    [username, email, password, id]
  )
  return result.rows[0]
}

// Supprimer un utilisateur
async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id])
  return true
}

module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
}
