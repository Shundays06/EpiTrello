'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  created_by: number;
  completed_at?: string;
  completed_by?: number;
}

interface Checklist {
  id: number;
  card_id: number;
  title: string;
  position: number;
  created_at: string;
  created_by: number;
  updated_at: string;
  total_items?: number;
  completed_items?: number;
}

interface ChecklistManagerProps {
  cardId: number;
  currentUserId: number;
  onChecklistsChanged: () => void;
}

const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  cardId,
  currentUserId,
  onChecklistsChanged
}) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [items, setItems] = useState<{ [checklistId: number]: ChecklistItem[] }>({});
  const [loading, setLoading] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showNewChecklistForm, setShowNewChecklistForm] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<{ [checklistId: number]: string }>({});
  const [editingTitle, setEditingTitle] = useState<{ [checklistId: number]: string }>({});

  useEffect(() => {
    loadChecklists();
  }, [cardId]);

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/checklists`);
      const data = await response.json();
      
      if (data.success) {
        setChecklists(data.checklists);
        // Charger les éléments pour chaque checklist
        for (const checklist of data.checklists) {
          await loadChecklistItems(checklist.id);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistItems = async (checklistId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/checklists/${checklistId}/items`);
      const data = await response.json();
      
      if (data.success) {
        setItems(prev => ({
          ...prev,
          [checklistId]: data.items
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des éléments de checklist:', error);
    }
  };

  const createChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newChecklistTitle,
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setNewChecklistTitle('');
        setShowNewChecklistForm(false);
        loadChecklists();
        onChecklistsChanged();
      }
    } catch (error) {
      console.error('Erreur lors de la création de la checklist:', error);
    }
  };

  const updateChecklistTitle = async (checklistId: number, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/checklists/${checklistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setEditingTitle(prev => ({ ...prev, [checklistId]: '' }));
        loadChecklists();
        onChecklistsChanged();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du titre:', error);
    }
  };

  const deleteChecklist = async (checklistId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette checklist ?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/checklists/${checklistId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        loadChecklists();
        onChecklistsChanged();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la checklist:', error);
    }
  };

  const createChecklistItem = async (checklistId: number) => {
    const text = newItemTexts[checklistId];
    if (!text?.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }));
        loadChecklistItems(checklistId);
        loadChecklists(); // Recharger pour mettre à jour les statistiques
        onChecklistsChanged();
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'élément:', error);
    }
  };

  const toggleChecklistItem = async (itemId: number, isCompleted: boolean) => {
    try {
      const response = await fetch(`http://localhost:3001/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_completed: !isCompleted,
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Recharger les éléments et les statistiques
        const checklistId = data.item.checklist_id;
        loadChecklistItems(checklistId);
        loadChecklists();
        onChecklistsChanged();
      } else {
        console.error('Erreur API:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'élément:', error);
    }
  };

  const deleteChecklistItem = async (itemId: number, checklistId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/checklist-items/${itemId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        loadChecklistItems(checklistId);
        loadChecklists();
        onChecklistsChanged();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'élément:', error);
    }
  };

  const getCompletionPercentage = (checklist: Checklist) => {
    const total = checklist.total_items || 0;
    const completed = checklist.completed_items || 0;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const checklistItems = items[checklist.id] || [];
        const completionPercentage = getCompletionPercentage(checklist);
        
        return (
          <div key={checklist.id} className="border border-gray-200 rounded-lg p-4">
            {/* En-tête de la checklist */}
            <div className="flex items-center justify-between mb-3">
              {editingTitle[checklist.id] !== undefined ? (
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="text"
                    value={editingTitle[checklist.id]}
                    onChange={(e) => setEditingTitle(prev => ({ 
                      ...prev, 
                      [checklist.id]: e.target.value 
                    }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateChecklistTitle(checklist.id, editingTitle[checklist.id]);
                      } else if (e.key === 'Escape') {
                        setEditingTitle(prev => ({ ...prev, [checklist.id]: '' }));
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => updateChecklistTitle(checklist.id, editingTitle[checklist.id])}
                    className="text-green-600 hover:text-green-700"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingTitle(prev => ({ ...prev, [checklist.id]: '' }))}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h4 
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => setEditingTitle(prev => ({ 
                        ...prev, 
                        [checklist.id]: checklist.title 
                      }))}
                    >
                      {checklist.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{checklist.completed_items || 0}/{checklist.total_items || 0}</span>
                    {completionPercentage === 100 && (
                      <span className="text-green-600 font-medium">✓ Terminé</span>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => deleteChecklist(checklist.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Supprimer la checklist"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Barre de progression */}
            {(checklist.total_items || 0) > 0 && (
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{completionPercentage}% terminé</div>
              </div>
            )}

            {/* Éléments de la checklist */}
            <div className="space-y-2 mb-3">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-2 group">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => toggleChecklistItem(item.id, item.is_completed)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className={`flex-1 text-sm ${
                    item.is_completed 
                      ? 'line-through text-gray-500' 
                      : 'text-gray-900'
                  }`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id, checklist.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"
                    title="Supprimer l'élément"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Ajouter un nouvel élément */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newItemTexts[checklist.id] || ''}
                onChange={(e) => setNewItemTexts(prev => ({ 
                  ...prev, 
                  [checklist.id]: e.target.value 
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createChecklistItem(checklist.id);
                  }
                }}
                placeholder="Ajouter un élément..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => createChecklistItem(checklist.id)}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Ajouter
              </button>
            </div>
          </div>
        );
      })}

      {/* Ajouter une nouvelle checklist */}
      {showNewChecklistForm ? (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createChecklist();
                } else if (e.key === 'Escape') {
                  setShowNewChecklistForm(false);
                  setNewChecklistTitle('');
                }
              }}
              placeholder="Titre de la checklist..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={createChecklist}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Créer
            </button>
            <button
              onClick={() => {
                setShowNewChecklistForm(false);
                setNewChecklistTitle('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewChecklistForm(true)}
          className="w-full px-4 py-2 text-left text-gray-600 border border-gray-300 border-dashed rounded-lg hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Ajouter une checklist</span>
          </div>
        </button>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}
    </div>
  );
};

export default ChecklistManager;
