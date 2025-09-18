'use client';

import { useState, useEffect } from 'react';

interface Column {
  id: number;
  name: string;
  position: number;
  created_at: string;
}

interface Card {
  id: number;
  title: string;
  description: string;
  column_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  column_name: string;
}

export default function Home() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    columnId: 0
  });

  // Récupérer les colonnes
  const fetchColumns = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/columns');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setColumns(data.columns);
      } else {
        setError(`Erreur API colonnes: ${data.message}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des colonnes:', err);
      setError(`Erreur de connexion aux colonnes: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Récupérer les cartes
  const fetchCards = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/cards');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setCards(data.cards);
      } else {
        setError(`Erreur API cartes: ${data.message}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des cartes:', err);
      setError(`Erreur de connexion aux cartes: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  // Créer les colonnes de base
  const createDefaultColumns = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/columns/create-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        await fetchColumns();
        setError(null); // Clear any previous error
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création des colonnes: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      console.error(err);
    }
  };

  // Créer une carte de test
  const createTestCard = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/cards/create-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setError(null); // Clear any previous error
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création de la carte de test: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      console.error(err);
    }
  };

  // Créer une carte personnalisée
  const createCustomCard = async () => {
    if (!newCard.title.trim()) {
      setError('Le titre de la carte est obligatoire');
      return;
    }

    if (newCard.columnId === 0) {
      setError('Veuillez sélectionner une colonne');
      return;
    }

    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newCard.title.trim(),
          description: newCard.description.trim(),
          column_id: newCard.columnId
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchCards();
        setNewCard({ title: '', description: '', columnId: 0 });
        setShowCreateForm(false);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`Erreur lors de la création de la carte: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      console.error(err);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchColumns(), fetchCards()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Obtenir les cartes d'une colonne
  const getCardsForColumn = (columnId: number) => {
    return cards.filter(card => card.column_id === columnId);
  };

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
            <div className="flex gap-2">
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

      {/* Formulaire de création de carte */}
      {showCreateForm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer une nouvelle carte</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newCard.title}
                  onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le titre de la carte"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colonne *
                </label>
                <select
                  value={newCard.columnId}
                  onChange={(e) => setNewCard({...newCard, columnId: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Sélectionnez une colonne</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
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
                  setNewCard({ title: '', description: '', columnId: 0 });
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
                  {getCardsForColumn(column.id).map((card) => (
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
