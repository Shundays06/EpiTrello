const { getDbInstance } = require('../config/database');

class Checklist {
  static async createChecklist(cardId, title, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO checklists (card_id, title, created_by) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [cardId, title, userId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la création de la checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      const newChecklist = {
        id: Date.now(),
        card_id: cardId,
        title,
        position: 0,
        created_at: new Date().toISOString(),
        created_by: userId,
        updated_at: new Date().toISOString()
      };
      
      if (!inMemoryData.checklists) inMemoryData.checklists = [];
      inMemoryData.checklists.push(newChecklist);
      return newChecklist;
    }
  }

  static async getChecklistsByCardId(cardId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `SELECT c.*, 
           COUNT(ci.id) as total_items,
           COUNT(CASE WHEN ci.is_completed = true THEN 1 END) as completed_items
           FROM checklists c
           LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
           WHERE c.card_id = $1
           GROUP BY c.id
           ORDER BY c.position, c.created_at`,
          [cardId]
        );
        return result.rows;
      } catch (error) {
        console.error('Erreur lors de la récupération des checklists:', error);
        return [];
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklists) inMemoryData.checklists = [];
      return inMemoryData.checklists.filter(cl => cl.card_id === cardId);
    }
  }

  static async updateChecklist(checklistId, title, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          `UPDATE checklists 
           SET title = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`,
          [title, checklistId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklists) return null;
      const checklist = inMemoryData.checklists.find(cl => cl.id === checklistId);
      if (checklist) {
        checklist.title = title;
        checklist.updated_at = new Date().toISOString();
      }
      return checklist;
    }
  }

  static async deleteChecklist(checklistId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        await pool.query('DELETE FROM checklists WHERE id = $1', [checklistId]);
        return true;
      } catch (error) {
        console.error('Erreur lors de la suppression de la checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklists) return false;
      const index = inMemoryData.checklists.findIndex(cl => cl.id === checklistId);
      if (index !== -1) {
        inMemoryData.checklists.splice(index, 1);
        return true;
      }
      return false;
    }
  }

  // Méthodes pour les éléments de checklist
  static async createChecklistItem(checklistId, text, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        // Obtenir la prochaine position
        const positionResult = await pool.query(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM checklist_items WHERE checklist_id = $1',
          [checklistId]
        );
        const position = positionResult.rows[0].next_position;
        
        const result = await pool.query(
          `INSERT INTO checklist_items (checklist_id, text, position, created_by) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [checklistId, text, position, userId]
        );
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la création de l\'élément de checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      const newItem = {
        id: Date.now(),
        checklist_id: checklistId,
        text,
        is_completed: false,
        position: 0,
        created_at: new Date().toISOString(),
        created_by: userId,
        completed_at: null,
        completed_by: null
      };
      
      if (!inMemoryData.checklistItems) inMemoryData.checklistItems = [];
      inMemoryData.checklistItems.push(newItem);
      return newItem;
    }
  }

  static async getChecklistItems(checklistId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        const result = await pool.query(
          'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY position, created_at',
          [checklistId]
        );
        return result.rows;
      } catch (error) {
        console.error('Erreur lors de la récupération des éléments de checklist:', error);
        return [];
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklistItems) inMemoryData.checklistItems = [];
      return inMemoryData.checklistItems.filter(item => item.checklist_id === checklistId);
    }
  }

  static async updateChecklistItem(itemId, text, isCompleted, userId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        // D'abord récupérer l'élément existant pour garder le texte si non fourni
        const existingResult = await pool.query('SELECT * FROM checklist_items WHERE id = $1', [itemId]);
        if (existingResult.rows.length === 0) {
          throw new Error('Élément de checklist non trouvé');
        }
        
        const existingItem = existingResult.rows[0];
        const finalText = text !== undefined ? text : existingItem.text;
        const finalCompleted = isCompleted !== undefined ? isCompleted : existingItem.is_completed;
        
        const updateQuery = `
          UPDATE checklist_items 
          SET text = $1, 
              is_completed = $2, 
              completed_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
              completed_by = CASE WHEN $2 = true THEN $3::integer ELSE NULL END
          WHERE id = $4 
          RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [finalText, finalCompleted, userId, itemId]);
        return result.rows[0];
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'élément de checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklistItems) return null;
      const item = inMemoryData.checklistItems.find(item => item.id === itemId);
      if (item) {
        if (text !== undefined) item.text = text;
        if (isCompleted !== undefined) {
          item.is_completed = isCompleted;
          item.completed_at = isCompleted ? new Date().toISOString() : null;
          item.completed_by = isCompleted ? userId : null;
        }
      }
      return item;
    }
  }

  static async deleteChecklistItem(itemId) {
    const { pool, useDatabase, inMemoryData } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        await pool.query('DELETE FROM checklist_items WHERE id = $1', [itemId]);
        return true;
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'élément de checklist:', error);
        throw error;
      }
    } else {
      // Fallback en mémoire
      if (!inMemoryData.checklistItems) return false;
      const index = inMemoryData.checklistItems.findIndex(item => item.id === itemId);
      if (index !== -1) {
        inMemoryData.checklistItems.splice(index, 1);
        return true;
      }
      return false;
    }
  }

  // Créer les tables si elles n'existent pas
  static async initializeTables() {
    const { pool, useDatabase } = getDbInstance();
    
    if (useDatabase && pool) {
      try {
        // Créer la table checklists
        await pool.query(`
          CREATE TABLE IF NOT EXISTS checklists (
            id SERIAL PRIMARY KEY,
            card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Créer la table checklist_items
        await pool.query(`
          CREATE TABLE IF NOT EXISTS checklist_items (
            id SERIAL PRIMARY KEY,
            checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            completed_at TIMESTAMP NULL,
            completed_by INTEGER REFERENCES users(id)
          )
        `);

        // Créer les index
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id)
        `);
        
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id)
        `);

        console.log('✅ Tables checklists initialisées');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des tables checklists:', error);
      }
    }
  }
}

module.exports = Checklist;
