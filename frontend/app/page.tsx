"use client";
import { useState, useEffect } from 'react';

interface Column {
  id: number;
  name: string;
}

interface Card {
  id: number;
  title: string;
  description: string;
  column_id: number;
  board_id: number;
  assigned_user_id?: number;
  created_at: string;
}

interface Board {
  id: number;
  name: string;
  description: string;
}

interface User {
  id: number;
  username: string;
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoard, setNewBoard] = useState({ name: '', description: '' });
  const [newCard, setNewCard] = useState({ title: '', description: '', columnId: 0, assignedUserId: 0 });
  const [error, setError] = useState<string | null>(null);

  // Fetch boards
  const fetchBoards = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/boards');
      const data = await response.json();
      if (data.success) {
        setBoards(data.boards);
        if (data.boards.length > 0 && selectedBoardId === null) {
          setSelectedBoardId(data.boards[0].id);
        }
      }
    } catch (err) {
      setError('Erreur lors du chargement des boards');
    }
  };

  // Fetch columns
  const fetchColumns = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/columns');
      const data = await response.json();
      if (data.success) {
        setColumns(data.columns);
      }
    } catch (err) {
      setError('Erreur lors du chargement des colonnes');
    }
  };

  // Fetch cards
  const fetchCards = async () => {
    if (!selectedBoardId) return;
    try {
      const response = await fetch(`http://localhost:3001/api/boards/${selectedBoardId}/cards`);
      const data = await response.json();
      if (data.success) {
        setCards(data.cards);
      }
    } catch (err) {
      setError('Erreur lors du chargement des cartes');
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    }
  };

  // Get cards for a column
  const getCardsForColumn = (columnId: number) => {
    return cards.filter(card => card.column_id === columnId);
  };

  // Create default columns
  const createDefaultColumns = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/columns/create-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        await fetchColumns();
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création des colonnes: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Create test card
  const createTestCard = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/cards/create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création de la carte de test: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Create custom card
  const createCustomCard = async () => {
    if (!newCard.title.trim()) {
      setError('Le titre de la carte est obligatoire');
      return;
    }
    if (newCard.columnId === 0) {
      setError('Veuillez sélectionner une colonne');
      return;
    }
    if (newCard.assignedUserId === 0) {
      setError('Veuillez sélectionner un utilisateur');
      return;
    }
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCard.title.trim(),
          description: newCard.description.trim(),
          column_id: newCard.columnId,
          board_id: selectedBoardId,
          assigned_user_id: newCard.assignedUserId
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setNewCard({ title: '', description: '', columnId: 0, assignedUserId: 0 });
        setShowCreateForm(false);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Initial load
  useEffect(() => {
    const loadBoardsAndUsers = async () => {
      setLoading(true);
      await Promise.all([fetchBoards(), fetchUsers()]);
      setLoading(false);
    };
    loadBoardsAndUsers();
  }, []);

  // Load columns and cards when board changes
  useEffect(() => {
    if (selectedBoardId) {
      fetchColumns();
      fetchCards();
    }
  }, [selectedBoardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Chargement d&apos;EpiTrello...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">EpiTrello</h1>
            <div className="flex gap-2 items-center">
              <select
                value={selectedBoardId ?? 0}
                onChange={e => setSelectedBoardId(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium"
              >
                {boards.length === 0 && <option value={0}>Aucun board</option>}
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowBoardForm(!showBoardForm)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {showBoardForm ? 'Annuler' : 'Nouveau board'}
              </button>
              <button
                onClick={createDefaultColumns}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Créer colonnes de base
              </button>
              <button
                onClick={createTestCard}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Créer carte de test
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {showCreateForm ? 'Annuler' : 'Nouvelle carte'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Formulaire de création de board */}
      {showBoardForm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un nouveau board</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={newBoard.name}
                  onChange={e => setNewBoard({ ...newBoard, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nom du board"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newBoard.description}
                  onChange={e => setNewBoard({ ...newBoard, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Description du board (optionnel)"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={async () => {
                  if (!newBoard.name.trim()) {
                    setError('Le nom du board est obligatoire');
                    return;
                  }
                  setError(null);
                  const response = await fetch('http://localhost:3001/api/boards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newBoard.name.trim(), description: newBoard.description.trim() })
                  });
                  if (!response.ok) {
                    setError('Erreur lors de la création du board');
                    return;
                  }
                  const data = await response.json();
                  if (data.success) {
                    await fetchBoards();
                    setShowBoardForm(false);
                    setNewBoard({ name: '', description: '' });
                    setError(null);
                  } else {
                    setError(data.message);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium"
              >
                Créer le board
              </button>
              <button
                onClick={() => {
                  setShowBoardForm(false);
                  setNewBoard({ name: '', description: '' });
                  setError(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de création de carte */}
      {showCreateForm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer une nouvelle carte</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
                <input
                  type="text"
                  value={newCard.title}
                  onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le titre de la carte"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Colonne *</label>
                <select
                  value={newCard.columnId}
                  onChange={(e) => setNewCard({...newCard, columnId: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sélectionnez une colonne</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>{column.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur assigné *</label>
                <select
                  value={newCard.assignedUserId}
                  onChange={(e) => setNewCard({...newCard, assignedUserId: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value={0}>Sélectionnez un utilisateur</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newCard.description}
                onChange={(e) => setNewCard({...newCard, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez la description de la carte (optionnel)"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={createCustomCard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium"
              >
                Créer la carte
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCard({ title: '', description: '', columnId: 0, assignedUserId: 0 });
                  setError(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {columns.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aucune colonne trouvée
            </h2>
            <p className="text-gray-600 mb-6">
              Cliquez sur &quot;Créer colonnes de base&quot; pour commencer.
            </p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="bg-gray-200 rounded-lg p-4 min-w-[300px] max-w-[300px]"
              >
                <h3 className="font-semibold text-gray-800 mb-4">
                  {column.name}
                </h3>
                <div className="space-y-3">
                  {getCardsForColumn(column.id).map((card: Card) => (
                    <div
                      key={card.id}
                      className="bg-white rounded shadow-sm p-3 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 mb-2">
                        {card.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {card.description}
                      </p>
                      <div className="mt-2 text-xs text-gray-400">
                        Créée le {new Date(card.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      {card.assigned_user_id && (
                        <div className="mt-1 text-xs text-green-700">
                          Assignée à : {users.find((u: any) => u.id === card.assigned_user_id)?.username || 'Utilisateur inconnu'}
                        </div>
                      )}
                    </div>
                  ))}
                  {getCardsForColumn(column.id).length === 0 && (
                    <div className="text-gray-500 text-sm italic py-4 text-center">
                      Aucune carte dans cette colonne
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
