import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Flag, Paperclip } from 'lucide-react';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../utils/date';

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  
  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return {
          label: 'High',
          classes: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
          iconColor: 'text-red-500 dark:text-red-300',
        };
      case 2:
        return {
          label: 'Medium',
          classes: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
          iconColor: 'text-amber-500 dark:text-amber-200',
        };
      case 3:
        return {
          label: 'Low',
          classes: 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-200 dark:border-green-500/30',
          iconColor: 'text-green-500 dark:text-green-200',
        };
      default:
        return {
          label: 'No priority',
          classes: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600',
          iconColor: 'text-gray-400 dark:text-gray-500',
        };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleTaskClick = () => {
    navigate(`/tasks/${task.id}`);
  };

  const priorityBadge = getPriorityBadge(task.priority);
  const commentsCount = task.comments?.length ?? 0;
  const attachmentsValue =
    Array.isArray(task.attachments)
      ? task.attachments.length
      : typeof task.attachments === 'number'
        ? task.attachments
        : 0;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!auth.isAuthenticated}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white dark:bg-gray-800 rounded-md p-3 mb-2 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:border-blue-400 dark:hover:border-blue-400"
          onClick={handleTaskClick}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityBadge.classes}`}
              >
                <Flag size={12} className={priorityBadge.iconColor} />
                {priorityBadge.label}
              </span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Updated {formatRelativeDate(task.updatedAt)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                {task.title}
              </div>
              {task.description && (
                <p
                  className="text-xs text-gray-600 dark:text-gray-300 leading-snug overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              {task.assignee && (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700/70 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-200 max-w-full">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                    {getInitials(task.assignee)}
                  </span>
                  <span className="truncate max-w-[120px] sm:max-w-[140px] md:max-w-[160px]">
                    {task.assignee}
                  </span>
                </span>
              )}

              <div className="ml-auto flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <Paperclip size={12} />
                  <span>{attachmentsValue}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  <span>{commentsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;