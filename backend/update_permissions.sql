-- Mise à jour des permissions avancées pour EpiTrello
-- Phase 4: Permissions granulaires et rôles avancés

-- Ajouter une table de permissions pour définir ce que chaque rôle peut faire
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter une table de liaison rôle-permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    permission_name VARCHAR(50) NOT NULL,
    context VARCHAR(20) NOT NULL DEFAULT 'board', -- 'board' ou 'organization'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_name) REFERENCES permissions(name) ON DELETE CASCADE,
    UNIQUE(role, permission_name, context)
);

-- Insérer les permissions de base
INSERT INTO permissions (name, description) VALUES 
-- Permissions Board
('view_board', 'Voir le contenu du board'),
('edit_board', 'Modifier les paramètres du board'),
('delete_board', 'Supprimer le board'),
('manage_board_members', 'Gérer les membres du board'),
('create_column', 'Créer des colonnes'),
('edit_column', 'Modifier les colonnes'),
('delete_column', 'Supprimer des colonnes'),
('create_card', 'Créer des cartes'),
('edit_card', 'Modifier des cartes'),
('delete_card', 'Supprimer des cartes'),
('move_card', 'Déplacer des cartes'),
('assign_card', 'Assigner des cartes à des utilisateurs'),
('comment_card', 'Commenter des cartes'),

-- Permissions Organisation
('view_organization', 'Voir l''organisation'),
('edit_organization', 'Modifier l''organisation'),
('delete_organization', 'Supprimer l''organisation'),
('manage_org_members', 'Gérer les membres de l''organisation'),
('create_org_board', 'Créer des boards dans l''organisation'),
('transfer_ownership', 'Transférer la propriété'),

-- Permissions système
('invite_users', 'Inviter des utilisateurs'),
('export_data', 'Exporter les données')
ON CONFLICT (name) DO NOTHING;

-- Définir les permissions pour chaque rôle dans les boards
INSERT INTO role_permissions (role, permission_name, context) VALUES 
-- Propriétaire de board (toutes les permissions)
('owner', 'view_board', 'board'),
('owner', 'edit_board', 'board'),
('owner', 'delete_board', 'board'),
('owner', 'manage_board_members', 'board'),
('owner', 'create_column', 'board'),
('owner', 'edit_column', 'board'),
('owner', 'delete_column', 'board'),
('owner', 'create_card', 'board'),
('owner', 'edit_card', 'board'),
('owner', 'delete_card', 'board'),
('owner', 'move_card', 'board'),
('owner', 'assign_card', 'board'),
('owner', 'comment_card', 'board'),
('owner', 'invite_users', 'board'),
('owner', 'export_data', 'board'),

-- Administrateur de board (presque toutes les permissions sauf suppression)
('admin', 'view_board', 'board'),
('admin', 'edit_board', 'board'),
('admin', 'manage_board_members', 'board'),
('admin', 'create_column', 'board'),
('admin', 'edit_column', 'board'),
('admin', 'delete_column', 'board'),
('admin', 'create_card', 'board'),
('admin', 'edit_card', 'board'),
('admin', 'delete_card', 'board'),
('admin', 'move_card', 'board'),
('admin', 'assign_card', 'board'),
('admin', 'comment_card', 'board'),
('admin', 'invite_users', 'board'),
('admin', 'export_data', 'board'),

-- Membre de board (permissions de base)
('member', 'view_board', 'board'),
('member', 'create_card', 'board'),
('member', 'edit_card', 'board'),
('member', 'move_card', 'board'),
('member', 'assign_card', 'board'),
('member', 'comment_card', 'board'),

-- Observateur de board (lecture seule)
('viewer', 'view_board', 'board'),
('viewer', 'comment_card', 'board')
ON CONFLICT (role, permission_name, context) DO NOTHING;

-- Définir les permissions pour chaque rôle dans les organisations
INSERT INTO role_permissions (role, permission_name, context) VALUES 
-- Propriétaire d'organisation (toutes les permissions)
('owner', 'view_organization', 'organization'),
('owner', 'edit_organization', 'organization'),
('owner', 'delete_organization', 'organization'),
('owner', 'manage_org_members', 'organization'),
('owner', 'create_org_board', 'organization'),
('owner', 'transfer_ownership', 'organization'),
('owner', 'invite_users', 'organization'),

