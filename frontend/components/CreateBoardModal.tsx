import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface Organization {
  id: number;
  name: string;
  description: string;
  user_role: string;
}

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: number | null;
  onCreateBoard: (boardData: {
    name: string;
    description: string;
    organization_id?: number;
  }) => Promise<void>;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onCreateBoard
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization_id: undefined as number | undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Le nom du board est obligatoire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreateBoard(formData);
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        organization_id: undefined
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
      name: '',
      description: '',
      organization_id: undefined
    });
    setError(null);
    onClose();
  };

  // Charger les organisations de l'utilisateur
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isOpen || !currentUserId) return;
      
      try {
        const response = await fetch(`http://localhost:3001/api/organizations?user_id=${currentUserId}`);
        const data = await response.json();
        
        if (data.success) {
          // Filtrer seulement les organisations où l'utilisateur peut créer des boards
          const eligibleOrgs = data.organizations.filter((org: Organization) => 
            ['owner', 'admin'].includes(org.user_role)
          );
          setOrganizations(eligibleOrgs);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des organisations:', error);
      }
    };

    loadOrganizations();
  }, [isOpen, currentUserId]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer un nouveau board">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Sélection organisation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organisation
          </label>
          <select
            value={formData.organization_id || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              organization_id: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={isLoading}
          >
            <option value="">Board personnel (aucune organisation)</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.user_role === 'owner' ? 'Propriétaire' : 'Admin'})
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Choisissez une organisation ou créez un board personnel
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du board *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Ex: Projet Web, Sprint 1, Backlog..."
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Description du board (optionnel)"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Décrivez l'objectif ou le contexte de ce board
          </p>
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
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer le board'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBoardModal;
