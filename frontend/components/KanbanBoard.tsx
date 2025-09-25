import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface User {
  id: number;
  username: string;
}

interface KanbanBoardProps {
  columns: Column[];
  cards: Card[];
  users: User[];
  onCardMove: (cardId: number, newColumnId: number, newPosition: number) => void;
  onCardClick?: (card: Card) => void;
}

// Composant pour une carte draggable
function DraggableCard({ card, users, onCardClick }: { 
  card: Card; 
  users: User[]; 
  onCardClick?: (card: Card) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignedUser = users.find(u => u.id === card.assigned_user_id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDragging && onCardClick) {
      onCardClick(card);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {card.title}
        </h4>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {card.description}
      </p>
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400">
          {new Date(card.created_at).toLocaleDateString('fr-FR')}
        </span>
        {assignedUser && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
            {assignedUser.username}
          </span>
        )}
      </div>
    </div>
  );
}

// Composant pour une colonne droppable
function DroppableColumn({ 
  column, 
  cards, 
  users,
  onCardClick
}: { 
  column: Column; 
  cards: Card[]; 
  users: User[];
  onCardClick?: (card: Card) => void;
}) {
  const columnCards = cards.filter(card => card.column_id === column.id);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-gray-50 rounded-lg p-4 min-w-[300px] max-w-[300px] border-2 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">
          {column.name}
        </h3>
        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
          {columnCards.length}
        </span>
      </div>
      <SortableContext items={columnCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
        <div className={`space-y-3 min-h-[200px] transition-all ${isOver ? 'bg-blue-25 rounded-lg p-2' : ''}`}>
          {columnCards.map((card) => (
            <DraggableCard key={card.id} card={card} users={users} onCardClick={onCardClick} />
          ))}
          {columnCards.length === 0 && (
            <div className={`text-gray-500 text-sm italic py-12 text-center border-2 border-dashed rounded-lg transition-all ${
              isOver 
                ? 'border-blue-400 bg-blue-100 text-blue-600' 
                : 'border-gray-300 bg-gray-25'
            }`}>
              <div className="flex flex-col items-center">
                <svg className={`h-8 w-8 mb-2 ${isOver ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isOver ? 'Déposez la carte ici' : 'Glissez une carte ici'}
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Composant principal KanbanBoard
export default function KanbanBoard({ columns, cards, users, onCardMove, onCardClick }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = React.useState<Card | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    if (!activeCard) return;

    // Vérifier si on survole une colonne directement
    if (over.id.toString().startsWith('column-')) {
      const columnId = parseInt(over.id.toString().replace('column-', ''));
      if (columnId !== activeCard.column_id) {
        // Déplacer vers une nouvelle colonne vide
        onCardMove(activeCard.id, columnId, 0);
      }
      return;
    }

    // Si on drag sur une autre carte, on trouve la colonne de cette carte
    const overCard = cards.find(c => c.id === over.id);
    if (overCard && overCard.column_id !== activeCard.column_id) {
      // Déplacer vers une nouvelle colonne
      onCardMove(activeCard.id, overCard.column_id, 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    if (!activeCard) return;

    // Vérifier si on a droppé sur une colonne directement
    if (over.id.toString().startsWith('column-')) {
      const columnId = parseInt(over.id.toString().replace('column-', ''));
      if (columnId !== activeCard.column_id) {
        // Déplacer vers une colonne (potentiellement vide)
        onCardMove(activeCard.id, columnId, 0);
      }
      return;
    }

    // Gestion du drop sur une autre carte
    const overCard = cards.find(c => c.id === over.id);
    if (overCard && activeCard.id !== overCard.id) {
      const activeIndex = cards.findIndex(c => c.id === activeCard.id);
      const overIndex = cards.findIndex(c => c.id === overCard.id);
      
      if (activeCard.column_id === overCard.column_id) {
        // Réorganiser dans la même colonne
        const newPosition = overIndex;
        onCardMove(activeCard.id, activeCard.column_id, newPosition);
      } else {
        // Déplacer vers une nouvelle colonne à la position de la carte survolée
        onCardMove(activeCard.id, overCard.column_id, overIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            cards={cards}
            users={users}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="bg-white rounded-lg shadow-lg p-3 border rotate-3 opacity-90">
            <h4 className="font-medium text-gray-900 mb-2">
              {activeCard.title}
            </h4>
            <p className="text-sm text-gray-600">
              {activeCard.description}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
