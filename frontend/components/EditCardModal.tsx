import React, { useState } from 'react';
import Select from 'react-select';
import Modal from './Modal';
import LabelSelector from './LabelSelector';
import ChecklistManager from './ChecklistManager';

interface Column {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

interface Label {
  id: number;
  name: string;
  color: string;
  board_id: number;
}

interface Card {
  id: number;
  title: string;
  description: string;
  column_id: number;
  board_id: number;
  assigned_user_id?: number;
  created_at: string;
  labels?: Label[];
}

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  columns: Column[];
  users: User[];
  labels: Label[];
  currentUserId: number;
  onUpdateCard: (cardId: number, cardData: {
    title: string;
    description: string;
    column_id: number;
    assigned_user_id: number;
  }) => Promise<void>;
  onDeleteCard: (cardId: number) => Promise<void>;
}

const EditCardModal: React.FC<EditCardModalProps> = ({
  isOpen,
  onClose,
  card,
  columns,
  users,
  labels,
  currentUserId,
  onUpdateCard,
  onDeleteCard
}) => {
  const [formData, setFormData] = useState({
    title: card?.title || '',
    description: card?.description || '',
    column_id: card?.column_id || 0,
    assigned_user_id: card?.assigned_user_id || 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  React.useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description,
        column_id: card.column_id,
        assigned_user_id: card.assigned_user_id || 0
      });
    }
  }, [card]);

  const columnOptions = columns.map(column => ({
    value: column.id,
    label: column.name
  }));

  const userOptions = [
    { value: 0, label: 'Non assigné' },
    ...users.map(user => ({
      value: user.id,
      label: user.username
    }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!card) return;
    
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    
    if (formData.column_id === 0) {
      setError('Veuillez sélectionner une colonne');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onUpdateCard(card.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    
    setIsLoading(true);
    try {
      await onDeleteCard(card.id);
      onClose();
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#3B82F6'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#EBF4FF' : 'white',
      color: state.isSelected ? 'white' : '#374151'
    })
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Éditer la carte">
      {showDeleteConfirm ? (
        <div className="text-center py-4">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Supprimer la carte
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Êtes-vous sûr de vouloir supprimer cette carte ? Cette action est irréversible.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le titre de la carte"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description de la carte (optionnel)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colonne *
            </label>
            <Select
              options={columnOptions}
              value={columnOptions.find(option => option.value === formData.column_id) || null}
              onChange={(selectedOption) =>
                setFormData({ ...formData, column_id: selectedOption?.value || 0 })
              }
              placeholder="Sélectionnez une colonne"
              styles={customSelectStyles}
              isDisabled={isLoading}
              isClearable={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utilisateur assigné
            </label>
            <Select
              options={userOptions}
              value={userOptions.find(option => option.value === formData.assigned_user_id) || null}
              onChange={(selectedOption) =>
                setFormData({ ...formData, assigned_user_id: selectedOption?.value || 0 })
              }
              placeholder="Sélectionnez un utilisateur"
              styles={customSelectStyles}
              isDisabled={isLoading}
              isClearable={false}
            />
          </div>

          {/* Labels */}
          {card && (
            <div>
              <LabelSelector
                cardId={card.id}
                boardId={card.board_id}
                currentUserId={currentUserId}
                onLabelsChanged={async () => {
                  // Recharger les labels de la carte après modification
                  if (card) {
                    try {
                      const response = await fetch(`http://localhost:3001/api/cards/${card.id}/labels`);
                      const data = await response.json();
                      if (data.success) {
                        card.labels = data.labels;
                      }
                    } catch (err) {
                      // ignore
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Checklists */}
          {card && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Checklists
              </label>
              <ChecklistManager
                cardId={card.id}
                currentUserId={currentUserId}
                onChecklistsChanged={() => {
                  // Pas besoin de recharger, les checklists se gèrent elles-mêmes
                }}
              />
            </div>
          )}

          {card && (
            <div className="text-xs text-gray-500">
              Créée le {new Date(card.created_at).toLocaleDateString('fr-FR')} à {new Date(card.created_at).toLocaleTimeString('fr-FR')}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
              disabled={isLoading}
            >
              Supprimer
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditCardModal;
