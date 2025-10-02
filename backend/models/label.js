const { getDbInstance } = require('../config/database');

class LabelModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Créer un label
  async createLabel({ name, color, board_id, created_by }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO labels (name, color, board_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, color, board_id, created_by]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.labels) {
        this.db.inMemoryData.labels = [];
      }

      const label = {
        id: this.db.inMemoryData.labels.length + 1,
        name,
        color,
        board_id: parseInt(board_id),
        created_by: parseInt(created_by),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.db.inMemoryData.labels.push(label);
      return label;
    }
  }

  // Récupérer tous les labels d'un board
  async getLabelsByBoard(board_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM labels WHERE board_id = $1 ORDER BY name',
          [board_id]
        );
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.labels) {
        return [];
      }

      return this.db.inMemoryData.labels
        .filter(label => label.board_id === parseInt(board_id))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  // Mettre à jour un label
  async updateLabel(id, { name, color }, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'UPDATE labels SET name = $1, color = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [name, color, id]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.labels) {
        return null;
      }

      const labelIndex = this.db.inMemoryData.labels.findIndex(l => l.id === parseInt(id));
      if (labelIndex === -1) {
        return null;
      }

      this.db.inMemoryData.labels[labelIndex] = {
        ...this.db.inMemoryData.labels[labelIndex],
        name,
        color,
        updated_at: new Date().toISOString()
      };

      return this.db.inMemoryData.labels[labelIndex];
    }
  }

  // Supprimer un label
  async deleteLabel(id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        await client.query('DELETE FROM labels WHERE id = $1', [id]);
        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.labels) {
        return false;
      }

      const labelIndex = this.db.inMemoryData.labels.findIndex(l => l.id === parseInt(id));
      if (labelIndex === -1) {
        return false;
      }

      this.db.inMemoryData.labels.splice(labelIndex, 1);

      // Supprimer aussi les associations cartes-labels
      if (this.db.inMemoryData.card_labels) {
        this.db.inMemoryData.card_labels = this.db.inMemoryData.card_labels.filter(
          cl => cl.label_id !== parseInt(id)
        );
      }

      return true;
    }
  }

  // Ajouter un label à une carte
  async addLabelToCard(card_id, label_id, added_by) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO card_labels (card_id, label_id, added_by) VALUES ($1, $2, $3) RETURNING *',
          [card_id, label_id, added_by]
        );
        return result.rows[0];
      } catch (error) {
        // Ignore les erreurs de doublons
        if (error.code === '23505') {
          return null; // Déjà associé
        }
        throw error;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.card_labels) {
        this.db.inMemoryData.card_labels = [];
      }

      // Vérifier si l'association existe déjà
      const existing = this.db.inMemoryData.card_labels.find(
        cl => cl.card_id === parseInt(card_id) && cl.label_id === parseInt(label_id)
      );

      if (existing) {
        return null; // Déjà associé
      }

      const cardLabel = {
        id: this.db.inMemoryData.card_labels.length + 1,
        card_id: parseInt(card_id),
        label_id: parseInt(label_id),
        added_by: parseInt(added_by),
        added_at: new Date().toISOString()
      };

      this.db.inMemoryData.card_labels.push(cardLabel);
      return cardLabel;
    }
  }

  // Retirer un label d'une carte
  async removeLabelFromCard(card_id, label_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        await client.query(
          'DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2',
          [card_id, label_id]
        );
        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.card_labels) {
        return false;
      }

      const index = this.db.inMemoryData.card_labels.findIndex(
        cl => cl.card_id === parseInt(card_id) && cl.label_id === parseInt(label_id)
      );

      if (index === -1) {
        return false;
      }

      this.db.inMemoryData.card_labels.splice(index, 1);
      return true;
    }
  }

  // Récupérer les labels d'une carte
  async getCardLabels(card_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT l.*, cl.added_at, cl.added_by
          FROM labels l
          INNER JOIN card_labels cl ON l.id = cl.label_id
          WHERE cl.card_id = $1
          ORDER BY l.name
        `, [card_id]);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.card_labels || !this.db.inMemoryData.labels) {
        return [];
      }

      const cardLabels = this.db.inMemoryData.card_labels.filter(
        cl => cl.card_id === parseInt(card_id)
      );

      return cardLabels.map(cl => {
        const label = this.db.inMemoryData.labels.find(l => l.id === cl.label_id);
        return {
          ...label,
          added_at: cl.added_at,
          added_by: cl.added_by
        };
      }).filter(label => label.id) // Filtrer les labels inexistants
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  // Récupérer les cartes avec leurs labels (vue optimisée)
  async getCardsWithLabels(board_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM cards_with_labels 
          WHERE board_id = $1 
          ORDER BY column_id, position
        `, [board_id]);
        
        // Parser le JSON des labels
        return result.rows.map(row => ({
          ...row,
          labels: typeof row.labels === 'string' ? JSON.parse(row.labels) : row.labels
        }));
      } finally {
        client.release();
      }
    } else {
      // Version en mémoire
      if (!this.db.inMemoryData.cards) {
        return [];
      }

      const cards = this.db.inMemoryData.cards.filter(
        card => card.board_id === parseInt(board_id)
      );

      // Ajouter les labels à chaque carte
      const cardsWithLabels = await Promise.all(
        cards.map(async (card) => ({
          ...card,
          labels: await this.getCardLabels(card.id)
        }))
      );

      return cardsWithLabels.sort((a, b) => {
        if (a.column_id !== b.column_id) {
          return a.column_id - b.column_id;
        }
        return (a.position || 0) - (b.position || 0);
      });
    }
  }

  // Couleurs disponibles pour les labels
  getAvailableColors() {
    return [
      { name: 'Rouge', value: 'red', hex: '#ef4444' },
      { name: 'Orange', value: 'orange', hex: '#f97316' },
      { name: 'Jaune', value: 'yellow', hex: '#eab308' },
      { name: 'Vert', value: 'green', hex: '#22c55e' },
      { name: 'Bleu', value: 'blue', hex: '#3b82f6' },
      { name: 'Indigo', value: 'indigo', hex: '#6366f1' },
      { name: 'Violet', value: 'purple', hex: '#a855f7' },
      { name: 'Rose', value: 'pink', hex: '#ec4899' },
      { name: 'Gris', value: 'gray', hex: '#6b7280' },
      { name: 'Noir', value: 'black', hex: '#1f2937' }
    ];
  }

  // Créer les labels par défaut pour un nouveau board
  async createDefaultLabelsForBoard(board_id, owner_id) {
    const defaultLabels = [
      { name: 'Priorité haute', color: 'red' },
      { name: 'En cours', color: 'yellow' },
      { name: 'Terminé', color: 'green' },
      { name: 'Bug', color: 'orange' },
      { name: 'Feature', color: 'blue' },
      { name: 'Design', color: 'purple' }
    ];

    const createdLabels = [];
    for (const labelData of defaultLabels) {
      try {
        const label = await this.createLabel({
          ...labelData,
          board_id,
          created_by: owner_id
        });
        createdLabels.push(label);
      } catch (error) {
        // Ignorer les erreurs de doublons
        console.log(`Label ${labelData.name} déjà existant pour le board ${board_id}`);
      }
    }

    return createdLabels;
  }
}

module.exports = new LabelModel();
