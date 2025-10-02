'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface User {
  id: number;
  username: string;
  email: string;
}

interface InviteToOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  organizationName: string;
  currentUserId: number;
  onMemberAdded: () => void;
}

const InviteToOrganizationModal: React.FC<InviteToOrganizationModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  currentUserId,
  onMemberAdded
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<'email' | 'user'>('email');

  // Charger les utilisateurs disponibles
  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      const data = await response.json();
      
      if (data.success) {
        // Filtrer pour exclure l'utilisateur actuel
        const filteredUsers = data.users.filter((user: User) => user.id !== currentUserId);
        setAvailableUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!email.trim() && !selectedUserId) || loading) return;

    setLoading(true);
    try {
      let targetUserId = selectedUserId;
      
      // Si on utilise l'email, trouver l'utilisateur correspondant
      if (searchMode === 'email' && email.trim()) {
        const user = availableUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
        if (!user) {
          alert('Aucun utilisateur trouvé avec cet email');
          setLoading(false);
          return;
        }
        targetUserId = user.id;
      }

      if (!targetUserId) {
        alert('Veuillez sélectionner un utilisateur');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:3001/api/organizations/${organizationId}/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: targetUserId,
          role,
          added_by: currentUserId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEmail('');
        setSelectedUserId(null);
        setRole('member');
        onMemberAdded();
        onClose();
      } else {
        alert(data.message || 'Erreur lors de l\'ajout du membre');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      alert('Erreur lors de l\'ajout du membre');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inviter dans "${organizationName}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode de recherche */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Comment voulez-vous ajouter le membre ?
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="email"
                checked={searchMode === 'email'}
                onChange={(e) => setSearchMode(e.target.value as 'email')}
                className="mr-2"
              />
              Par email
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="user"
                checked={searchMode === 'user'}
                onChange={(e) => setSearchMode(e.target.value as 'user')}
                className="mr-2"
              />
              Choisir dans la liste
            </label>
          </div>
        </div>

        {/* Champ email */}
        {searchMode === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de l'utilisateur *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="utilisateur@example.com"
              required={searchMode === 'email'}
            />
          </div>
        )}

        {/* Sélection utilisateur */}
        {searchMode === 'user' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionner un utilisateur *
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={searchMode === 'user'}
            >
              <option value="">Choisir un utilisateur...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rôle dans l'organisation
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="member">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Les administrateurs peuvent gérer les membres et les paramètres de l'organisation.
          </p>
        </div>

        {/* Boutons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || (searchMode === 'email' && !email.trim()) || (searchMode === 'user' && !selectedUserId)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteToOrganizationModal;
