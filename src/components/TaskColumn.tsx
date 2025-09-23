import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Task, Column } from '../types';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TaskColumnProps {
  column: Column;
  tasks: Task[];
  index: number;
  onAddTask: () => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({ column, tasks, index, onAddTask }) => {
  const { auth } = useAuth();
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2 w-72 flex-shrink-0">
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex items-center">
          <h3 className="font-medium text-gray-700 dark:text-gray-100">{column.title}</h3>
          <div className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {tasks.length}
          </div>
        </div>
        {auth.isAdmin && (
          <button 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
            onClick={onAddTask}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      
      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[calc(100vh-200px)] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default TaskColumn;