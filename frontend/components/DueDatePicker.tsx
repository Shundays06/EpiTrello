'use client';

import { useState, useEffect } from 'react';

interface DueDatePickerProps {
  cardId: number;
  currentUserId: number;
  dueDate?: string | null;
  dueDateCompleted?: boolean;
  onDueDateChanged: () => void;
}

const DueDatePicker: React.FC<DueDatePickerProps> = ({
  cardId,
  currentUserId,
  dueDate,
  dueDateCompleted,
  onDueDateChanged
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchroniser les valeurs avec les props quand elles changent
  useEffect(() => {
    if (dueDate && !isEditing) {
      const formatted = formatDateTime(dueDate);
      setDateValue(formatted.date);
      setTimeValue(formatted.time);
    }
  }, [dueDate, isEditing]);

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5)
    };
  };

  const handleEditStart = () => {
    if (dueDate) {
      const formatted = formatDateTime(dueDate);
      setDateValue(formatted.date);
      setTimeValue(formatted.time);
    } else {
      // Par défaut, demain à 12h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const formatted = formatDateTime(tomorrow.toISOString());
      setDateValue(formatted.date);
      setTimeValue(formatted.time);
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!dateValue) return;
    
    setLoading(true);
    try {
      const dueDateISO = new Date(`${dateValue}T${timeValue || '12:00'}`).toISOString();
      
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/due-date`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          due_date: dueDateISO,
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        onDueDateChanged();
      } else {
        console.error('Erreur API:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la date d\'échéance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/due-date`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        onDueDateChanged();
      } else {
        console.error('Erreur API:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la date d\'échéance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/cards/${cardId}/due-date/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUserId,
          completed: !dueDateCompleted  // Inverser l'état actuel
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        onDueDateChanged();
      } else {
        console.error('Erreur API:', data.message);
      }
    } catch (error) {
      console.error('Erreur lors du marquage de l\'échéance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDueDateStatus = () => {
    if (!dueDate) return null;
    if (dueDateCompleted) return 'completed';
    
    const now = new Date();
    const due = new Date(dueDate);
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) return 'overdue';
    if (hoursUntilDue <= 24) return 'due_soon';
    return 'normal';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'due_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDisplayDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Demain à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const status = getDueDateStatus();

  return (
    <div className="space-y-2">
      {dueDate && !isEditing ? (
        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm ${getStatusColor(status)}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={dueDateCompleted || false}
              onChange={handleToggleComplete}
              disabled={loading}
              className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className={dueDateCompleted ? 'line-through' : ''}>
              {formatDisplayDate(dueDate)}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={handleEditStart}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Modifier la date d'échéance"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="text-red-500 hover:text-red-700 p-1"
              title="Supprimer la date d'échéance"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure</label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={loading || !dateValue}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
            
            {dueDate && (
              <button
                onClick={handleRemove}
                disabled={loading}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={handleEditStart}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 border-dashed rounded-lg hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Ajouter une date d'échéance</span>
        </button>
      )}
      
      {loading && (
        <div className="text-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}
    </div>
  );
};

export default DueDatePicker;
