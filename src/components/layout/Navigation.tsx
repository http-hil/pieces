'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleToggleMenu();
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
      <div className="container-slamjam">
        <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="font-bold text-xl uppercase tracking-widest"
              tabIndex={0}
              aria-label="Go to homepage"
            >
              Virtual Wardrobe
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/"
              className={`text-sm uppercase tracking-wide hover:text-slamjam-accent transition-colors ${
                isActive('/') ? 'text-slamjam-accent' : ''
              }`}
              tabIndex={0}
              aria-label="Go to homepage"
            >
              Home
            </Link>
            <Link 
              href="/wardrobe"
              className={`text-sm uppercase tracking-wide hover:text-slamjam-accent transition-colors ${
                isActive('/wardrobe') ? 'text-slamjam-accent' : ''
              }`}
              tabIndex={0}
              aria-label="View your wardrobe"
            >
              My Wardrobe
            </Link>
            <Link 
              href="/add-item"
              className={`text-sm uppercase tracking-wide hover:text-slamjam-accent transition-colors ${
                isActive('/add-item') ? 'text-slamjam-accent' : ''
              }`}
              tabIndex={0}
              aria-label="Add a new item"
            >
              Add Item
            </Link>
            <Link 
              href="/server-wardrobe"
              className={`text-sm uppercase tracking-wide hover:text-slamjam-accent transition-colors ${
                isActive('/server-wardrobe') ? 'text-slamjam-accent' : ''
              }`}
              tabIndex={0}
              aria-label="View server wardrobe"
            >
              Server Wardrobe
            </Link>
          </div>
          
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden p-2 text-slamjam-text"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={handleToggleMenu}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white">
          <div className="px-4 pt-2 pb-4 space-y-1 border-t border-slamjam-border">
            <Link
              href="/"
              className={`block py-3 text-sm uppercase tracking-wide ${
                isActive('/') ? 'text-slamjam-accent' : 'text-slamjam-text'
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={0}
              aria-label="Go to homepage"
            >
              Home
            </Link>
            <Link
              href="/wardrobe"
              className={`block py-3 text-sm uppercase tracking-wide ${
                isActive('/wardrobe') ? 'text-slamjam-accent' : 'text-slamjam-text'
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={0}
              aria-label="View your wardrobe"
            >
              My Wardrobe
            </Link>
            <Link
              href="/add-item"
              className={`block py-3 text-sm uppercase tracking-wide ${
                isActive('/add-item') ? 'text-slamjam-accent' : 'text-slamjam-text'
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={0}
              aria-label="Add a new item"
            >
              Add Item
            </Link>
            <Link
              href="/server-wardrobe"
              className={`block py-3 text-sm uppercase tracking-wide ${
                isActive('/server-wardrobe') ? 'text-slamjam-accent' : 'text-slamjam-text'
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={0}
              aria-label="View server wardrobe"
            >
              Server Wardrobe
            </Link>
            <Link
              href="/debug-db"
              className={`block py-3 text-sm uppercase tracking-wide ${
                isActive('/debug-db') ? 'text-slamjam-accent' : 'text-slamjam-text'
              }`}
              onClick={() => setIsMenuOpen(false)}
              tabIndex={0}
              aria-label="Debug database"
            >
              Debug DB
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
