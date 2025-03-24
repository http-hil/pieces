import React from 'react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Public header could go here */}
      <main>
        {children}
      </main>
      {/* Public footer could go here */}
    </div>
  );
}
