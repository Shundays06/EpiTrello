const { getDbInstance } = require('../config/database');

class DueDate {
  static async updateCardDueDate(cardId, dueDate, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE cards 
           SET due_date = $1, due_date_completed = false, due_date_completed_at = NULL, due_date_completed_by = NULL
           WHERE id = $2 
           RETURNING *`,
          [dueDate, cardId]
        );
        
        // Créer une notification si la carte est assignée à quelqu'un
        if (result.rows[0] && result.rows[0].assigned_user_id && result.rows[0].assigned_user_id !== userId) {
          await this.createNotification(
            result.rows[0].assigned_user_id,
            cardId,
            'due_date_set',
            'Date d\'échéance définie',
            `Une date d'échéance a été définie pour la carte "${result.rows[0].title}"`,
            { due_date: dueDate, set_by: userId }
          );
        }
        
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la date d\'échéance:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.cards) return null;
      const card = inMemoryData.cards.find(c => c.id === cardId);
      if (card) {
        card.due_date = dueDate;
        card.due_date_completed = false;
        card.due_date_completed_at = null;
        card.due_date_completed_by = null;
      }
      return card;
    }
  }

  static async markDueDateCompleted(cardId, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE cards 
           SET due_date_completed = true, due_date_completed_at = CURRENT_TIMESTAMP, due_date_completed_by = $1
           WHERE id = $2 
           RETURNING *`,
          [userId, cardId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors du marquage de l\'échéance comme terminée:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.cards) return null;
      const card = inMemoryData.cards.find(c => c.id === cardId);
      if (card) {
        card.due_date_completed = true;
        card.due_date_completed_at = new Date().toISOString();
        card.due_date_completed_by = userId;
      }
      return card;
    }
  }

  static async markDueDateUncompleted(cardId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE cards 
           SET due_date_completed = false, due_date_completed_at = NULL, due_date_completed_by = NULL
           WHERE id = $1 
           RETURNING *`,
          [cardId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors du marquage de l\'échéance comme non terminée:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.cards) return null;
      const card = inMemoryData.cards.find(c => c.id === cardId);
      if (card) {
        card.due_date_completed = false;
        card.due_date_completed_at = null;
        card.due_date_completed_by = null;
      }
      return card;
    }
  }

  static async removeDueDate(cardId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE cards 
           SET due_date = NULL, due_date_completed = false, due_date_completed_at = NULL, due_date_completed_by = NULL
           WHERE id = $1 
           RETURNING *`,
          [cardId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la suppression de la date d\'échéance:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.cards) return null;
      const card = inMemoryData.cards.find(c => c.id === cardId);
      if (card) {
        card.due_date = null;
        card.due_date_completed = false;
        card.due_date_completed_at = null;
        card.due_date_completed_by = null;
      }
      return card;
    }
  }

  static async getCardsDueSoon(userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `SELECT * FROM cards_due_soon 
           WHERE assigned_user_id = $1 
           AND due_status IN ('due_soon', 'overdue')
           ORDER BY due_date ASC`,
          [userId]
        );
        return result.rows;
      } catch (error) {
        console.error('Erreur lors de la récupération des cartes dues bientôt:', error);
        return [];
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.cards) return [];
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      return inMemoryData.cards.filter(card => 
        card.assigned_user_id === userId &&
        card.due_date &&
        new Date(card.due_date) <= tomorrow &&
        !card.due_date_completed
      );
    }
  }

  // Gestion des notifications
  static async createNotification(userId, cardId, type, title, message, data = {}) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO notifications (user_id, card_id, type, title, message, data) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [userId, cardId, type, title, message, JSON.stringify(data)]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la création de la notification:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      const notification = {
        id: Date.now(),
        user_id: userId,
        card_id: cardId,
        type,
        title,
        message,
        is_read: false,
        data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (!inMemoryData.notifications) inMemoryData.notifications = [];
      inMemoryData.notifications.push(notification);
      return notification;
    }
  }

  static async getUserNotifications(userId, limit = 20) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `SELECT n.*, c.title as card_title, b.name as board_name
           FROM notifications n
           LEFT JOIN cards c ON n.card_id = c.id
           LEFT JOIN boards b ON c.board_id = b.id
           WHERE n.user_id = $1 
           ORDER BY n.created_at DESC 
           LIMIT $2`,
          [userId, limit]
        );
        return result.rows;
      } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        return [];
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.notifications) return [];
      return inMemoryData.notifications
        .filter(n => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    }
  }

  static async markNotificationAsRead(notificationId, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE notifications 
           SET is_read = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND user_id = $2 
           RETURNING *`,
          [notificationId, userId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors du marquage de la notification comme lue:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.notifications) return null;
      const notification = inMemoryData.notifications.find(n => n.id === notificationId && n.user_id === userId);
      if (notification) {
        notification.is_read = true;
        notification.updated_at = new Date().toISOString();
      }
      return notification;
    }
  }

  static async markAllNotificationsAsRead(userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE notifications 
           SET is_read = true, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND is_read = false
           RETURNING count(*)`,
          [userId]
        );
        return { updated: result.rowCount };
      } catch (error) {
        console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.notifications) return { updated: 0 };
      let count = 0;
      inMemoryData.notifications.forEach(n => {
        if (n.user_id === userId && !n.is_read) {
          n.is_read = true;
          n.updated_at = new Date().toISOString();
          count++;
        }
      });
      return { updated: count };
    }
  }

  static async getUnreadNotificationCount(userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
          [userId]
        );
        return parseInt(result.rows[0].count);
      } catch (error) {
        console.error('Erreur lors du comptage des notifications non lues:', error);
        return 0;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.notifications) return 0;
      return inMemoryData.notifications.filter(n => n.user_id === userId && !n.is_read).length;
    }
  }

  // Créer automatiquement les notifications pour les échéances
  static async createDueDateNotifications() {
    const { pool, useDatabase } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        await pool.query('SELECT create_due_date_notifications()');
        console.log('✅ Notifications d\'échéance créées');
      } catch (error) {
        console.error('❌ Erreur lors de la création des notifications d\'échéance:', error);
      }
    }
  }

  // Initialiser les tables si elles n'existent pas
  static async initializeTables() {
    const { pool, useDatabase } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        // Ajouter les colonnes de date d'échéance aux cartes
        await pool.query(`
          ALTER TABLE cards 
          ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS due_date_completed BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS due_date_completed_at TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS due_date_completed_by INTEGER REFERENCES users(id)
        `);

        // Créer la table des notifications
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            data JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Créer les index
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date)
        `);
        
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
        `);

        console.log('✅ Tables de dates d\'échéance et notifications initialisées');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des tables de dates d\'échéance:', error);
      }
    }
  }
}

module.exports = DueDate;
