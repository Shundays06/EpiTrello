-- Script d'initialisation de la base de données EpiTrello

-- Créer la base de données
CREATE DATABASE epitrello;

-- Se connecter à la base de données epitrello
\c epitrello;

-- Créer la table des colonnes
CREATE TABLE IF NOT EXISTS columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les colonnes de base
INSERT INTO columns (name, position) VALUES
  ('À faire', 1),
  ('En cours', 2),
  ('Terminé', 3)
ON CONFLICT DO NOTHING;

-- Créer la table des cartes (pour référence future)
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id INTEGER REFERENCES columns(id),
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des utilisateurs (pour référence future)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table d'assignation des cartes aux utilisateurs (pour référence future)
CREATE TABLE IF NOT EXISTS card_assignments (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id),
  user_id INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(card_id, user_id)
);
