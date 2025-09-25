-- Script de mise à jour pour ajouter la colonne assigned_user_id
-- Si elle n'existe pas déjà

-- Ajouter la colonne assigned_user_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cards' 
        AND column_name = 'assigned_user_id'
    ) THEN
        ALTER TABLE cards ADD COLUMN assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Colonne assigned_user_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne assigned_user_id existe déjà';
    END IF;
END
$$;

-- Ajouter la colonne password aux users si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password'
    ) THEN
        ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT 'password123';
        RAISE NOTICE 'Colonne password ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne password existe déjà';
    END IF;
END
$$;

-- Vérification
SELECT 'Mise à jour terminée' as status;
