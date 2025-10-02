'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface Label {
  id: number;
  name: string;
  color: string;
  board_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface Color {
  name: string;
  value: string;
  hex: string;
}

interface ManageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: number;
  currentUserId: number;
  onLabelsUpdated: () => void;
}

const ManageLabelsModal: React.FC<ManageLabelsModalProps> = ({
  isOpen,
  onClose,
  boardId,
  currentUserId,
  onLabelsUpdated
}) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [newLabel, setNewLabel] = useState({ name: '', color: 'blue' });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Charger les labels et couleurs disponibles
  useEffect(() => {
    if (isOpen) {
      loadLabels();
      loadAvailableColors();
    }
  }, [isOpen, boardId]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/boards/${boardId}/labels`);
      const data = await response.json();
      
      if (data.success) {
        setLabels(data.labels);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableColors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/labels/colors');
      const data = await response.json();
      
      if (data.success) {
        setAvailableColors(data.colors);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des couleurs:', error);
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLabel.name.trim(),
          color: newLabel.color,
          board_id: boardId,
          created_by: currentUserId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNewLabel({ name: '', color: 'blue' });
        setShowCreateForm(false);
        loadLabels();
        onLabelsUpdated();
      } else {
        alert(data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création du label');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLabel = async (label: Label) => {
    if (!editingLabel) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/labels/${label.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingLabel.name.trim(),
          color: editingLabel.color,
          user_id: currentUserId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingLabel(null);
        loadLabels();
        onLabelsUpdated();
      } else {
        alert(data.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      alert('Erreur lors de la modification du label');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce label ? Il sera retiré de toutes les cartes.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/labels/${labelId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        loadLabels();
        onLabelsUpdated();
      } else {
        alert(data.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du label');
    } finally {
      setLoading(false);
    }
  };

  const getColorStyle = (colorValue: string) => {
    const color = availableColors.find(c => c.value === colorValue);
    return {
      backgroundColor: color?.hex || '#6b7280',
    };
  };

  const getTextColorClass = (colorValue: string) => {
    const lightColors = ['yellow', 'pink', 'orange'];
    return lightColors.includes(colorValue) ? 'text-gray-800' : 'text-white';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gérer les labels">
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement...</p>
          </div>
        )}

        {/* En-tête avec bouton créer */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Labels du board ({labels.length})
          </h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Nouveau label
          </button>
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Créer un nouveau label</h4>
            <form onSubmit={handleCreateLabel} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du label *
                </label>
                <input
                  type="text"
                  value={newLabel.name}
                  onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Urgent, En test, Validé..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewLabel({ ...newLabel, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newLabel.color === color.value ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewLabel({ name: '', color: 'blue' });
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !newLabel.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des labels */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {labels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun label pour ce board</p>
              <p className="text-sm mt-1">Créez votre premier label pour organiser vos cartes</p>
            </div>
          ) : (
            labels.map((label) => (
              <div key={label.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                {editingLabel?.id === label.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editingLabel.name}
                      onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <div className="flex flex-wrap gap-1">
                      {availableColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setEditingLabel({ ...editingLabel, color: color.value })}
                          className={`w-6 h-6 rounded-full border ${
                            editingLabel.color === color.value ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateLabel(label)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Sauver
                      </button>
                      <button
                        onClick={() => setEditingLabel(null)}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getTextColorClass(label.color)}`}
                        style={getColorStyle(label.color)}
                      >
                        {label.name}
                      </div>
                      <span className="text-xs text-gray-500">
                        Créé le {new Date(label.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingLabel({ ...label })}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageLabelsModal;
