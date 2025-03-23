"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const WardrobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);

const ScrapeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

interface SidebarProps {
  className?: string;
}

interface TeamProps {
  letter: string;
  name: string;
}

const teams: TeamProps[] = [
  { letter: 'H', name: 'Heroicons' },
  { letter: 'T', name: 'Tailwind Labs' },
  { letter: 'W', name: 'Workcation' },
];

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const [scrapeOpen, setScrapeOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 w-64 shadow-sm p-4 z-50 ${className}`} style={{ backgroundColor: 'white' }}>
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          </svg>
          <span className="text-lg font-semibold text-gray-900">Pieces</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Main
          </h3>
          <ul className="space-y-2">
            <li>
              <Link 
                href="/dashboard" 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <HomeIcon />
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/wardrobe" 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/wardrobe') 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <WardrobeIcon />
                My Wardrobe
              </Link>
            </li>
            <li>
              <button 
                onClick={() => setScrapeOpen(!scrapeOpen)}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.includes('/scrape') 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ScrapeIcon />
                  Scrape
                </div>
                <ChevronDownIcon />
              </button>
              
              {scrapeOpen && (
                <ul className="mt-1 pl-10 space-y-1">
                  <li>
                    <Link 
                      href="/scrape-store" 
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive('/scrape-store') 
                          ? 'text-indigo-600 font-medium' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Scrape Store
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/auto-scrape" 
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive('/auto-scrape') 
                          ? 'text-indigo-600 font-medium' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Auto Scrape
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/add-item" 
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive('/add-item') 
                          ? 'text-indigo-600 font-medium' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Scrape Product
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>

        {/* Teams Section */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Your teams
          </h3>
          <ul className="space-y-2">
            {teams.map((team) => (
              <li key={team.name}>
                <Link 
                  href={`/teams/${team.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                    {team.letter}
                  </span>
                  {team.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Link 
          href="/settings" 
          className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <SettingsIcon />
          Settings
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
