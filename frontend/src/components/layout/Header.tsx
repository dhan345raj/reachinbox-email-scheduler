import React from 'react';
import { Mail, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Reach<span className="text-blue-600">Inbox</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-md">
              Scheduler
            </span>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-3 border-r border-gray-200 pr-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  {user.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 leading-tight truncate max-w-[180px]">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
