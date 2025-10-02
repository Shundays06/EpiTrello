-- Mise à jour de la base de données pour ajouter le système d'invitations
-- À exécuter après init_database.sql

-- Créer la table des invitations
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  organization_id INTEGER DEFAULT NULL, -- Sera utilisé plus tard pour les orgs
  invited_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token VARCHAR(255) UNIQUE NOT NULL, -- Token unique pour sécuriser l'invitation
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Vérification
SELECT 'Table invitations créée avec succès' as status;
