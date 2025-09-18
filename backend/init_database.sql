-- Script d'initialisation complet de la base de données EpiTrello
-- Version PostgreSQL

-- Supprimer les tables existantes si elles existent (pour un redémarrage propre)
DROP TABLE IF EXISTS card_assignments CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Créer la table des utilisateurs
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des boards (tableaux)
CREATE TABLE boards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des colonnes
CREATE TABLE columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des cartes
CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
  board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table d'assignation des cartes aux utilisateurs (pour les assignations multiples futures)
CREATE TABLE card_assignments (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(card_id, user_id)
);

-- Insérer des données de test
-- Utilisateur par défaut
INSERT INTO users (username, email) VALUES 
  ('admin', 'admin@epitrello.com'),
  ('user1', 'user1@epitrello.com');

-- Board par défaut
INSERT INTO boards (name, description, owner_id) VALUES 
  ('Mon Premier Tableau', 'Tableau de démonstration EpiTrello', 1);

-- Colonnes de base
INSERT INTO columns (name, position, board_id) VALUES
  ('À faire', 1, 1),
  ('En cours', 2, 1),
  ('Terminé', 3, 1);

-- Cartes d'exemple
INSERT INTO cards (title, description, column_id, board_id, position) VALUES
  ('Tâche exemple 1', 'Description de la première tâche', 1, 1, 1),
  ('Tâche exemple 2', 'Description de la deuxième tâche', 2, 1, 1),
  ('Tâche terminée', 'Une tâche qui est déjà terminée', 3, 1, 1);

-- Vérification des données insérées
SELECT 'Tables créées avec succès' as status;
SELECT COUNT(*) as nb_users FROM users;
SELECT COUNT(*) as nb_boards FROM boards;
SELECT COUNT(*) as nb_columns FROM columns;
SELECT COUNT(*) as nb_cards FROM cards;
