'use client'

import { useState } from 'react'
import Modal from './Modal'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: number
  boardName: string
  currentUserId: number
}

export default function InviteUserModal({ 
  isOpen, 
  onClose, 
  boardId, 
  boardName, 
  currentUserId 
}: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('L\'email est requis')
      return
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Format d\'email invalide')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('http://localhost:3001/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          board_id: boardId,
          invited_by: currentUserId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Invitation envoyée à ${email} avec succès !`)
        setEmail('')
        
        // Fermer le modal après 2 secondes
        setTimeout(() => {
          onClose()
          setSuccess('')
        }, 2000)
      } else {
        setError(data.message || 'Erreur lors de l\'envoi de l\'invitation')
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'invitation:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setError('')
    setSuccess('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Inviter un utilisateur`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Inviter quelqu'un à rejoindre le board "{boardName}"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-medium`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Envoi...
                </span>
              ) : (
                'Envoyer l\'invitation'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </form>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Comment ça marche ?</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• L'utilisateur recevra une invitation par email</li>
            <li>• L'invitation expire dans 7 jours</li>
            <li>• Si l'utilisateur n'a pas de compte, il en recevra un automatiquement</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
