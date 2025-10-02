'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Label {
  id: number;
  name: string;
  color: string;
  board_id: number;
}

interface CardLabel extends Label {
  added_at: string;
  added_by: number;
}

interface Color {
  name: string;
  value: string;
  hex: string;
}

interface LabelSelectorProps {
  cardId: number;
  boardId: number;
  currentUserId: number;
  onLabelsChanged: () => void;
}

const LabelSelector: React.FC<LabelSelectorProps> = ({
  cardId,
  boardId,
  currentUserId,
  onLabelsChanged
}) => {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [cardLabels, setCardLabels] = useState<CardLabel[]>([]);
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableLabels();
      loadCardLabels();
      loadAvailableColors();
      updateMenuPosition();
    }
  }, [isOpen, boardId, cardId]);

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const loadAvailableLabels = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/boards/${boardId}/labels`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableLabels(data.labels);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des labels:', error);
    }
  };

  const loadCardLabels = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/labels`);
      const data = await response.json();
      
      if (data.success) {
        setCardLabels(data.labels);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des labels de la carte:', error);
    }
  };

  const loadAvailableColors = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/labels/colors');
      const data = await response.json();
      
      if (data.success) {
        setAvailableColors(data.colors);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des couleurs:', error);
    }
  };

  const handleToggleLabel = async (label: Label) => {
    const isAssigned = cardLabels.some(cl => cl.id === label.id);
    setLoading(true);

    try {
      if (isAssigned) {
        // Retirer le label
        const response = await fetch(`http://localhost:3001/api/cards/${cardId}/labels/${label.id}`, {
          method: 'DELETE',
        });
        
        const data = await response.json();
        if (data.success) {
          loadCardLabels();
          onLabelsChanged();
        }
      } else {
        // Ajouter le label
        const response = await fetch(`http://localhost:3001/api/cards/${cardId}/labels/${label.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            added_by: currentUserId
          }),
        });
        
        const data = await response.json();
        if (data.success) {
          loadCardLabels();
          onLabelsChanged();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la modification du label:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorStyle = (colorValue: string) => {
    const color = availableColors.find(c => c.value === colorValue);
    return {
      backgroundColor: color?.hex || '#6b7280',
    };
  };

  const getTextColorClass = (colorValue: string) => {
    const lightColors = ['yellow', 'pink', 'orange'];
    return lightColors.includes(colorValue) ? 'text-gray-800' : 'text-white';
  };

  return (
    <div className="relative">
      {/* Labels actuels de la carte */}
      <div className="flex flex-wrap gap-1 mb-2">
        {cardLabels.map((label) => (
          <span
            key={label.id}
            className={`px-2 py-1 rounded-full text-xs font-medium ${getTextColorClass(label.color)}`}
            style={getColorStyle(label.color)}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Bouton pour ouvrir le sélecteur */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-left text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>🏷️</span>
            <span>Choisir des labels</span>
          </span>
          <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Menu déroulant des labels avec portal */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          {/* Overlay pour fermer le menu */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width
            }}
          >
            <div className="p-3">
              <h4 className="font-medium text-gray-900 mb-3">Sélectionner des labels</h4>
              
              {loading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableLabels.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Aucun label disponible
                  </p>
                ) : (
                  availableLabels.map((label) => {
                    const isAssigned = cardLabels.some(cl => cl.id === label.id);
                    return (
                      <div
                        key={label.id}
                        onClick={() => handleToggleLabel(label)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          isAssigned ? 'bg-blue-50' : ''
                        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getTextColorClass(label.color)}`}
                            style={getColorStyle(label.color)}
                          >
                            {label.name}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {isAssigned && (
                            <span className="text-blue-600 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t pt-3 mt-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default LabelSelector;
