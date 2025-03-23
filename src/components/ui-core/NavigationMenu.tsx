import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface NavigationMenuProps {
  children: React.ReactNode;
  className?: string;
}

export function NavigationMenu({ children, className = '' }: NavigationMenuProps) {
  return (
    <nav className={`relative ${className}`}>
      {children}
    </nav>
  );
}

export function NavigationMenuList({ children, className = '' }: NavigationMenuProps) {
  return (
    <ul className={`flex flex-row gap-2 items-center ${className}`}>
      {children}
    </ul>
  );
}

export function NavigationMenuItem({ children, className = '' }: NavigationMenuProps) {
  return (
    <li className={`relative ${className}`}>
      {children}
    </li>
  );
}

interface NavigationMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NavigationMenuTrigger({ children, className = '', onClick }: NavigationMenuTriggerProps) {
  return (
    <button
      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${className}`}
      onClick={onClick}
    >
      {children}
      <svg 
        width="10" 
        height="10" 
        viewBox="0 0 10 10" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="ml-1"
      >
        <path d="M1 4L5 8L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

interface NavigationMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function NavigationMenuContent({ children, className = '' }: NavigationMenuContentProps) {
  return (
    <div className={`absolute top-full left-0 mt-1 w-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

interface NavigationMenuLinkProps {
  children?: React.ReactNode;
  href?: string;
  className?: string;
}

export function NavigationMenuLink({ children, href, className = '' }: NavigationMenuLinkProps) {
  if (href) {
    return (
      <Link 
        href={href} 
        className={`block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${className}`}
      >
        {children}
      </Link>
    );
  }
  
  return (
    <span className={`block px-3 py-2 text-sm ${className}`}>
      {children}
    </span>
  );
}
