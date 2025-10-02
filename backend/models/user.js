const { getDbInstance } = require('../config/database');

class UserModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Créer un utilisateur
  async createUser({ username, email, password }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
          [username, email, password]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.users) {
        this.db.inMemoryData.users = [];
      }

      // Vérifier l'unicité de l'email et du username
      const existingUser = this.db.inMemoryData.users.find(
        u => u.email === email || u.username === username
      );

      if (existingUser) {
        throw new Error('Email ou nom d\'utilisateur déjà utilisé');
      }

      const user = {
        id: this.db.inMemoryData.users.length + 1,
        username,
        email,
        password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.db.inMemoryData.users.push(user);
      return user;
    }
  }

  // Récupérer un utilisateur par son id
  async getUserById(id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.users) {
        return null;
      }
      return this.db.inMemoryData.users.find(u => u.id === parseInt(id)) || null;
    }
  }

  // Récupérer un utilisateur par son email
  async getUserByEmail(email) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.users) {
        return null;
      }
      return this.db.inMemoryData.users.find(u => u.email === email) || null;
    }
  }

  // Récupérer tous les utilisateurs
  async getAllUsers() {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      return this.db.inMemoryData.users || [];
    }
  }

  // Mettre à jour un utilisateur
  async updateUser(id, { username, email, password }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'UPDATE users SET username = $1, email = $2, password = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
          [username, email, password, id]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.users) {
        return null;
      }

      const userIndex = this.db.inMemoryData.users.findIndex(u => u.id === parseInt(id));
      if (userIndex === -1) {
        return null;
      }

      this.db.inMemoryData.users[userIndex] = {
        ...this.db.inMemoryData.users[userIndex],
        username,
        email,
        password,
        updated_at: new Date().toISOString()
      };

      return this.db.inMemoryData.users[userIndex];
    }
  }

  // Supprimer un utilisateur
  async deleteUser(id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.users) {
        return false;
      }

      const userIndex = this.db.inMemoryData.users.findIndex(u => u.id === parseInt(id));
      if (userIndex === -1) {
        return false;
      }

      this.db.inMemoryData.users.splice(userIndex, 1);
      return true;
    }
  }
}

module.exports = new UserModel();
