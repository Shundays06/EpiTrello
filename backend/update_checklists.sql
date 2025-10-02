-- Phase 5.2: Système de checklists pour les cartes
-- Date: 2025-10-02

-- Table pour les checklists
CREATE TABLE IF NOT EXISTS checklists (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les éléments de checklist
CREATE TABLE IF NOT EXISTS checklist_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP NULL,
    completed_by INTEGER REFERENCES users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_completed ON checklist_items(is_completed);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checklists_updated_at
    BEFORE UPDATE ON checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_updated_at();

-- Vue pour obtenir les statistiques de completion des checklists
CREATE OR REPLACE VIEW checklist_stats AS
SELECT 
    c.id as checklist_id,
    c.card_id,
    c.title,
    COUNT(ci.id) as total_items,
    COUNT(CASE WHEN ci.is_completed = true THEN 1 END) as completed_items,
    CASE 
        WHEN COUNT(ci.id) = 0 THEN 0
        ELSE ROUND((COUNT(CASE WHEN ci.is_completed = true THEN 1 END)::decimal / COUNT(ci.id)) * 100, 1)
    END as completion_percentage
FROM checklists c
LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
GROUP BY c.id, c.card_id, c.title;

-- Données de test : créer quelques checklists pour les cartes existantes
DO $$
DECLARE
    card_record RECORD;
    checklist_id INTEGER;
BEGIN
    -- Pour chaque carte existante, créer une checklist de test
    FOR card_record IN SELECT id FROM cards LIMIT 3 LOOP
        -- Créer une checklist
        INSERT INTO checklists (card_id, title, created_by)
        VALUES (card_record.id, 'Tâches à faire', 1)
        RETURNING id INTO checklist_id;
        
        -- Ajouter des éléments à la checklist
        INSERT INTO checklist_items (checklist_id, text, position, created_by) VALUES
        (checklist_id, 'Analyser les exigences', 0, 1),
        (checklist_id, 'Créer les maquettes', 1, 1),
        (checklist_id, 'Développer la fonctionnalité', 2, 1),
        (checklist_id, 'Tester et valider', 3, 1);
        
        -- Marquer quelques éléments comme complétés
        UPDATE checklist_items 
        SET is_completed = true, completed_at = CURRENT_TIMESTAMP, completed_by = 1
        WHERE checklist_id = checklist_id AND position <= 1;
    END LOOP;
END $$;

COMMIT;
