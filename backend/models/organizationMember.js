const { getDbInstance } = require('../config/database');

class OrganizationMemberModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Ajouter un membre à une organisation
  async addMemberToOrganization({ organization_id, user_id, role = 'member', added_by }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier si l'utilisateur est déjà membre
        const existing = await client.query(
          'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [organization_id, user_id]
        );

        if (existing.rows.length > 0) {
          throw new Error('L\'utilisateur est déjà membre de cette organisation');
        }

        // Ajouter le membre
        const result = await client.query(
          'INSERT INTO organization_members (organization_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) RETURNING *',
          [organization_id, user_id, role, added_by]
        );

        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        this.db.inMemoryData.organization_members = [];
      }

      // Vérifier si l'utilisateur est déjà membre
      const existing = this.db.inMemoryData.organization_members.find(
        om => om.organization_id === parseInt(organization_id) && om.user_id === parseInt(user_id)
      );

      if (existing) {
        throw new Error('L\'utilisateur est déjà membre de cette organisation');
      }

      const member = {
        id: this.db.inMemoryData.organization_members.length + 1,
        organization_id: parseInt(organization_id),
        user_id: parseInt(user_id),
        role,
        added_by: parseInt(added_by),
        added_at: new Date().toISOString()
      };

      this.db.inMemoryData.organization_members.push(member);
      return member;
    }
  }

  // Récupérer tous les membres d'une organisation
  async getOrganizationMembers(organization_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            om.id, om.role, om.added_at,
            u.id as user_id, u.username, u.email,
            added_by_user.username as added_by_username
          FROM organization_members om
          LEFT JOIN users u ON om.user_id = u.id
          LEFT JOIN users added_by_user ON om.added_by = added_by_user.id
          WHERE om.organization_id = $1
          ORDER BY om.added_at ASC
        `, [organization_id]);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        return [];
      }

      return this.db.inMemoryData.organization_members
        .filter(om => om.organization_id === parseInt(organization_id))
        .map(om => {
          const user = this.db.inMemoryData.users?.find(u => u.id === om.user_id);
          const addedByUser = this.db.inMemoryData.users?.find(u => u.id === om.added_by);
          return {
            id: om.id,
            role: om.role,
            added_at: om.added_at,
            user_id: om.user_id,
            username: user?.username || 'Utilisateur inconnu',
            email: user?.email || '',
            added_by_username: addedByUser?.username || 'Inconnu'
          };
        });
    }
  }

  // Vérifier si un utilisateur est membre d'une organisation
  async isMemberOfOrganization(organization_id, user_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [organization_id, user_id]
        );

        return result.rows.length > 0 ? result.rows[0].role : null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        return null;
      }

      const membership = this.db.inMemoryData.organization_members.find(
        om => om.organization_id === parseInt(organization_id) && om.user_id === parseInt(user_id)
      );

      return membership ? membership.role : null;
    }
  }

  // Mettre à jour le rôle d'un membre
  async updateMemberRole(organization_id, user_id, new_role, updated_by) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions de celui qui fait la modification
        const updaterRole = await this.isMemberOfOrganization(organization_id, updated_by);
        if (!updaterRole || !['owner', 'admin'].includes(updaterRole)) {
          throw new Error('Permissions insuffisantes pour modifier les rôles');
        }

        // Ne pas permettre de modifier le rôle du propriétaire
        const targetMember = await client.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [organization_id, user_id]
        );

        if (targetMember.rows.length === 0) {
          throw new Error('Membre non trouvé');
        }

        if (targetMember.rows[0].role === 'owner') {
          throw new Error('Impossible de modifier le rôle du propriétaire');
        }

        const result = await client.query(
          'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3 RETURNING *',
          [new_role, organization_id, user_id]
        );

        return result.rows[0];
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        throw new Error('Aucun membre trouvé');
      }

      // Vérifier les permissions
      const updaterRole = await this.isMemberOfOrganization(organization_id, updated_by);
      if (!updaterRole || !['owner', 'admin'].includes(updaterRole)) {
        throw new Error('Permissions insuffisantes pour modifier les rôles');
      }

      const memberIndex = this.db.inMemoryData.organization_members.findIndex(
        om => om.organization_id === parseInt(organization_id) && om.user_id === parseInt(user_id)
      );

      if (memberIndex === -1) {
        throw new Error('Membre non trouvé');
      }

      if (this.db.inMemoryData.organization_members[memberIndex].role === 'owner') {
        throw new Error('Impossible de modifier le rôle du propriétaire');
      }

      this.db.inMemoryData.organization_members[memberIndex].role = new_role;
      return this.db.inMemoryData.organization_members[memberIndex];
    }
  }

  // Retirer un membre d'une organisation
  async removeMemberFromOrganization(organization_id, user_id, removed_by) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions
        const removerRole = await this.isMemberOfOrganization(organization_id, removed_by);
        if (!removerRole || !['owner', 'admin'].includes(removerRole)) {
          throw new Error('Permissions insuffisantes pour retirer des membres');
        }

        // Vérifier qu'on ne retire pas le propriétaire
        const targetRole = await this.isMemberOfOrganization(organization_id, user_id);
        if (targetRole === 'owner') {
          throw new Error('Impossible de retirer le propriétaire de l\'organisation');
        }

        await client.query(
          'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [organization_id, user_id]
        );

        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        return false;
      }

      // Vérifier les permissions
      const removerRole = await this.isMemberOfOrganization(organization_id, removed_by);
      if (!removerRole || !['owner', 'admin'].includes(removerRole)) {
        throw new Error('Permissions insuffisantes pour retirer des membres');
      }

      const memberIndex = this.db.inMemoryData.organization_members.findIndex(
        om => om.organization_id === parseInt(organization_id) && om.user_id === parseInt(user_id)
      );

      if (memberIndex === -1) {
        return false;
      }

      if (this.db.inMemoryData.organization_members[memberIndex].role === 'owner') {
        throw new Error('Impossible de retirer le propriétaire de l\'organisation');
      }

      this.db.inMemoryData.organization_members.splice(memberIndex, 1);
      return true;
    }
  }

  // Quitter une organisation (auto-retrait)
  async leaveOrganization(organization_id, user_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier qu'on n'est pas le propriétaire
        const role = await this.isMemberOfOrganization(organization_id, user_id);
        if (role === 'owner') {
          throw new Error('Le propriétaire ne peut pas quitter l\'organisation. Transférez d\'abord la propriété.');
        }

        await client.query(
          'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [organization_id, user_id]
        );

        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members) {
        return false;
      }

      const memberIndex = this.db.inMemoryData.organization_members.findIndex(
        om => om.organization_id === parseInt(organization_id) && om.user_id === parseInt(user_id)
      );

      if (memberIndex === -1) {
        return false;
      }

      if (this.db.inMemoryData.organization_members[memberIndex].role === 'owner') {
        throw new Error('Le propriétaire ne peut pas quitter l\'organisation. Transférez d\'abord la propriété.');
      }

      this.db.inMemoryData.organization_members.splice(memberIndex, 1);
      return true;
    }
  }

  // Obtenir les organisations d'un utilisateur
  async getUserOrganizations(user_id) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            o.id, o.name, o.description, o.created_at,
            om.role, om.added_at as member_since,
            u.username as owner_username
          FROM organization_members om
          LEFT JOIN organizations o ON om.organization_id = o.id
          LEFT JOIN users u ON o.owner_id = u.id
          WHERE om.user_id = $1
          ORDER BY om.added_at DESC
        `, [user_id]);

        return result.rows;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organization_members || !this.db.inMemoryData.organizations) {
        return [];
      }

      return this.db.inMemoryData.organization_members
        .filter(om => om.user_id === parseInt(user_id))
        .map(om => {
          const org = this.db.inMemoryData.organizations.find(o => o.id === om.organization_id);
          const owner = this.db.inMemoryData.users?.find(u => u.id === org?.owner_id);
          return {
            id: org?.id,
            name: org?.name,
            description: org?.description,
            created_at: org?.created_at,
            role: om.role,
            member_since: om.added_at,
            owner_username: owner?.username || 'Propriétaire inconnu'
          };
        });
    }
  }
}

module.exports = new OrganizationMemberModel();
