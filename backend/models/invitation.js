const { getDbInstance } = require('../config/database');
const crypto = require('crypto');

class InvitationModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Générer un token unique pour l'invitation
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Créer une nouvelle invitation
  async createInvitation({ email, board_id, invited_by, organization_id = null }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier si une invitation en attente existe déjà
        const existingInvitation = await client.query(
          'SELECT id FROM invitations WHERE email = $1 AND board_id = $2 AND status = $3',
          [email, board_id, 'pending']
        );

        if (existingInvitation.rows.length > 0) {
          throw new Error('Une invitation en attente existe déjà pour cet email sur ce board');
        }

        // Vérifier si l'utilisateur n'est pas déjà membre du board
        const existingUser = await client.query(
          'SELECT u.id FROM users u WHERE u.email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          // TODO: Vérifier si l'utilisateur est déjà membre du board
          // Cette vérification sera ajoutée quand on aura la table board_members
        }

        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

        const result = await client.query(`
          INSERT INTO invitations (email, board_id, organization_id, invited_by, token, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [email, board_id, organization_id, invited_by, token, expiresAt]);

        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.invitations) {
        this.db.inMemoryData.invitations = [];
      }

      // Vérifier si une invitation en attente existe déjà
      const existingInvitation = this.db.inMemoryData.invitations.find(
        inv => inv.email === email && inv.board_id === board_id && inv.status === 'pending'
      );

      if (existingInvitation) {
        throw new Error('Une invitation en attente existe déjà pour cet email sur ce board');
      }

      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = {
        id: this.db.inMemoryData.invitations.length + 1,
        email,
        board_id,
        organization_id,
        invited_by,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.db.inMemoryData.invitations.push(invitation);
      return invitation;
    }
  }

  // Récupérer les invitations reçues par email
  async getInvitationsByEmail(email) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT i.*, b.name as board_name, u.username as invited_by_username
          FROM invitations i
          LEFT JOIN boards b ON i.board_id = b.id
          LEFT JOIN users u ON i.invited_by = u.id
          WHERE i.email = $1
          ORDER BY i.created_at DESC
        `, [email]);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.invitations) {
        return [];
      }

      return this.db.inMemoryData.invitations
        .filter(inv => inv.email === email)
        .map(inv => {
          const board = this.db.inMemoryData.boards?.find(b => b.id === inv.board_id);
          const invitedBy = this.db.inMemoryData.users?.find(u => u.id === inv.invited_by);
          
          return {
            ...inv,
            board_name: board?.name || 'Board inconnu',
            invited_by_username: invitedBy?.username || 'Utilisateur inconnu'
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  // Récupérer une invitation par token
  async getInvitationByToken(token) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT i.*, b.name as board_name, u.username as invited_by_username
          FROM invitations i
          LEFT JOIN boards b ON i.board_id = b.id
          LEFT JOIN users u ON i.invited_by = u.id
          WHERE i.token = $1
        `, [token]);

        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.invitations) {
        return null;
      }

      const invitation = this.db.inMemoryData.invitations.find(inv => inv.token === token);
      if (!invitation) return null;

      const board = this.db.inMemoryData.boards?.find(b => b.id === invitation.board_id);
      const invitedBy = this.db.inMemoryData.users?.find(u => u.id === invitation.invited_by);

      return {
        ...invitation,
        board_name: board?.name || 'Board inconnu',
        invited_by_username: invitedBy?.username || 'Utilisateur inconnu'
      };
    }
  }

  // Accepter une invitation
  async acceptInvitation(token) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier que l'invitation existe et est valide
        const invitation = await client.query(
          'SELECT * FROM invitations WHERE token = $1 AND status = $2 AND expires_at > NOW()',
          [token, 'pending']
        );

        if (invitation.rows.length === 0) {
          throw new Error('Invitation invalide ou expirée');
        }

        const inv = invitation.rows[0];

        // Vérifier si l'utilisateur existe déjà
        let user = await client.query('SELECT * FROM users WHERE email = $1', [inv.email]);

        if (user.rows.length === 0) {
          // Créer un compte temporaire pour l'utilisateur
          const tempUsername = inv.email.split('@')[0];
          const tempPassword = crypto.randomBytes(16).toString('hex');
          
          const newUser = await client.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
            [tempUsername, inv.email, tempPassword]
          );
          user.rows = [newUser.rows[0]];
        }

        // TODO: Ajouter l'utilisateur au board (sera fait dans la phase permissions)
        // Pour l'instant, on marque juste l'invitation comme acceptée

        // Mettre à jour le statut de l'invitation
        const result = await client.query(
          'UPDATE invitations SET status = $1, updated_at = NOW() WHERE token = $2 RETURNING *',
          ['accepted', token]
        );

        return {
          invitation: result.rows[0],
          user: user.rows[0]
        };
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.invitations) {
        throw new Error('Invitation invalide');
      }

      const invitationIndex = this.db.inMemoryData.invitations.findIndex(
        inv => inv.token === token && inv.status === 'pending' && new Date(inv.expires_at) > new Date()
      );

      if (invitationIndex === -1) {
        throw new Error('Invitation invalide ou expirée');
      }

      const invitation = this.db.inMemoryData.invitations[invitationIndex];

      // Vérifier si l'utilisateur existe déjà
      let user = this.db.inMemoryData.users?.find(u => u.email === invitation.email);

      if (!user) {
        // Créer un compte temporaire
        const tempUsername = invitation.email.split('@')[0];
        const tempPassword = crypto.randomBytes(16).toString('hex');
        
        user = {
          id: (this.db.inMemoryData.users?.length || 0) + 1,
          username: tempUsername,
          email: invitation.email,
          password: tempPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (!this.db.inMemoryData.users) {
          this.db.inMemoryData.users = [];
        }
        this.db.inMemoryData.users.push(user);
      }

      // Mettre à jour le statut de l'invitation
      this.db.inMemoryData.invitations[invitationIndex].status = 'accepted';
      this.db.inMemoryData.invitations[invitationIndex].updated_at = new Date().toISOString();

      return {
        invitation: this.db.inMemoryData.invitations[invitationIndex],
        user
      };
    }
  }

  // Décliner une invitation
  async declineInvitation(token) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'UPDATE invitations SET status = $1, updated_at = NOW() WHERE token = $2 AND status = $3 RETURNING *',
          ['declined', token, 'pending']
        );

        if (result.rows.length === 0) {
          throw new Error('Invitation non trouvée ou déjà traitée');
        }

        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.invitations) {
        throw new Error('Invitation non trouvée');
      }

      const invitationIndex = this.db.inMemoryData.invitations.findIndex(
        inv => inv.token === token && inv.status === 'pending'
      );

      if (invitationIndex === -1) {
        throw new Error('Invitation non trouvée ou déjà traitée');
      }

      this.db.inMemoryData.invitations[invitationIndex].status = 'declined';
      this.db.inMemoryData.invitations[invitationIndex].updated_at = new Date().toISOString();

      return this.db.inMemoryData.invitations[invitationIndex];
    }
  }

  // Récupérer toutes les invitations (pour admin)
  async getAllInvitations() {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT i.*, b.name as board_name, u.username as invited_by_username
          FROM invitations i
          LEFT JOIN boards b ON i.board_id = b.id
          LEFT JOIN users u ON i.invited_by = u.id
          ORDER BY i.created_at DESC
        `);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.invitations) {
        return [];
      }

      return this.db.inMemoryData.invitations.map(inv => {
        const board = this.db.inMemoryData.boards?.find(b => b.id === inv.board_id);
        const invitedBy = this.db.inMemoryData.users?.find(u => u.id === inv.invited_by);
        
        return {
          ...inv,
          board_name: board?.name || 'Board inconnu',
          invited_by_username: invitedBy?.username || 'Utilisateur inconnu'
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }
}

module.exports = new InvitationModel();
