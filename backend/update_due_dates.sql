-- Phase 5.3: Dates d'échéance et notifications
-- Date: 2025-10-02

-- Ajouter les colonnes de date d'échéance aux cartes
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS due_date_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS due_date_completed_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS due_date_completed_by INTEGER REFERENCES users(id);

-- Table pour les notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'due_soon', 'overdue', 'comment', 'assignment', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB, -- données additionnelles selon le type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_due_date_completed ON cards(due_date_completed);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

-- Vue pour obtenir les cartes avec échéances proches
CREATE OR REPLACE VIEW cards_due_soon AS
SELECT 
    c.*,
    u.username as assigned_username,
    b.name as board_name,
    CASE 
        WHEN c.due_date < CURRENT_TIMESTAMP AND c.due_date_completed = false THEN 'overdue'
        WHEN c.due_date < CURRENT_TIMESTAMP + INTERVAL '24 hours' AND c.due_date_completed = false THEN 'due_soon'
        WHEN c.due_date_completed = true THEN 'completed'
        ELSE 'normal'
    END as due_status,
    EXTRACT(EPOCH FROM (c.due_date - CURRENT_TIMESTAMP))/3600 as hours_until_due
FROM cards c
LEFT JOIN users u ON c.assigned_user_id = u.id
LEFT JOIN boards b ON c.board_id = b.id
WHERE c.due_date IS NOT NULL
ORDER BY c.due_date ASC;

-- Fonction pour créer automatiquement des notifications d'échéance
CREATE OR REPLACE FUNCTION create_due_date_notifications()
RETURNS void AS $$
DECLARE
    card_record RECORD;
    notification_exists BOOLEAN;
BEGIN
    -- Notifications pour cartes en retard
    FOR card_record IN 
        SELECT c.*, u.username, b.name as board_name
        FROM cards c
        LEFT JOIN users u ON c.assigned_user_id = u.id  
        LEFT JOIN boards b ON c.board_id = b.id
        WHERE c.due_date < CURRENT_TIMESTAMP 
        AND c.due_date_completed = false
        AND c.assigned_user_id IS NOT NULL
    LOOP
        -- Vérifier si une notification similaire existe déjà
        SELECT EXISTS(
            SELECT 1 FROM notifications 
            WHERE user_id = card_record.assigned_user_id 
            AND card_id = card_record.id 
            AND type = 'overdue'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ) INTO notification_exists;
        
        IF NOT notification_exists THEN
            INSERT INTO notifications (user_id, card_id, type, title, message, data)
            VALUES (
                card_record.assigned_user_id,
                card_record.id,
                'overdue',
                'Carte en retard',
                format('La carte "%s" dans le board "%s" est en retard depuis le %s', 
                       card_record.title, 
                       card_record.board_name,
                       to_char(card_record.due_date, 'DD/MM/YYYY à HH24:MI')),
                jsonb_build_object(
                    'due_date', card_record.due_date,
                    'board_name', card_record.board_name,
                    'hours_overdue', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - card_record.due_date))/3600
                )
            );
        END IF;
    END LOOP;
    
    -- Notifications pour cartes dues bientôt (dans les 24h)
    FOR card_record IN 
        SELECT c.*, u.username, b.name as board_name
        FROM cards c
        LEFT JOIN users u ON c.assigned_user_id = u.id
        LEFT JOIN boards b ON c.board_id = b.id  
        WHERE c.due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours'
        AND c.due_date_completed = false
        AND c.assigned_user_id IS NOT NULL
    LOOP
        -- Vérifier si une notification similaire existe déjà
        SELECT EXISTS(
            SELECT 1 FROM notifications 
            WHERE user_id = card_record.assigned_user_id 
            AND card_id = card_record.id 
            AND type = 'due_soon'
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '12 hours'
        ) INTO notification_exists;
        
        IF NOT notification_exists THEN
            INSERT INTO notifications (user_id, card_id, type, title, message, data)
            VALUES (
                card_record.assigned_user_id,
                card_record.id,
                'due_soon',
                'Échéance approche',
                format('La carte "%s" dans le board "%s" est due le %s', 
                       card_record.title, 
                       card_record.board_name,
                       to_char(card_record.due_date, 'DD/MM/YYYY à HH24:MI')),
                jsonb_build_object(
                    'due_date', card_record.due_date,
                    'board_name', card_record.board_name,
                    'hours_until_due', EXTRACT(EPOCH FROM (card_record.due_date - CURRENT_TIMESTAMP))/3600
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Données de test : ajouter des dates d'échéance à quelques cartes
DO $$
DECLARE
    card_record RECORD;
BEGIN
    -- Ajouter des dates d'échéance variées aux cartes existantes
    FOR card_record IN SELECT id FROM cards LIMIT 5 LOOP
        UPDATE cards 
        SET due_date = CASE 
            WHEN random() < 0.3 THEN CURRENT_TIMESTAMP + INTERVAL '2 hours'  -- Due bientôt
            WHEN random() < 0.5 THEN CURRENT_TIMESTAMP - INTERVAL '1 day'    -- En retard
            WHEN random() < 0.8 THEN CURRENT_TIMESTAMP + INTERVAL '3 days'   -- Dans quelques jours
            ELSE CURRENT_TIMESTAMP + INTERVAL '1 week'                       -- Dans une semaine
        END
        WHERE id = card_record.id;
    END LOOP;
    
    -- Marquer quelques cartes comme terminées
    UPDATE cards 
    SET due_date_completed = true, 
        due_date_completed_at = CURRENT_TIMESTAMP,
        due_date_completed_by = 1
    WHERE id IN (SELECT id FROM cards WHERE due_date IS NOT NULL LIMIT 1);
END $$;

-- Créer les premières notifications
SELECT create_due_date_notifications();

COMMIT;
