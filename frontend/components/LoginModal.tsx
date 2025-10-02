'use client'

import { useState } from 'react'
import Modal from './Modal'

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (user: User) => void
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe requis')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Simuler une authentification (pour l'instant, on récupère juste l'utilisateur par email)
      const response = await fetch('http://localhost:3001/api/users')
      const data = await response.json()

      if (data.success) {
        const user = data.users.find((u: User) => u.email === email.trim())
        
        if (user) {
          // Dans un vrai système, on vérifierait le mot de passe hashé
          // Pour l'instant, on accepte n'importe quel mot de passe pour la démo
          onLogin(user)
          setEmail('')
          setPassword('')
          onClose()
        } else {
          setError('Aucun utilisateur trouvé avec cet email')
        }
      } else {
        setError('Erreur lors de la connexion')
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setError('')
    onClose()
  }

  // Comptes de démonstration
  const demoAccounts = [
    { email: 'admin@epitrello.com', username: 'admin', description: 'Administrateur' },
    { email: 'user1@epitrello.com', username: 'user1', description: 'Utilisateur 1' },
    { email: 'test@example.com', username: 'test', description: 'Utilisateur invité' },
    { email: 'newuser@example.com', username: 'newuser', description: 'Nouvel utilisateur' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Connexion à EpiTrello">
      <div className="space-y-6">
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
              placeholder="votre.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
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
                  Connexion...
                </span>
              ) : (
                'Se connecter'
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

        {/* Comptes de démonstration */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Comptes de démonstration :</h4>
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                onClick={() => {
                  setEmail(account.email)
                  setPassword('password123')
                }}
                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{account.username}</div>
                    <div className="text-xs text-gray-500">{account.email}</div>
                  </div>
                  <div className="text-xs text-blue-600">{account.description}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Cliquez sur un compte pour remplir automatiquement les champs
          </p>
        </div>
      </div>
    </Modal>
  )
}
