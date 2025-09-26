import React, { useState } from 'react';
import Modal from './Modal';

interface CreateColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateColumn: (columnData: {
    name: string;
  }) => Promise<void>;
}

const CreateColumnModal: React.FC<CreateColumnModalProps> = ({
  isOpen,
  onClose,
  onCreateColumn
}) => {
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Le nom de la colonne est obligatoire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreateColumn(formData);
      // Reset form and close modal
      setFormData({
        name: ''
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
      name: ''
    });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer une nouvelle colonne">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom de la colonne *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: À faire, En cours, Terminé..."
            disabled={isLoading}
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
            {isLoading ? 'Création...' : 'Créer la colonne'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateColumnModal;
