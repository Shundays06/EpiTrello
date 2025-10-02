'use client';

import { useState } from 'react';
import Modal from './Modal';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onRegisterClick?: () => void;
}

export default function LoginModal({ isOpen, onClose, onLogin, onRegisterClick }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe requis');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Essayer de se connecter avec l'email/mot de passe
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        onLogin(data.user);
        onClose();
        setEmail('');
        setPassword('');
      } else {
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: { email: string; password: string }) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    
    // Simuler la connexion avec l'utilisateur de démo
    setTimeout(() => {
      handleSubmit(new Event('submit') as any);
    }, 100);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Connexion">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="votre@email.com"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>

        {/* Lien vers l'inscription */}
        {onRegisterClick && (
          <div className="text-center">
            <button
              type="button"
              onClick={onRegisterClick}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Pas encore de compte ? S'inscrire
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 mb-4">Ou connectez-vous avec un compte de démo :</p>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin({ email: 'admin@epitrello.com', password: 'admin123' })}
              disabled={isLoading}
              className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin({ email: 'manager@epitrello.com', password: 'manager123' })}
              disabled={isLoading}
              className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              📊 Manager
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin({ email: 'member@epitrello.com', password: 'member123' })}
              disabled={isLoading}
              className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              👤 Membre
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin({ email: 'viewer@epitrello.com', password: 'viewer123' })}
              disabled={isLoading}
              className="px-3 py-2 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              👁️ Lecteur
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
