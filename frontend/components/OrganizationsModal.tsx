'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface Organization {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_username: string;
  user_role?: string;
  member_since?: string;
  created_at: string;
  updated_at: string;
  members?: OrganizationMember[];
}

interface OrganizationMember {
  id: number;
  user_id: number;
  username: string;
  email: string;
  role: string;
  added_at: string;
  added_by_username: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface OrganizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const OrganizationsModal: React.FC<OrganizationsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOrgDetails, setShowOrgDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulaire de création
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  // Charger les organisations
  useEffect(() => {
    if (isOpen && currentUser) {
      loadOrganizations();
    }
  }, [isOpen, currentUser]);

  const loadOrganizations = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/organizations?user_id=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          owner_id: currentUser.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCreateForm({ name: '', description: '' });
        setShowCreateForm(false);
        loadOrganizations(); // Recharger la liste
      } else {
        alert(data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création de l\'organisation');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationDetails = async (orgId: number) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/organizations/${orgId}?user_id=${currentUser.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedOrg(data.organization);
        setShowOrgDetails(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveOrganization = async (orgId: number) => {
    if (!currentUser) return;
    
    const confirm = window.confirm('Êtes-vous sûr de vouloir quitter cette organisation ?');
    if (!confirm) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/organizations/${orgId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        loadOrganizations(); // Recharger la liste
        setShowOrgDetails(false);
        setSelectedOrg(null);
      } else {
        alert(data.message || 'Erreur lors du départ');
      }
    } catch (error) {
      console.error('Erreur lors du départ:', error);
      alert('Erreur lors du départ de l\'organisation');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'admin': return 'Administrateur';
      case 'member': return 'Membre';
      default: return role;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mes Organisations">
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement...</p>
          </div>
        )}

        {!showCreateForm && !showOrgDetails && (
          <>
            {/* Header avec bouton créer */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Organisations ({organizations.length})
              </h3>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Créer une organisation
              </button>
            </div>

            {/* Liste des organisations */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {organizations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Vous n'appartenez à aucune organisation</p>
                  <p className="text-sm mt-1">Créez-en une ou demandez à être invité</p>
                </div>
              ) : (
                organizations.map((org) => (
                  <div
                    key={org.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadOrganizationDetails(org.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{org.name}</h4>
                        {org.description && (
                          <p className="text-sm text-gray-600 mt-1">{org.description}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(org.user_role || 'member')}`}>
                            {getRoleLabel(org.user_role || 'member')}
                          </span>
                          <span className="text-xs text-gray-500">
                            Propriétaire: {org.owner_username}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>Créée le {new Date(org.created_at).toLocaleDateString('fr-FR')}</p>
                        {org.member_since && (
                          <p>Membre depuis le {new Date(org.member_since).toLocaleDateString('fr-FR')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Retour
              </button>
              <h3 className="text-lg font-semibold text-gray-900">Créer une organisation</h3>
            </div>

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'organisation *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Mon équipe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre organisation..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !createForm.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Détails de l'organisation */}
        {showOrgDetails && selectedOrg && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowOrgDetails(false);
                  setSelectedOrg(null);
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Retour
              </button>
              <h3 className="text-lg font-semibold text-gray-900">{selectedOrg.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedOrg.user_role || 'member')}`}>
                {getRoleLabel(selectedOrg.user_role || 'member')}
              </span>
            </div>

            {selectedOrg.description && (
              <p className="text-gray-600">{selectedOrg.description}</p>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Membres ({selectedOrg.members?.length || 0})
              </h4>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrg.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{member.username}</p>
                      <p className="text-xs text-gray-600">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Ajouté par {member.added_by_username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-4 space-y-2">
              {selectedOrg.user_role !== 'owner' && (
                <button
                  onClick={() => handleLeaveOrganization(selectedOrg.id)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                >
                  Quitter l'organisation
                </button>
              )}
              
              {selectedOrg.user_role === 'owner' && (
                <p className="text-xs text-gray-500 text-center">
                  En tant que propriétaire, vous ne pouvez pas quitter l'organisation.
                  Transférez d'abord la propriété à un autre membre.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OrganizationsModal;
