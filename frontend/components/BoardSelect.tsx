import React from 'react';
import Select from 'react-select';

interface Board {
  id: number;
  name: string;
  organization_name?: string;
  user_role?: string;
  organization_role?: string;
}

interface BoardSelectProps {
  boards: Board[];
  selectedBoardId: number | null;
  onBoardChange: (boardId: number) => void;
}

const BoardSelect: React.FC<BoardSelectProps> = ({
  boards,
  selectedBoardId,
  onBoardChange
}) => {
  const boardOptions = boards.map(board => ({
    value: board.id,
    label: board.name,
    board: board
  }));

  const selectedOption = boardOptions.find(option => option.value === selectedBoardId) || null;

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#FB923C' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(251, 146, 60, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#FB923C'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#FB923C' : state.isFocused ? '#FED7AA' : 'white',
      color: state.isSelected ? 'white' : '#374151',
      '&:hover': {
        backgroundColor: state.isSelected ? '#FB923C' : '#FED7AA'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#374151',
      fontWeight: '500'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9CA3AF'
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999
    })
  };

  return (
    <Select
      options={boardOptions}
      value={selectedOption}
      onChange={(selectedOption) => {
        if (selectedOption) {
          onBoardChange(selectedOption.value);
        }
      }}
      placeholder={boards.length === 0 ? "Aucun board disponible" : "Sélectionnez un board"}
      styles={customStyles}
      isClearable={false}
      isSearchable={boards.length > 3}
      isDisabled={boards.length === 0}
      noOptionsMessage={() => "Aucun board trouvé"}
      className="min-w-[200px]"
      formatOptionLabel={(option: any) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${option.board.organization_name ? 'bg-teal-400' : 'bg-orange-400'}`}></div>
            <div>
              <span className="font-medium">{option.label}</span>
              {option.board.organization_name && (
                <div className="text-xs text-gray-500 mt-0.5">
                  📁 {option.board.organization_name}
                </div>
              )}
            </div>
          </div>
          {option.board.user_role === 'owner' && (
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Propriétaire
            </div>
          )}
        </div>
      )}
    />
  );
};

export default BoardSelect;
