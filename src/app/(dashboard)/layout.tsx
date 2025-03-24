"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 h-full overflow-y-auto transition-all duration-300 ease-in-out transform bg-white border-r border-gray-200 lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-col flex-1 w-full lg:pl-64">
        {/* Top header with mobile menu button */}
        <header className="sticky top-0 z-10 flex items-center h-16 px-6 bg-white shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="w-full px-6 py-8 mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 text-white bg-gray-900">
          <div className="px-6 mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <h3 className="mb-4 text-lg font-medium">Virtual Wardrobe</h3>
                <p className="text-sm text-gray-300">
                  Your digital clothing collection, organized and accessible anywhere.
                </p>
              </div>
              <div>
                <h3 className="mb-4 text-lg font-medium">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="/" className="transition-colors hover:text-blue-400">Home</a></li>
                  <li><a href="/wardrobe" className="transition-colors hover:text-blue-400">My Wardrobe</a></li>
                  <li><a href="/add-item" className="transition-colors hover:text-blue-400">Add Item</a></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-lg font-medium">Contact</h3>
                <p className="text-sm text-gray-300">
                  Questions or feedback? Reach out to us at support@virtualwardrobe.com
                </p>
              </div>
            </div>
            <div className="pt-6 mt-8 text-sm text-gray-400 border-t border-gray-800">
              &copy; {new Date().getFullYear()} Virtual Wardrobe. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
