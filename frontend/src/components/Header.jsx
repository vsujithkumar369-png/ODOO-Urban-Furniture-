import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 sm:px-6
      bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
      border-b border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Hamburger for mobile */}
      <button
        className="btn-ghost mr-2 sm:hidden"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <span className="flex flex-col gap-1">
          <span className="w-5 h-0.5 bg-current block" />
          <span className="w-5 h-0.5 bg-current block" />
          <span className="w-5 h-0.5 bg-current block" />
        </span>
      </button>

      {/* Logo text (hidden on large) */}
      <span className="text-sm font-bold text-primary-600 dark:text-primary-400 sm:hidden mr-auto">
        Urban Furniture
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle dark mode"
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{user?.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <User size={16} />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
