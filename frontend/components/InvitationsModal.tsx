'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'

interface Invitation {
  id: number
  email: string
  board_id: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token: string
  expires_at: string
  created_at: string
  board_name: string
  invited_by_username: string
}

interface InvitationsModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
}

export default function InvitationsModal({ isOpen, onClose, userEmail }: InvitationsModalProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [processingToken, setProcessingToken] = useState<string | null>(null)

  const fetchInvitations = async () => {
    if (!userEmail) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`http://localhost:3001/api/invitations?email=${encodeURIComponent(userEmail)}`)
      const data = await response.json()

      if (data.success) {
        setInvitations(data.invitations)
      } else {
        setError(data.message || 'Erreur lors de la récupération des invitations')
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des invitations:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchInvitations()
    }
  }, [isOpen, userEmail])

  const handleAcceptInvitation = async (token: string) => {
    setProcessingToken(token)
    setError('')

    try {
      const response = await fetch(`http://localhost:3001/api/invitations/${token}/accept`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        // Recharger les invitations pour voir le changement de statut
        await fetchInvitations()
      } else {
        setError(data.message || 'Erreur lors de l\'acceptation de l\'invitation')
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setProcessingToken(null)
    }
  }

  const handleDeclineInvitation = async (token: string) => {
    setProcessingToken(token)
    setError('')

    try {
      const response = await fetch(`http://localhost:3001/api/invitations/${token}/decline`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        // Recharger les invitations pour voir le changement de statut
        await fetchInvitations()
      } else {
        setError(data.message || 'Erreur lors du refus de l\'invitation')
      }
    } catch (error) {
      console.error('Erreur lors du refus:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setProcessingToken(null)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invitations reçues - ${userEmail}`}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2">Chargement des invitations...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
                <p>Aucune invitation reçue</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          Board: {invitation.board_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Invité par: {invitation.invited_by_username}
                        </p>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      <p>Invité le: {formatDate(invitation.created_at)}</p>
                      <p>Expire le: {formatDate(invitation.expires_at)}</p>
                      {isExpired(invitation.expires_at) && (
                        <p className="text-red-500 font-medium">⚠️ Cette invitation a expiré</p>
                      )}
                    </div>

                    {invitation.status === 'pending' && !isExpired(invitation.expires_at) && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptInvitation(invitation.token)}
                          disabled={processingToken === invitation.token}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {processingToken === invitation.token ? 'Traitement...' : 'Accepter'}
                        </button>
                        <button
                          onClick={() => handleDeclineInvitation(invitation.token)}
                          disabled={processingToken === invitation.token}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {processingToken === invitation.token ? 'Traitement...' : 'Refuser'}
                        </button>
                      </div>
                    )}

                    {invitation.status === 'accepted' && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
                        ✅ Invitation acceptée - Vous avez maintenant accès à ce board
                      </div>
                    )}

                    {invitation.status === 'declined' && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                        ❌ Invitation refusée
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="border-t pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  )
}
