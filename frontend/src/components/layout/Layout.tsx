import React from 'react';
import Header from './Header';

export interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500 bg-white">
        ReachInbox Email Scheduler &copy; {new Date().getFullYear()} — Built with React, Tailwind &amp; BullMQ
      </footer>
    </div>
  );
};

export default Layout;
