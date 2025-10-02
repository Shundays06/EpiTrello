-- Mise à jour de la base de données pour ajouter le système de permissions des boards
-- À exécuter après les scripts précédents

-- Créer la table des membres de boards
CREATE TABLE IF NOT EXISTS board_members (
  id SERIAL PRIMARY KEY,
  board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(board_id, user_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_role ON board_members(role);

-- Mise à jour de la table boards pour ajouter owner_id si pas déjà fait
ALTER TABLE boards ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Migrer les boards existants : ajouter l'utilisateur admin comme propriétaire
UPDATE boards SET owner_id = 1 WHERE owner_id IS NULL;

-- Ajouter automatiquement les propriétaires comme membres avec rôle owner
INSERT INTO board_members (board_id, user_id, role, added_by)
SELECT id, owner_id, 'owner', owner_id 
FROM boards 
WHERE owner_id IS NOT NULL
ON CONFLICT (board_id, user_id) DO NOTHING;

-- Vérification
SELECT 'Table board_members créée avec succès' as status;
SELECT COUNT(*) as nb_board_members FROM board_members;
