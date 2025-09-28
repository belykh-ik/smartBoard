import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, ArrowUp, ArrowDown, Settings } from 'lucide-react';

interface Column {
  id: string;
  title: string;
  order: number;
}

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnsUpdate: (columns: Column[]) => void;
}

const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  onClose,
  columns,
  onColumnsUpdate
}) => {
  const [editingColumns, setEditingColumns] = useState<Column[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingColumns([...columns]);
    }
  }, [isOpen, columns]);

  const handleSave = () => {
    onColumnsUpdate(editingColumns);
    onClose();
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn: Column = {
        id: `column-${Date.now()}`,
        title: newColumnTitle.trim(),
        order: editingColumns.length
      };
      setEditingColumns([...editingColumns, newColumn]);
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    if (editingColumns.length <= 1) {
      alert('Нельзя удалить последнюю колонку');
      return;
    }
    setEditingColumns(editingColumns.filter(col => col.id !== columnId));
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...editingColumns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newColumns.length) {
      [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
      // Update order
      newColumns.forEach((col, idx) => {
        col.order = idx;
      });
      setEditingColumns(newColumns);
    }
  };

  const handleEditColumn = (columnId: string) => {
    setEditingColumnId(columnId);
  };

  const handleSaveColumn = (columnId: string, newTitle: string) => {
    if (newTitle.trim()) {
      setEditingColumns(editingColumns.map(col => 
        col.id === columnId ? { ...col, title: newTitle.trim() } : col
      ));
      setEditingColumnId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h2 className="text-xl font-semibold dark:text-gray-100">Настройки доски</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium dark:text-gray-100 mb-4">Колонки задач</h3>
            
            <div className="space-y-3">
              {editingColumns.map((column, index) => (
                <div key={column.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleMoveColumn(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Переместить вверх"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => handleMoveColumn(index, 'down')}
                      disabled={index === editingColumns.length - 1}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Переместить вниз"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    {editingColumnId === column.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          defaultValue={column.title}
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveColumn(column.id, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingColumnId(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveColumn(column.id, (document.querySelector(`input[defaultValue="${column.title}"]`) as HTMLInputElement)?.value || column.title)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Сохранить"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{column.title}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditColumn(column.id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Редактировать"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(column.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isAddingColumn ? (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Название колонки"
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddColumn();
                      } else if (e.key === 'Escape') {
                        setIsAddingColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleAddColumn}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Добавить"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                    title="Отмена"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="mt-4 w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Plus size={20} className="mx-auto mb-2" />
                Добавить колонку
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium dark:text-gray-100 mb-4">Дополнительные настройки</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium dark:text-gray-100">Автоматическое перемещение задач</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Задачи без исполнителя автоматически попадают в Бэклог</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium dark:text-gray-100">Уведомления при изменении статуса</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Отправлять уведомления исполнителю при изменении статуса задачи</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium dark:text-gray-100">Разрешить изменение приоритета</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Позволить всем пользователям изменять приоритет задач</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardSettingsModal;
