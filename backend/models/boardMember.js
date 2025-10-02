const { getDbInstance } = require('../config/database');

class BoardMemberModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Ajouter un utilisateur à un board
  async addMemberToBoard({ board_id, user_id, role = 'member', added_by }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier si l'utilisateur est déjà membre
        const existingMember = await client.query(
          'SELECT id FROM board_members WHERE board_id = $1 AND user_id = $2',
          [board_id, user_id]
        );

        if (existingMember.rows.length > 0) {
          throw new Error('L\'utilisateur est déjà membre de ce board');
        }

        const result = await client.query(`
          INSERT INTO board_members (board_id, user_id, role, added_by)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [board_id, user_id, role, added_by]);

        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.board_members) {
        this.db.inMemoryData.board_members = [];
      }

      // Vérifier si l'utilisateur est déjà membre
      const existingMember = this.db.inMemoryData.board_members.find(
        bm => bm.board_id === board_id && bm.user_id === user_id
      );

      if (existingMember) {
        throw new Error('L\'utilisateur est déjà membre de ce board');
      }

      const boardMember = {
        id: this.db.inMemoryData.board_members.length + 1,
        board_id,
        user_id,
        role,
        added_by,
        added_at: new Date().toISOString()
      };

      this.db.inMemoryData.board_members.push(boardMember);
      return boardMember;
    }
  }

  // Récupérer les boards accessibles par un utilisateur
  async getBoardsForUser(user_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT b.*, bm.role, bm.added_at as member_since
          FROM boards b
          INNER JOIN board_members bm ON b.id = bm.board_id
          WHERE bm.user_id = $1
          ORDER BY bm.added_at DESC
        `, [user_id]);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.board_members || !this.db.inMemoryData.boards) {
        return [];
      }

      const userBoardIds = this.db.inMemoryData.board_members
        .filter(bm => bm.user_id === parseInt(user_id))
        .map(bm => bm.board_id);

      return this.db.inMemoryData.boards
        .filter(board => userBoardIds.includes(board.id))
        .map(board => {
          const membership = this.db.inMemoryData.board_members.find(
            bm => bm.board_id === board.id && bm.user_id === parseInt(user_id)
          );
          return {
            ...board,
            role: membership?.role || 'member',
            member_since: membership?.added_at
          };
        });
    }
  }

  // Récupérer les membres d'un board
  async getBoardMembers(board_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT bm.*, u.username, u.email, added_by_user.username as added_by_username
          FROM board_members bm
          LEFT JOIN users u ON bm.user_id = u.id
          LEFT JOIN users added_by_user ON bm.added_by = added_by_user.id
          WHERE bm.board_id = $1
          ORDER BY bm.added_at ASC
        `, [board_id]);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.board_members) {
        return [];
      }

      return this.db.inMemoryData.board_members
        .filter(bm => bm.board_id === parseInt(board_id))
        .map(bm => {
          const user = this.db.inMemoryData.users?.find(u => u.id === bm.user_id);
          const addedBy = this.db.inMemoryData.users?.find(u => u.id === bm.added_by);
          
          return {
            ...bm,
            username: user?.username || 'Utilisateur inconnu',
            email: user?.email || '',
            added_by_username: addedBy?.username || 'Système'
          };
        });
    }
  }

  // Vérifier si un utilisateur a accès à un board
  async hasAccessToBoard(user_id, board_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'SELECT id, role FROM board_members WHERE user_id = $1 AND board_id = $2',
          [user_id, board_id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.board_members) {
        return null;
      }

      const membership = this.db.inMemoryData.board_members.find(
        bm => bm.user_id === parseInt(user_id) && bm.board_id === parseInt(board_id)
      );

      return membership || null;
    }
  }

  // Supprimer un membre d'un board
  async removeMemberFromBoard(board_id, user_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'DELETE FROM board_members WHERE board_id = $1 AND user_id = $2 RETURNING *',
          [board_id, user_id]
        );

        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.board_members) {
        return null;
      }

      const memberIndex = this.db.inMemoryData.board_members.findIndex(
        bm => bm.board_id === parseInt(board_id) && bm.user_id === parseInt(user_id)
      );

      if (memberIndex === -1) {
        return null;
      }

      const removedMember = this.db.inMemoryData.board_members[memberIndex];
      this.db.inMemoryData.board_members.splice(memberIndex, 1);
      return removedMember;
    }
  }

  // Mettre à jour le rôle d'un membre
  async updateMemberRole(board_id, user_id, new_role) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'UPDATE board_members SET role = $1 WHERE board_id = $2 AND user_id = $3 RETURNING *',
          [new_role, board_id, user_id]
        );

        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.board_members) {
        return null;
      }

      const memberIndex = this.db.inMemoryData.board_members.findIndex(
        bm => bm.board_id === parseInt(board_id) && bm.user_id === parseInt(user_id)
      );

      if (memberIndex === -1) {
        return null;
      }

      this.db.inMemoryData.board_members[memberIndex].role = new_role;
      return this.db.inMemoryData.board_members[memberIndex];
    }
  }
}

module.exports = new BoardMemberModel();