-- Administrateur d'organisation
('admin', 'view_organization', 'organization'),
('admin', 'edit_organization', 'organization'),
('admin', 'manage_org_members', 'organization'),
('admin', 'create_org_board', 'organization'),
('admin', 'invite_users', 'organization'),

-- Membre d'organisation
('member', 'view_organization', 'organization'),
('member', 'create_org_board', 'organization')
ON CONFLICT (role, permission_name, context) DO NOTHING;

-- Ajouter une table pour les rôles personnalisés (feature avancée)
CREATE TABLE IF NOT EXISTS custom_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Un rôle personnalisé appartient soit à une organisation, soit à un board
    CHECK ((organization_id IS NOT NULL AND board_id IS NULL) OR (organization_id IS NULL AND board_id IS NOT NULL))
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_context ON role_permissions(context);
CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_board ON custom_roles(board_id);

-- Fonction pour vérifier les permissions
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id INTEGER,
    p_permission VARCHAR(50),
    p_context VARCHAR(20),
    p_resource_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(20);
    has_perm BOOLEAN := FALSE;
BEGIN
    -- Vérifier selon le contexte
    IF p_context = 'board' AND p_resource_id IS NOT NULL THEN
        -- Vérifier via membership direct du board
        SELECT role INTO user_role 
        FROM board_members 
        WHERE user_id = p_user_id AND board_id = p_resource_id;
        
        IF user_role IS NOT NULL THEN
            SELECT EXISTS(
                SELECT 1 FROM role_permissions 
                WHERE role = user_role 
                AND permission_name = p_permission 
                AND context = 'board'
            ) INTO has_perm;
            
            IF has_perm THEN
                RETURN TRUE;
            END IF;
        END IF;
        
        -- Vérifier via l'organisation du board
        SELECT om.role INTO user_role
        FROM organization_members om
        JOIN boards b ON b.organization_id = om.organization_id
        WHERE om.user_id = p_user_id AND b.id = p_resource_id;
        
        IF user_role IS NOT NULL THEN
            SELECT EXISTS(
                SELECT 1 FROM role_permissions 
                WHERE role = user_role 
                AND permission_name = p_permission 
                AND context = 'board'
            ) INTO has_perm;
            
            RETURN has_perm;
        END IF;
        
    ELSIF p_context = 'organization' AND p_resource_id IS NOT NULL THEN
        -- Vérifier membership d'organisation
        SELECT role INTO user_role 
        FROM organization_members 
        WHERE user_id = p_user_id AND organization_id = p_resource_id;
        
        IF user_role IS NOT NULL THEN
            SELECT EXISTS(
                SELECT 1 FROM role_permissions 
                WHERE role = user_role 
                AND permission_name = p_permission 
                AND context = 'organization'
            ) INTO has_perm;
            
            RETURN has_perm;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Vue pour avoir un aperçu rapide des permissions
CREATE OR REPLACE VIEW user_permissions AS
SELECT DISTINCT
    u.id as user_id,
    u.username,
    rp.permission_name,
    rp.context,
    CASE 
        WHEN bm.board_id IS NOT NULL THEN bm.board_id
        WHEN om.organization_id IS NOT NULL AND b.id IS NOT NULL THEN b.id
        ELSE NULL
    END as resource_id,
    CASE 
        WHEN bm.role IS NOT NULL THEN bm.role
        WHEN om.role IS NOT NULL THEN om.role
        ELSE NULL
    END as user_role
FROM users u
LEFT JOIN board_members bm ON u.id = bm.user_id
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN boards b ON om.organization_id = b.organization_id
LEFT JOIN role_permissions rp ON (
    (bm.role = rp.role AND rp.context = 'board') OR 
    (om.role = rp.role AND rp.context IN ('organization', 'board'))
)
WHERE rp.permission_name IS NOT NULL;

-- Message de confirmation
SELECT 'Système de permissions avancées créé avec succès' as status;

-- Statistiques
SELECT 
    'Permissions créées: ' || COUNT(*) as permissions_count
FROM permissions;

SELECT 
    'Associations rôle-permission créées: ' || COUNT(*) as role_permissions_count  
FROM role_permissions;
