import React, { useState } from 'react';
import Select from 'react-select';
import Modal from './Modal';

interface Column {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  users: User[];
  onCreateCard: (cardData: {
    title: string;
    description: string;
    column_id: number;
    assigned_user_id: number;
  }) => Promise<void>;
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({
  isOpen,
  onClose,
  columns,
  users,
  onCreateCard
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    column_id: 0,
    assigned_user_id: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columnOptions = columns.map(column => ({
    value: column.id,
    label: column.name
  }));

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.username
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    
    if (formData.column_id === 0) {
      setError('Veuillez sélectionner une colonne');
      return;
    }
    
    if (formData.assigned_user_id === 0) {
      setError('Veuillez sélectionner un utilisateur');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreateCard(formData);
      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        column_id: 0,
        assigned_user_id: 0
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      column_id: 0,
      assigned_user_id: 0
    });
    setError(null);
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer une nouvelle carte">
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
            Utilisateur assigné *
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

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer la carte'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCardModal;
