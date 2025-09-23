import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Flag } from 'lucide-react';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleTaskClick = () => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!auth.isAuthenticated}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white dark:bg-gray-800 rounded-md p-3 mb-2 shadow-sm border-l-4 border-blue-500 cursor-pointer"
          onClick={handleTaskClick}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{task.description}</p>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-sm ${getPriorityColor(task.priority)}`}></div>
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                <MessageSquare size={12} className="mr-1" />
                <span>{task.comments?.length || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center">
              {task.assignee && (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-800 dark:text-white" title={task.assignee}>
                  {getInitials(task.assignee)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;