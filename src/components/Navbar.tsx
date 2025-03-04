import React from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 fixed w-full z-50">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-8 w-8 mr-3 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">
            SB
          </div>
          <span className="text-xl font-semibold">SmartBoard</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            className="relative p-1 rounded-full hover:bg-gray-100"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              2
            </span>
          </button>
          <button 
            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
            onClick={() => navigate('/profile')}
          >
            <User size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
            title="Выйти"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;