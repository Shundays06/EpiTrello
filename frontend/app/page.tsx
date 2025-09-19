"use client";
import { useState, useEffect } from 'react';
import BoardSelect from '../components/BoardSelect';
import CreateCardModal from '../components/CreateCardModal';
import CreateColumnModal from '../components/CreateColumnModal';
import CreateBoardModal from '../components/CreateBoardModal';

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
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
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
      console.log('Fetching cards for board:', selectedBoardId);
      const response = await fetch(`http://localhost:3001/api/boards/${selectedBoardId}/cards`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      if (data.success) {
        setCards(data.cards);
      } else {
        setError(`Erreur API: ${data.message}`);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
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
  const handleCreateCard = async (cardData: {
    title: string;
    description: string;
    column_id: number;
    assigned_user_id: number;
  }) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cardData.title.trim(),
          description: cardData.description.trim(),
          column_id: cardData.column_id,
          board_id: selectedBoardId,
          assigned_user_id: cardData.assigned_user_id
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setError(null);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      throw new Error(`Erreur lors de la création de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Create column
  const handleCreateColumn = async (columnData: {
    name: string;
    position: number;
  }) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: columnData.name.trim(),
          position: columnData.position,
          board_id: selectedBoardId ?? 1
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchColumns();
        setError(null);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      throw new Error(`Erreur lors de la création de la colonne: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Create board
  const handleCreateBoard = async (boardData: {
    name: string;
    description: string;
  }) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: boardData.name.trim(), 
          description: boardData.description.trim() 
        })
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la création du board');
      }
      const data = await response.json();
      if (data.success) {
        await fetchBoards();
        setError(null);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      throw new Error(`Erreur lors de la création du board: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
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
              <BoardSelect
                boards={boards}
                selectedBoardId={selectedBoardId}
                onBoardChange={setSelectedBoardId}
              />
              <button
                onClick={() => setShowBoardModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Nouveau board
              </button>
              <button
                onClick={() => setShowColumnModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Créer une colonne
              </button>
              <button
                onClick={createTestCard}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Créer carte de test
              </button>
              <button
                onClick={() => setShowCardModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Nouvelle carte
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <CreateBoardModal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        onCreateBoard={handleCreateBoard}
      />

      <CreateColumnModal
        isOpen={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        onCreateColumn={handleCreateColumn}
      />

      <CreateCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        columns={columns}
        users={users}
        onCreateCard={handleCreateCard}
      />

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ✕
            </button>
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
            <button
              onClick={createDefaultColumns}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium"
            >
              Créer colonnes de base
            </button>
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
