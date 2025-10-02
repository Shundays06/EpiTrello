-- Mise à jour de la base de données pour ajouter le système d'organisations
-- Phase 2 : Issues #28-#31

-- Créer la table des organisations
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des membres d'organisations
CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id, user_id)
);

-- Mettre à jour la table boards pour lier aux organisations
ALTER TABLE boards ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL;

-- Mettre à jour la table invitations pour supporter les invitations d'organisation
-- (Le champ organization_id existe déjà dans la table invitations)

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);

-- Créer une organisation de démonstration avec l'utilisateur admin
INSERT INTO organizations (name, description, owner_id) 
VALUES ('Équipe EpiTrello', 'Organisation principale pour le développement d''EpiTrello', 1)
ON CONFLICT DO NOTHING;

-- Ajouter l'admin comme propriétaire de l'organisation
INSERT INTO organization_members (organization_id, user_id, role, added_by)
SELECT 1, 1, 'owner', 1
WHERE EXISTS (SELECT 1 FROM organizations WHERE id = 1)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Vérification
SELECT 'Tables organisations créées avec succès' as status;
SELECT COUNT(*) as nb_organizations FROM organizations;
SELECT COUNT(*) as nb_organization_members FROM organization_members;
