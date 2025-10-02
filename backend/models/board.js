const { getDbInstance } = require('../config/database');

class BoardModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Créer un board avec propriétaire et organisation
  async createBoard({ name, description, owner_id, organization_id = null }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Créer le board
        const result = await client.query(
          'INSERT INTO boards (name, description, owner_id, organization_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, description, owner_id, organization_id]
        );

        const board = result.rows[0];

        // Ajouter automatiquement le propriétaire comme membre avec rôle owner
        await client.query(
          'INSERT INTO board_members (board_id, user_id, role, added_by) VALUES ($1, $2, $3, $4)',
          [board.id, owner_id, 'owner', owner_id]
        );

        return board;
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.boards) {
        this.db.inMemoryData.boards = [];
      }
      if (!this.db.inMemoryData.board_members) {
        this.db.inMemoryData.board_members = [];
      }

      const board = {
        id: this.db.inMemoryData.boards.length + 1,
        name,
        description,
        owner_id,
        organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.db.inMemoryData.boards.push(board);

      // Ajouter le propriétaire comme membre
      this.db.inMemoryData.board_members.push({
        id: this.db.inMemoryData.board_members.length + 1,
        board_id: board.id,
        user_id: owner_id,
        role: 'owner',
        added_by: owner_id,
        added_at: new Date().toISOString()
      });

      return board;
    }
  }

  // Récupérer un board par son id (avec vérification d'accès)
  async getBoardById(id, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        let query = 'SELECT * FROM boards WHERE id = $1';
        let params = [id];

        // Si user_id fourni, vérifier l'accès
        if (user_id) {
          query = `
            SELECT b.*, bm.role as user_role
            FROM boards b
            INNER JOIN board_members bm ON b.id = bm.board_id
            WHERE b.id = $1 AND bm.user_id = $2
          `;
          params = [id, user_id];
        }

        const result = await client.query(query, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.boards) {
        return null;
      }

      const board = this.db.inMemoryData.boards.find(b => b.id === parseInt(id));
      if (!board) return null;

      // Si user_id fourni, vérifier l'accès
      if (user_id) {
        const hasAccess = this.db.inMemoryData.board_members?.find(
          bm => bm.board_id === parseInt(id) && bm.user_id === parseInt(user_id)
        );
        
        if (!hasAccess) return null;
        
        return {
          ...board,
          user_role: hasAccess.role
        };
      }

      return board;
    }
  }

  // Récupérer tous les boards (seulement ceux accessibles par l'utilisateur)
  async getAllBoards(user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        if (user_id) {
          // Retourner les boards auxquels l'utilisateur a accès :
          // 1. Soit via membership direct du board
          // 2. Soit via membership de l'organisation du board
          const result = await client.query(`
            SELECT DISTINCT b.*, 
                   COALESCE(bm.role, 'member') as user_role, 
                   COALESCE(bm.added_at, om.added_at) as member_since,
                   o.name as organization_name,
                   om.role as organization_role
            FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = $1
            LEFT JOIN organizations o ON b.organization_id = o.id
            LEFT JOIN organization_members om ON o.id = om.organization_id AND om.user_id = $1
            WHERE bm.user_id = $1 OR om.user_id = $1
            ORDER BY COALESCE(bm.added_at, om.added_at) DESC
          `, [user_id]);
          return result.rows;
        } else {
          // Retourner tous les boards avec informations d'organisation (pour admin)
          const result = await client.query(`
            SELECT b.*, o.name as organization_name
            FROM boards b
            LEFT JOIN organizations o ON b.organization_id = o.id
            ORDER BY b.created_at DESC
          `);
          return result.rows;
        }
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.boards) {
        return [];
      }

      if (user_id) {
        // Filtrer selon les accès de l'utilisateur (board direct ou organisation)
        const userBoardIds = this.db.inMemoryData.board_members?.filter(
          bm => bm.user_id === parseInt(user_id)
        ).map(bm => bm.board_id) || [];

        // Aussi récupérer les boards via les organisations
        const userOrgIds = this.db.inMemoryData.organization_members?.filter(
          om => om.user_id === parseInt(user_id)
        ).map(om => om.organization_id) || [];

        const orgBoardIds = this.db.inMemoryData.boards?.filter(
          board => board.organization_id && userOrgIds.includes(board.organization_id)
        ).map(board => board.id) || [];

        const allAccessibleBoardIds = [...new Set([...userBoardIds, ...orgBoardIds])];

        return this.db.inMemoryData.boards
          .filter(board => allAccessibleBoardIds.includes(board.id))
          .map(board => {
            const membership = this.db.inMemoryData.board_members?.find(
              bm => bm.board_id === board.id && bm.user_id === parseInt(user_id)
            );
            const org = board.organization_id ? 
              this.db.inMemoryData.organizations?.find(o => o.id === board.organization_id) : null;
            const orgMembership = org ? 
              this.db.inMemoryData.organization_members?.find(
                om => om.organization_id === org.id && om.user_id === parseInt(user_id)
              ) : null;

            return {
              ...board,
              user_role: membership?.role || 'member',
              member_since: membership?.added_at || orgMembership?.added_at,
              organization_name: org?.name || null,
              organization_role: orgMembership?.role || null
            };
          });
      } else {
        return this.db.inMemoryData.boards.map(board => {
          const org = board.organization_id ? 
            this.db.inMemoryData.organizations?.find(o => o.id === board.organization_id) : null;
          return {
            ...board,
            organization_name: org?.name || null
          };
        });
      }
    }
  }

  // Mettre à jour un board (avec vérification de permissions)
  async updateBoard(id, { name, description }, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions si user_id fourni
        if (user_id) {
          const permission = await client.query(
            'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
            [id, user_id]
          );

          if (permission.rows.length === 0 || !['owner', 'admin'].includes(permission.rows[0].role)) {
            throw new Error('Permissions insuffisantes pour modifier ce board');
          }
        }

        const result = await client.query(
          'UPDATE boards SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [name, description, id]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.boards) {
        return null;
      }

      // Vérifier les permissions
      if (user_id) {
        const membership = this.db.inMemoryData.board_members?.find(
          bm => bm.board_id === parseInt(id) && bm.user_id === parseInt(user_id)
        );

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          throw new Error('Permissions insuffisantes pour modifier ce board');
        }
      }

      const boardIndex = this.db.inMemoryData.boards.findIndex(b => b.id === parseInt(id));
      if (boardIndex === -1) {
        return null;
      }

      this.db.inMemoryData.boards[boardIndex] = {
        ...this.db.inMemoryData.boards[boardIndex],
        name,
        description,
        updated_at: new Date().toISOString()
      };

      return this.db.inMemoryData.boards[boardIndex];
    }
  }

  // Supprimer un board (avec vérification de permissions)
  async deleteBoard(id, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions si user_id fourni
        if (user_id) {
          const permission = await client.query(
            'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
            [id, user_id]
          );

          if (permission.rows.length === 0 || permission.rows[0].role !== 'owner') {
            throw new Error('Seul le propriétaire peut supprimer ce board');
          }
        }

        await client.query('DELETE FROM boards WHERE id = $1', [id]);
        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.boards) {
        return false;
      }

      // Vérifier les permissions
      if (user_id) {
        const membership = this.db.inMemoryData.board_members?.find(
          bm => bm.board_id === parseInt(id) && bm.user_id === parseInt(user_id)
        );

        if (!membership || membership.role !== 'owner') {
          throw new Error('Seul le propriétaire peut supprimer ce board');
        }
      }

      const boardIndex = this.db.inMemoryData.boards.findIndex(b => b.id === parseInt(id));
      if (boardIndex === -1) {
        return false;
      }

      // Supprimer aussi les membres du board
      if (this.db.inMemoryData.board_members) {
        this.db.inMemoryData.board_members = this.db.inMemoryData.board_members.filter(
          bm => bm.board_id !== parseInt(id)
        );
      }

      this.db.inMemoryData.boards.splice(boardIndex, 1);
      return true;
    }
  }
}

module.exports = new BoardModel();
