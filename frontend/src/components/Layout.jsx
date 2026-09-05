import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const SIDEBAR_W = 'w-60';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* === DESKTOP SIDEBAR === */}
      <aside className={`hidden sm:flex flex-col flex-shrink-0 ${SIDEBAR_W} border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden`}>
        <Sidebar />
      </aside>

      {/* === MOBILE SIDEBAR OVERLAY === */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className={`relative flex flex-col ${SIDEBAR_W} h-full bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-800 animate-slide-in`}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* === MAIN AREA === */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
