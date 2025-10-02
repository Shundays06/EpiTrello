-- Phase 5.1: Labels colorés pour les cartes
-- Système de labels comme dans Trello

-- Table des labels
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    board_id INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Table de liaison cartes-labels (many-to-many)
CREATE TABLE IF NOT EXISTS card_labels (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
    UNIQUE(card_id, label_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);

-- Couleurs prédéfinies de Trello
INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'Priorité haute', 'red', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'red' AND l.name = 'Priorité haute'
);

INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'En cours', 'yellow', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'yellow' AND l.name = 'En cours'
);

INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'Terminé', 'green', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'green' AND l.name = 'Terminé'
);

INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'Bug', 'orange', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'orange' AND l.name = 'Bug'
);

INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'Feature', 'blue', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'blue' AND l.name = 'Feature'
);

INSERT INTO labels (name, color, board_id, created_by) 
SELECT 
    'Design', 'purple', b.id, b.owner_id
FROM boards b
WHERE NOT EXISTS (
    SELECT 1 FROM labels l 
    WHERE l.board_id = b.id AND l.color = 'purple' AND l.name = 'Design'
);

-- Vue pour récupérer les cartes avec leurs labels
CREATE OR REPLACE VIEW cards_with_labels AS
SELECT 
    c.*,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', l.id,
                'name', l.name,
                'color', l.color
            ) ORDER BY l.name
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
    ) as labels
FROM cards c
LEFT JOIN card_labels cl ON c.id = cl.card_id
LEFT JOIN labels l ON cl.label_id = l.id
GROUP BY c.id, c.title, c.description, c.column_id, c.board_id, c.assigned_user_id, c.position, c.created_at, c.updated_at;

-- Fonction pour ajouter des labels par défaut à un nouveau board
CREATE OR REPLACE FUNCTION create_default_labels_for_board(board_id INTEGER, owner_id INTEGER)
RETURNS VOID AS $$
DECLARE
    default_labels RECORD;
BEGIN
    -- Labels par défaut avec leurs couleurs
    FOR default_labels IN 
        SELECT unnest(ARRAY['Priorité haute', 'En cours', 'Terminé', 'Bug', 'Feature', 'Design']) as name,
               unnest(ARRAY['red', 'yellow', 'green', 'orange', 'blue', 'purple']) as color
    LOOP
        INSERT INTO labels (name, color, board_id, created_by)
        VALUES (default_labels.name, default_labels.color, board_id, owner_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les labels par défaut lors de la création d'un board
CREATE OR REPLACE FUNCTION trigger_create_default_labels()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_labels_for_board(NEW.id, NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_board_insert ON boards;
CREATE TRIGGER after_board_insert
    AFTER INSERT ON boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_labels();

-- Message de confirmation
SELECT 'Système de labels créé avec succès' as status;

-- Statistiques
SELECT 
    'Labels créés: ' || COUNT(*) as labels_count
FROM labels;

SELECT 
    'Boards avec labels: ' || COUNT(DISTINCT board_id) as boards_with_labels_count
FROM labels;
