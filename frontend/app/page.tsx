"use client";
import { useState, useEffect } from 'react';
import BoardSelect from '../components/BoardSelect';
import CreateCardModal from '../components/CreateCardModal';
import CreateColumnModal from '../components/CreateColumnModal';
import CreateBoardModal from '../components/CreateBoardModal';
import InviteUserModal from '../components/InviteUserModal';
import InvitationsModal from '../components/InvitationsModal';
import LoginModal from '../components/LoginModal';
import UserProfileModal from '../components/UserProfileModal';
import OrganizationsModal from '../components/OrganizationsModal';
import KanbanBoard from '../components/KanbanBoard';
import EditCardModal from '../components/EditCardModal';

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
  email: string;
  created_at: string;
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
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrganizationsModal, setShowOrganizationsModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch boards (seulement ceux accessibles par l'utilisateur)
  const fetchBoards = async () => {
    if (!currentUser) {
      setBoards([])
      setIsLoadingBoards(false)
      return
    }

    setIsLoadingBoards(true)
    try {
      const response = await fetch(`http://localhost:3001/api/boards?user_id=${currentUser.id}`);
      const data = await response.json();
      if (data.success) {
        setBoards(data.boards);
        if (data.boards.length > 0 && selectedBoardId === null) {
          setSelectedBoardId(data.boards[0].id);
        } else if (data.boards.length === 0) {
          setSelectedBoardId(null);
        }
        // Vérifier si le board sélectionné est toujours accessible
        else if (selectedBoardId && !data.boards.find((b: Board) => b.id === selectedBoardId)) {
          setSelectedBoardId(data.boards.length > 0 ? data.boards[0].id : null);
        }
      }
    } catch (err) {
      setError('Erreur lors du chargement des boards');
    } finally {
      setIsLoadingBoards(false)
    }
  };

  // Fetch columns
  const fetchColumns = async () => {
    if (!selectedBoardId) return;
    try {
      const response = await fetch(`http://localhost:3001/api/columns?board_id=${selectedBoardId}`);
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
        // Ne plus définir automatiquement l'utilisateur admin
        // L'utilisateur devra se "connecter" manuellement
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

  // Create default users
  const createDefaultUsers = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/users/create-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        await fetchUsers();
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création des utilisateurs: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
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
  }) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: columnData.name.trim(),
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
    if (!currentUser) {
      throw new Error('Vous devez être connecté pour créer un board');
    }

    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: boardData.name.trim(), 
          description: boardData.description.trim(),
          owner_id: currentUser.id
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

  // Move card function for drag & drop
  const handleCardMove = async (cardId: number, newColumnId: number, newPosition: number) => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column_id: newColumnId,
          position: newPosition
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards(); // Refresh cards after move
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(`Erreur lors du déplacement de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      // Refresh cards to revert UI changes
      await fetchCards();
    }
  };

  // Handle card click for editing
  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setShowEditCardModal(true);
  };

  // Update card function
  const handleUpdateCard = async (cardId: number, cardData: {
    title: string;
    description: string;
    column_id: number;
    assigned_user_id: number;
  }) => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      throw new Error(`Erreur lors de la mise à jour de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Delete card function
  const handleDeleteCard = async (cardId: number) => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchCards();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      throw new Error(`Erreur lors de la suppression de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Delete board
  const handleDeleteBoard = async (boardId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce board ? Cette action est irréversible.')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`http://localhost:3001/api/boards/${boardId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchBoards();
        // Si c'était le board actuel, sélectionner le premier board disponible
        if (boardId === selectedBoardId) {
          const updatedBoards = boards.filter(b => b.id !== boardId);
          if (updatedBoards.length > 0) {
            setSelectedBoardId(updatedBoards[0].id);
          } else {
            setSelectedBoardId(null);
            setColumns([]);
            setCards([]);
          }
        }
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la suppression du board: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:3001/api/columns/${columnId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        // Rafraîchir les colonnes et cartes
        await fetchColumns();
        await fetchCards();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la suppression de la colonne: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Initial load with auto-initialization
  useEffect(() => {
    const loadBoardsAndUsers = async () => {
      setLoading(true);
      await Promise.all([fetchBoards(), fetchUsers()]);
      
      // Auto-create default users if none exist
      const usersResponse = await fetch('http://localhost:3001/api/users');
      const usersData = await usersResponse.json();
      if (usersData.success && usersData.users.length === 0) {
        await createDefaultUsers();
      }
      
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

  // Load boards when user changes
  useEffect(() => {
    if (currentUser) {
      fetchBoards();
    } else {
      // Quand l'utilisateur se déconnecte, vider tout immédiatement
      setBoards([]);
      setSelectedBoardId(null);
      setColumns([]);
      setCards([]);
      setError(null);
      setIsLoadingBoards(false);
    }
  }, [currentUser]);

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
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">EpiTrello</h1>
              
              {/* Bouton de connexion/profil */}
              {currentUser ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md border border-blue-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {currentUser.username}
                    </div>
                    <div className="text-xs text-gray-600">Voir le profil</div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Se connecter
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {!currentUser && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-md text-sm">
                  👆 Connectez-vous pour accéder à toutes les fonctionnalités
                </div>
              )}
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
              {selectedBoardId && (
                <button
                  onClick={() => handleDeleteBoard(selectedBoardId)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Supprimer ce board"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowColumnModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Créer une colonne
              </button>
              <button
                onClick={() => setShowCardModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Nouvelle carte
              </button>
              {selectedBoardId && currentUser && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Inviter un utilisateur"
                >
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Inviter
                </button>
              )}
              {currentUser && (
                <button
                  onClick={() => setShowInvitationsModal(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Voir mes invitations"
                >
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Invitations
                </button>
              )}
              {currentUser && (
                <button
                  onClick={() => setShowOrganizationsModal(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  title="Gérer mes organisations"
                >
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Organisations
                </button>
              )}
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

      <EditCardModal
        isOpen={showEditCardModal}
        onClose={() => {
          setShowEditCardModal(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        columns={columns}
        users={users}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
      />

      {selectedBoardId && currentUser && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          boardId={selectedBoardId}
          boardName={boards.find(b => b.id === selectedBoardId)?.name || 'Board'}
          currentUserId={currentUser.id}
        />
      )}

      {currentUser && (
        <InvitationsModal
          isOpen={showInvitationsModal}
          onClose={() => setShowInvitationsModal(false)}
          userEmail={currentUser.email}
        />
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={setCurrentUser}
      />

      {currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={currentUser}
          onLogout={() => setCurrentUser(null)}
        />
      )}

      {currentUser && (
        <OrganizationsModal
          isOpen={showOrganizationsModal}
          onClose={() => setShowOrganizationsModal(false)}
          currentUser={currentUser}
        />
      )}

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
        {!currentUser ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Bienvenue sur EpiTrello !
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Connectez-vous pour accéder à vos boards personnels et collaborer avec votre équipe.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              Se connecter
            </button>
          </div>
        ) : isLoadingBoards ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Chargement de vos boards...
            </h2>
            <p className="text-gray-600">
              Récupération de vos tableaux personnels.
            </p>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aucun board disponible
            </h2>
            <p className="text-gray-600 mb-6">
              Créez votre premier board pour commencer à organiser vos tâches.
            </p>
            <button
              onClick={() => setShowBoardModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md text-sm font-medium"
            >
              Créer mon premier board
            </button>
          </div>
        ) : !selectedBoardId ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Sélectionnez un board
            </h2>
            <p className="text-gray-600">
              Choisissez un board dans la liste ci-dessus pour commencer.
            </p>
          </div>
        ) : columns.length === 0 ? (
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
          <KanbanBoard
            columns={columns}
            cards={cards}
            users={users}
            onCardMove={handleCardMove}
            onCardClick={handleCardClick}
            onColumnDelete={handleDeleteColumn}
          />
        )}
      </main>
    </div>
  );
}
