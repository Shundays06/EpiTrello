'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onLogout: () => void
}

export default function UserProfileModal({ isOpen, onClose, user, onLogout }: UserProfileModalProps) {
  const [userBoards, setUserBoards] = useState<any[]>([])
  const [userInvitations, setUserInvitations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchUserData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Récupérer les boards (pour l'instant tous, mais on filtrera plus tard)
      const boardsResponse = await fetch('http://localhost:3001/api/boards')
      const boardsData = await boardsResponse.json()
      if (boardsData.success) {
        setUserBoards(boardsData.boards)
      }

      // Récupérer les invitations de l'utilisateur
      const invitationsResponse = await fetch(`http://localhost:3001/api/invitations?email=${encodeURIComponent(user.email)}`)
      const invitationsData = await invitationsResponse.json()
      if (invitationsData.success) {
        setUserInvitations(invitationsData.invitations)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      fetchUserData()
    }
  }, [isOpen, user])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      accepted: { text: 'Acceptée', className: 'bg-green-100 text-green-800' },
      declined: { text: 'Refusée', className: 'bg-red-100 text-red-800' },
      expired: { text: 'Expirée', className: 'bg-gray-100 text-gray-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    )
  }

  const pendingInvitations = userInvitations.filter(inv => inv.status === 'pending')
  const acceptedInvitations = userInvitations.filter(inv => inv.status === 'accepted')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mon Profil">
      <div className="space-y-6">
        {/* Informations utilisateur */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">Membre depuis le {formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2">Chargement des données...</span>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{acceptedInvitations.length}</div>
                <div className="text-sm text-green-700">Boards rejoints</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingInvitations.length}</div>
                <div className="text-sm text-yellow-700">Invitations en attente</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{userBoards.length}</div>
                <div className="text-sm text-blue-700">Boards disponibles</div>
              </div>
            </div>

            {/* Invitations reçues */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mes invitations
              </h4>
              
              {userInvitations.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  Aucune invitation reçue
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userInvitations.slice(0, 5).map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded border"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{invitation.board_name}</div>
                        <div className="text-xs text-gray-500">
                          Par {invitation.invited_by_username} • {formatDate(invitation.created_at)}
                        </div>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>
                  ))}
                  {userInvitations.length > 5 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      ... et {userInvitations.length - 5} autre(s)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Boards accessibles */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Boards accessibles
              </h4>
              
              <div className="text-sm text-gray-600 mb-2">
                💡 Pour l'instant, tous les boards sont visibles. Le système de permissions sera ajouté prochainement.
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {userBoards.slice(0, 3).map((board) => (
                  <div
                    key={board.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded border"
                  >
                    <div>
                      <div className="font-medium text-sm">{board.name}</div>
                      <div className="text-xs text-gray-500">{board.description}</div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Membre
                    </span>
                  </div>
                ))}
                {userBoards.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... et {userBoards.length - 3} autre(s)
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="border-t pt-4 space-y-3">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Fermer
          </button>
          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </Modal>
  )
}
