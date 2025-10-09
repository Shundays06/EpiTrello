"use client";
import { useState, useEffect } from 'react';
import BoardSelect from '../components/BoardSelect';
import CreateCardModal from '../components/CreateCardModal';
import CreateColumnModal from '../components/CreateColumnModal';
import CreateBoardModal from '../components/CreateBoardModal';
import InviteUserModal from '../components/InviteUserModal';
import InvitationsModal from '../components/InvitationsModal';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';
import UserProfileModal from '../components/UserProfileModal';
import OrganizationsModal from '../components/OrganizationsModal';
import KanbanBoard from '../components/KanbanBoard';
import EditCardModal from '../components/EditCardModal';
import ManageLabelsModal from '../components/ManageLabelsModal';
import NotificationCenter from '../components/NotificationCenter';

interface Column {
  id: number;
  name: string;
}

interface Label {
  id: number;
  name: string;
  color: string;
  board_id: number;
}

interface Card {
  id: number;
  title: string;
  description: string;
  column_id: number;
  position: number;
  board_id: number;
  assigned_user_id?: number;
  created_at: string;
  labels?: Label[];
  due_date?: string;
  due_date_completed?: boolean;
  due_date_completed_at?: string;
  due_date_completed_by?: number;
}

interface Board {
  id: number;
  name: string;
  description: string;
  organization_name?: string;
  organization_role?: string;
  user_role?: string;
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
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
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

