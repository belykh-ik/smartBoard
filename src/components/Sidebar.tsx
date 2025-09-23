import React from 'react';
import { LayoutDashboard, Settings, User, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarItem: React.FC<{ icon: React.ReactNode; text: string; active?: boolean; onClick: () => void }> = ({ 
  icon, 
  text, 
  active = false,
  onClick
}) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-full ${active ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
    >
      <div className="text-gray-600 dark:text-gray-300">
        {icon}
      </div>
      <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">{text}</span>
    </button>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const path = location.pathname;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 w-20 fixed h-full left-0 top-0 flex flex-col items-center pt-16">
      <SidebarItem 
        icon={<LayoutDashboard size={20} />} 
        text="Дашборд" 
        active={path === '/dashboard'} 
        onClick={() => navigate('/dashboard')}
      />
      <SidebarItem 
        icon={<Users size={20} />} 
        text="Пользователи" 
        active={path === '/users'} 
        onClick={() => navigate('/users')}
      />
      <SidebarItem 
        icon={<User size={20} />} 
        text="Профиль" 
        active={path === '/profile'} 
        onClick={() => navigate('/profile')}
      />
      <SidebarItem 
        icon={<Settings size={20} />} 
        text="Настройки" 
        active={path === '/settings'} 
        onClick={() => navigate('/settings')}
      />
    </div>
  );
};

export default Sidebar;