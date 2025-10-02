const { getDbInstance } = require('../config/database');

class OrganizationModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Créer une organisation
  async createOrganization({ name, description, owner_id }) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Créer l'organisation
        const result = await client.query(
          'INSERT INTO organizations (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
          [name, description, owner_id]
        );

        const organization = result.rows[0];

        // Ajouter automatiquement le propriétaire comme membre avec rôle owner
        await client.query(
          'INSERT INTO organization_members (organization_id, user_id, role, added_by) VALUES ($1, $2, $3, $4)',
          [organization.id, owner_id, 'owner', owner_id]
        );

        return organization;
      } finally {
        client.release();
      }
    } else {
      // Stockage en mémoire
      if (!this.db.inMemoryData.organizations) {
        this.db.inMemoryData.organizations = [];
      }
      if (!this.db.inMemoryData.organization_members) {
        this.db.inMemoryData.organization_members = [];
      }

      const organization = {
        id: this.db.inMemoryData.organizations.length + 1,
        name,
        description,
        owner_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.db.inMemoryData.organizations.push(organization);

      // Ajouter le propriétaire comme membre
      this.db.inMemoryData.organization_members.push({
        id: this.db.inMemoryData.organization_members.length + 1,
        organization_id: organization.id,
        user_id: owner_id,
        role: 'owner',
        added_by: owner_id,
        added_at: new Date().toISOString()
      });

      return organization;
    }
  }

  // Récupérer une organisation par son id
  async getOrganizationById(id, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        let query = `
          SELECT o.*, u.username as owner_username
          FROM organizations o
          LEFT JOIN users u ON o.owner_id = u.id
          WHERE o.id = $1
        `;
        let params = [id];

        // Si user_id fourni, vérifier l'accès
        if (user_id) {
          query = `
            SELECT o.*, u.username as owner_username, om.role as user_role
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            INNER JOIN organization_members om ON o.id = om.organization_id
            WHERE o.id = $1 AND om.user_id = $2
          `;
          params = [id, user_id];
        }

        const result = await client.query(query, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organizations) {
        return null;
      }

      const organization = this.db.inMemoryData.organizations.find(o => o.id === parseInt(id));
      if (!organization) return null;

      // Ajouter le nom du propriétaire
      const owner = this.db.inMemoryData.users?.find(u => u.id === organization.owner_id);
      const orgWithOwner = {
        ...organization,
        owner_username: owner?.username || 'Propriétaire inconnu'
      };

      // Si user_id fourni, vérifier l'accès
      if (user_id) {
        const membership = this.db.inMemoryData.organization_members?.find(
          om => om.organization_id === parseInt(id) && om.user_id === parseInt(user_id)
        );
        
        if (!membership) return null;
        
        return {
          ...orgWithOwner,
          user_role: membership.role
        };
      }

      return orgWithOwner;
    }
  }

  // Récupérer toutes les organisations (avec accès si user_id fourni)
  async getAllOrganizations(user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        if (user_id) {
          // Retourner seulement les organisations auxquelles l'utilisateur a accès
          const result = await client.query(`
            SELECT o.*, u.username as owner_username, om.role as user_role, om.added_at as member_since
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            INNER JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = $1
            ORDER BY om.added_at DESC
          `, [user_id]);
          return result.rows;
        } else {
          // Retourner toutes les organisations (pour admin)
          const result = await client.query(`
            SELECT o.*, u.username as owner_username
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            ORDER BY o.created_at DESC
          `);
          return result.rows;
        }
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organizations) {
        return [];
      }

      if (user_id) {
        // Filtrer selon les accès de l'utilisateur
        const userOrgIds = this.db.inMemoryData.organization_members?.filter(
          om => om.user_id === parseInt(user_id)
        ).map(om => om.organization_id) || [];

        return this.db.inMemoryData.organizations
          .filter(org => userOrgIds.includes(org.id))
          .map(org => {
            const owner = this.db.inMemoryData.users?.find(u => u.id === org.owner_id);
            const membership = this.db.inMemoryData.organization_members.find(
              om => om.organization_id === org.id && om.user_id === parseInt(user_id)
            );
            return {
              ...org,
              owner_username: owner?.username || 'Propriétaire inconnu',
              user_role: membership?.role || 'member',
              member_since: membership?.added_at
            };
          });
      } else {
        return this.db.inMemoryData.organizations.map(org => {
          const owner = this.db.inMemoryData.users?.find(u => u.id === org.owner_id);
          return {
            ...org,
            owner_username: owner?.username || 'Propriétaire inconnu'
          };
        });
      }
    }
  }

  // Mettre à jour une organisation
  async updateOrganization(id, { name, description }, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions si user_id fourni
        if (user_id) {
          const permission = await client.query(
            'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
            [id, user_id]
          );

          if (permission.rows.length === 0 || !['owner', 'admin'].includes(permission.rows[0].role)) {
            throw new Error('Permissions insuffisantes pour modifier cette organisation');
          }
        }

        const result = await client.query(
          'UPDATE organizations SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [name, description, id]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organizations) {
        return null;
      }

      // Vérifier les permissions
      if (user_id) {
        const membership = this.db.inMemoryData.organization_members?.find(
          om => om.organization_id === parseInt(id) && om.user_id === parseInt(user_id)
        );

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          throw new Error('Permissions insuffisantes pour modifier cette organisation');
        }
      }

      const orgIndex = this.db.inMemoryData.organizations.findIndex(o => o.id === parseInt(id));
      if (orgIndex === -1) {
        return null;
      }

      this.db.inMemoryData.organizations[orgIndex] = {
        ...this.db.inMemoryData.organizations[orgIndex],
        name,
        description,
        updated_at: new Date().toISOString()
      };

      return this.db.inMemoryData.organizations[orgIndex];
    }
  }

  // Supprimer une organisation
  async deleteOrganization(id, user_id = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        // Vérifier les permissions si user_id fourni
        if (user_id) {
          const permission = await client.query(
            'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
            [id, user_id]
          );

          if (permission.rows.length === 0 || permission.rows[0].role !== 'owner') {
            throw new Error('Seul le propriétaire peut supprimer cette organisation');
          }
        }

        await client.query('DELETE FROM organizations WHERE id = $1', [id]);
        return true;
      } finally {
        client.release();
      }
    } else {
      if (!this.db.inMemoryData.organizations) {
        return false;
      }

      // Vérifier les permissions
      if (user_id) {
        const membership = this.db.inMemoryData.organization_members?.find(
          om => om.organization_id === parseInt(id) && om.user_id === parseInt(user_id)
        );

        if (!membership || membership.role !== 'owner') {
          throw new Error('Seul le propriétaire peut supprimer cette organisation');
        }
      }

      const orgIndex = this.db.inMemoryData.organizations.findIndex(o => o.id === parseInt(id));
      if (orgIndex === -1) {
        return false;
      }

      // Supprimer aussi les membres de l'organisation
      if (this.db.inMemoryData.organization_members) {
        this.db.inMemoryData.organization_members = this.db.inMemoryData.organization_members.filter(
          om => om.organization_id !== parseInt(id)
        );
      }

      this.db.inMemoryData.organizations.splice(orgIndex, 1);
      return true;
    }
  }
}

module.exports = new OrganizationModel();