  // Fetch cards with labels
  const fetchCards = async () => {
    if (!selectedBoardId) return;
    try {
      console.log('Fetching cards for board:', selectedBoardId);
      const response = await fetch(`http://localhost:3001/api/boards/${selectedBoardId}/cards-with-labels`);
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

  // Fetch labels
  const fetchLabels = async () => {
    if (!selectedBoardId || !currentUser) return;
    try {
      const response = await fetch(`http://localhost:3001/api/boards/${selectedBoardId}/labels?user_id=${currentUser.id}`);
      const data = await response.json();
      if (data.success) {
        setLabels(data.labels);
      }
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  };

  // Fetch unread notifications count
  const fetchUnreadNotificationsCount = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`http://localhost:3001/api/notifications/unread-count?user_id=${currentUser.id}`);
      const data = await response.json();
      if (data.success) {
        setUnreadNotificationsCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching unread notifications count:', err);
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

  // Check if user can create content on the selected board
  const canCreateContent = () => {
    if (!currentUser || !selectedBoardId) return false;
    const board = boards.find(b => b.id === selectedBoardId);
    if (!board) return false;
    
    // Owner can always create
    // Admin roles can create
    // Members might have restricted permissions
    const userRole = board.user_role;
    const orgRole = board.organization_role;
    
    // If user is owner of the board
    if (userRole === 'owner') return true;
    
    // If user has admin role in organization
    if (orgRole === 'admin' || orgRole === 'owner') return true;
    
    // If user has admin role on the board
    if (userRole === 'admin') return true;
    
    // Default: allow for now, but could be restricted
    return true;
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
    organization_id?: number;
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
          owner_id: currentUser.id,
          organization_id: boardData.organization_id || null
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

  // Load columns, cards and labels when board changes
  useEffect(() => {
    if (selectedBoardId) {
      fetchColumns();
      fetchCards();
      fetchLabels();
    }
  }, [selectedBoardId]);

  // Load boards when user changes
  useEffect(() => {
    if (currentUser) {
      fetchBoards();
      fetchUnreadNotificationsCount();
    } else {
      // Quand l'utilisateur se déconnecte, vider tout immédiatement
      setBoards([]);
      setSelectedBoardId(null);
      setColumns([]);
      setCards([]);
      setError(null);
      setIsLoadingBoards(false);
      setUnreadNotificationsCount(0);
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-xl text-gray-900 dark:text-white">Chargement d&apos;EpiTrello...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EpiTrello</h1>
              
              {/* Bouton de connexion/profil */}
              {currentUser ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-700 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {currentUser.username}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Voir le profil</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowNotificationsModal(true)}
                    className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title="Notifications"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a.55.55 0 010-.78L20 9V6a8 8 0 10-16 0v3l3.5 3.72a.55.55 0 010 .78L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Se connecter
                </button>
              )}
            </div>
            <div className="hidden md:flex gap-2 items-center">
              {!currentUser && (
                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm">
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
              {currentUser && (
                <button
                  onClick={() => setShowInvitationsModal(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Invitations
                </button>
              )}
              {currentUser && (
                <button
                  onClick={() => setShowOrganizationsModal(true)}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Organisations
                </button>
              )}
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-col space-y-2">
                {!currentUser && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm">
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
                {currentUser && (
                  <button
                    onClick={() => setShowInvitationsModal(true)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Invitations
                  </button>
                )}
                {currentUser && (
                  <button
                    onClick={() => setShowOrganizationsModal(true)}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Organisations
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <CreateBoardModal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        currentUserId={currentUser?.id || null}
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
        boardId={selectedBoardId || undefined}
        currentUserId={currentUser?.id}
        onCreateCard={handleCreateCard}
      />

      <EditCardModal
        isOpen={showEditCardModal}
        onClose={() => {
          setShowEditCardModal(false);
          setSelectedCard(null);
          // Rafraîchir les cartes après modification
          fetchCards();
        }}
        card={selectedCard}
        columns={columns}
        users={users}
        labels={labels}
        currentUserId={currentUser?.id || 0}
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
        onRegisterClick={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegister={(user) => {
          setCurrentUser(user);
          setShowRegisterModal(false);
        }}
        onLoginClick={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
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

      {selectedBoardId && currentUser && (
        <ManageLabelsModal
          isOpen={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
          boardId={selectedBoardId}
          currentUserId={currentUser.id}
          onLabelsUpdated={fetchLabels}
        />
      )}

      {currentUser && (
        <NotificationCenter
          isOpen={showNotificationsModal}
          onClose={() => {
            setShowNotificationsModal(false);
            // Rafraîchir le nombre de notifications après fermeture
            fetchUnreadNotificationsCount();
          }}
          currentUserId={currentUser.id}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
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
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bienvenue sur EpiTrello !
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Connectez-vous pour accéder à vos boards personnels et collaborer avec votre équipe.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
              >
                Se connecter
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
              >
                S'inscrire
              </button>
            </div>
          </div>
        ) : isLoadingBoards ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Chargement de vos boards...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Récupération de vos tableaux personnels.
            </p>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Aucun board disponible
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Sélectionnez un board
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Choisissez un board dans la liste ci-dessus pour commencer.
            </p>
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Aucune colonne trouvée
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
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
          <div className="space-y-6">
            {/* Board Actions Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Actions du board
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{columns.length} colonnes • {cards.length} cartes</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {selectedBoardId && currentUser && canCreateContent() && (
                    <button
                      onClick={() => setShowColumnModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      title="Ajouter une colonne"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Colonne
                    </button>
                  )}
                  
                  {selectedBoardId && currentUser && canCreateContent() && (
                    <button
                      onClick={() => setShowCardModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      title="Créer une carte"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Carte
                    </button>
                  )}
                  
                  {selectedBoardId && currentUser && canCreateContent() && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      title="Inviter un utilisateur"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Inviter
                    </button>
                  )}
                  
                  {selectedBoardId && currentUser && canCreateContent() && (
                    <button
                      onClick={() => setShowLabelsModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      title="Gérer les labels"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Labels
                    </button>
                  )}
                  
                  {selectedBoardId && currentUser && canCreateContent() && (
                    <div className="border-l border-gray-300 dark:border-gray-600 pl-3 ml-3">
                      <button
                        onClick={() => handleDeleteBoard(selectedBoardId)}
                        className="inline-flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                        title="Supprimer ce board"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Kanban Board */}
            <KanbanBoard
              columns={columns}
              cards={cards}
              users={users}
              onCardMove={handleCardMove}
              onCardClick={handleCardClick}
              onColumnDelete={handleDeleteColumn}
            />
          </div>
        )}
      </main>
    </div>
  );
}
