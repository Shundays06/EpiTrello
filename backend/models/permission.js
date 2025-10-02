const { getDbInstance } = require('../config/database');

class PermissionModel {
  constructor() {
    this.db = getDbInstance();
  }

  // Vérifier si un utilisateur a une permission spécifique
  async userHasPermission(userId, permission, context, resourceId = null) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(
          'SELECT user_has_permission($1, $2, $3, $4) as has_permission',
          [userId, permission, context, resourceId]
        );
        return result.rows[0]?.has_permission || false;
      } finally {
        client.release();
      }
    } else {
      // Version en mémoire simplifiée
      return this.checkPermissionInMemory(userId, permission, context, resourceId);
    }
  }

  // Version en mémoire pour les permissions (fallback)
  checkPermissionInMemory(userId, permission, context, resourceId) {
    if (!this.db.inMemoryData) return false;

    try {
      let userRole = null;

      if (context === 'board' && resourceId) {
        // Vérifier via membership direct du board
        const boardMember = this.db.inMemoryData.board_members?.find(
          bm => bm.user_id === parseInt(userId) && bm.board_id === parseInt(resourceId)
        );
        
        if (boardMember) {
          userRole = boardMember.role;
        } else {
          // Vérifier via l'organisation du board
          const board = this.db.inMemoryData.boards?.find(b => b.id === parseInt(resourceId));
          if (board && board.organization_id) {
            const orgMember = this.db.inMemoryData.organization_members?.find(
              om => om.user_id === parseInt(userId) && om.organization_id === board.organization_id
            );
            if (orgMember) {
              userRole = orgMember.role;
            }
          }
        }
      } else if (context === 'organization' && resourceId) {
        const orgMember = this.db.inMemoryData.organization_members?.find(
          om => om.user_id === parseInt(userId) && om.organization_id === parseInt(resourceId)
        );
        if (orgMember) {
          userRole = orgMember.role;
        }
      }

      if (!userRole) return false;

      // Vérifier les permissions selon le rôle
      return this.roleHasPermission(userRole, permission, context);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }

  // Vérifier si un rôle a une permission (mapping en dur pour le fallback)
  roleHasPermission(role, permission, context) {
    const rolePermissions = {
      owner: {
        board: [
          'view_board', 'edit_board', 'delete_board', 'manage_board_members',
          'create_column', 'edit_column', 'delete_column',
          'create_card', 'edit_card', 'delete_card', 'move_card', 'assign_card', 'comment_card',
          'invite_users', 'export_data'
        ],
        organization: [
          'view_organization', 'edit_organization', 'delete_organization',
          'manage_org_members', 'create_org_board', 'transfer_ownership', 'invite_users'
        ]
      },
      admin: {
        board: [
          'view_board', 'edit_board', 'manage_board_members',
          'create_column', 'edit_column', 'delete_column',
          'create_card', 'edit_card', 'delete_card', 'move_card', 'assign_card', 'comment_card',
          'invite_users', 'export_data'
        ],
        organization: [
          'view_organization', 'edit_organization', 'manage_org_members',
          'create_org_board', 'invite_users'
        ]
      },
      member: {
        board: [
          'view_board', 'create_card', 'edit_card', 'move_card', 'assign_card', 'comment_card'
        ],
        organization: [
          'view_organization', 'create_org_board'
        ]
      },
      viewer: {
        board: ['view_board', 'comment_card'],
        organization: ['view_organization']
      }
    };

    return rolePermissions[role]?.[context]?.includes(permission) || false;
  }

  // Récupérer toutes les permissions d'un utilisateur
  async getUserPermissions(userId) {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT DISTINCT
            permission_name,
            context,
            resource_id,
            user_role
          FROM user_permissions
          WHERE user_id = $1
          ORDER BY context, permission_name
        `, [userId]);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      // Version en mémoire simplifiée
      const permissions = [];
      
      // Permissions via boards
      const boardMemberships = this.db.inMemoryData.board_members?.filter(
        bm => bm.user_id === parseInt(userId)
      ) || [];
      
      for (const membership of boardMemberships) {
        const boardPerms = this.getBoardPermissions(membership.role);
        for (const perm of boardPerms) {
          permissions.push({
            permission_name: perm,
            context: 'board',
            resource_id: membership.board_id,
            user_role: membership.role
          });
        }
      }

      // Permissions via organisations
      const orgMemberships = this.db.inMemoryData.organization_members?.filter(
        om => om.user_id === parseInt(userId)
      ) || [];
      
      for (const membership of orgMemberships) {
        const orgPerms = this.getOrganizationPermissions(membership.role);
        for (const perm of orgPerms) {
          permissions.push({
            permission_name: perm,
            context: 'organization',
            resource_id: membership.organization_id,
            user_role: membership.role
          });
        }
        
        // Ajouter aussi les permissions des boards de l'organisation
        const orgBoards = this.db.inMemoryData.boards?.filter(
          b => b.organization_id === membership.organization_id
        ) || [];
        
        for (const board of orgBoards) {
          const boardPerms = this.getBoardPermissions(membership.role);
          for (const perm of boardPerms) {
            permissions.push({
              permission_name: perm,
              context: 'board',
              resource_id: board.id,
              user_role: membership.role
            });
          }
        }
      }

      return permissions;
    }
  }

  getBoardPermissions(role) {
    const perms = {
      owner: [
        'view_board', 'edit_board', 'delete_board', 'manage_board_members',
        'create_column', 'edit_column', 'delete_column',
        'create_card', 'edit_card', 'delete_card', 'move_card', 'assign_card', 'comment_card',
        'invite_users', 'export_data'
      ],
      admin: [
        'view_board', 'edit_board', 'manage_board_members',
        'create_column', 'edit_column', 'delete_column',
        'create_card', 'edit_card', 'delete_card', 'move_card', 'assign_card', 'comment_card',
        'invite_users', 'export_data'
      ],
      member: [
        'view_board', 'create_card', 'edit_card', 'move_card', 'assign_card', 'comment_card'
      ],
      viewer: ['view_board', 'comment_card']
    };
    return perms[role] || [];
  }

  getOrganizationPermissions(role) {
    const perms = {
      owner: [
        'view_organization', 'edit_organization', 'delete_organization',
        'manage_org_members', 'create_org_board', 'transfer_ownership', 'invite_users'
      ],
      admin: [
        'view_organization', 'edit_organization', 'manage_org_members',
        'create_org_board', 'invite_users'
      ],
      member: ['view_organization', 'create_org_board'],
      viewer: ['view_organization']
    };
    return perms[role] || [];
  }

  // Récupérer toutes les permissions disponibles
  async getAllPermissions() {
    if (this.db.useDatabase) {
      const client = await this.db.pool.connect();
      try {
        const result = await client.query(`
          SELECT name, description 
          FROM permissions 
          ORDER BY name
        `);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      // Retourner la liste des permissions en dur
      return [
        { name: 'view_board', description: 'Voir le contenu du board' },
        { name: 'edit_board', description: 'Modifier les paramètres du board' },
        { name: 'delete_board', description: 'Supprimer le board' },
        { name: 'manage_board_members', description: 'Gérer les membres du board' },
        { name: 'create_column', description: 'Créer des colonnes' },
        { name: 'edit_column', description: 'Modifier les colonnes' },
        { name: 'delete_column', description: 'Supprimer des colonnes' },
        { name: 'create_card', description: 'Créer des cartes' },
        { name: 'edit_card', description: 'Modifier des cartes' },
        { name: 'delete_card', description: 'Supprimer des cartes' },
        { name: 'move_card', description: 'Déplacer des cartes' },
        { name: 'assign_card', description: 'Assigner des cartes à des utilisateurs' },
        { name: 'comment_card', description: 'Commenter des cartes' },
        { name: 'view_organization', description: 'Voir l\'organisation' },
        { name: 'edit_organization', description: 'Modifier l\'organisation' },
        { name: 'delete_organization', description: 'Supprimer l\'organisation' },
        { name: 'manage_org_members', description: 'Gérer les membres de l\'organisation' },
        { name: 'create_org_board', description: 'Créer des boards dans l\'organisation' },
        { name: 'transfer_ownership', description: 'Transférer la propriété' },
        { name: 'invite_users', description: 'Inviter des utilisateurs' },
        { name: 'export_data', description: 'Exporter les données' }
      ];
    }
  }

  // Middleware pour vérifier les permissions dans les routes
  checkPermission(permission, context) {
    return async (req, res, next) => {
      try {
        const userId = req.body.user_id || req.query.user_id;
        const resourceId = req.params.id || req.body.board_id || req.body.organization_id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: 'Authentification requise'
          });
        }

        const hasPermission = await this.userHasPermission(
          parseInt(userId),
          permission,
          context,
          resourceId ? parseInt(resourceId) : null
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Permissions insuffisantes pour cette action'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des permissions'
        });
      }
    };
  }
}

module.exports = new PermissionModel();
