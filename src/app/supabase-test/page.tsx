'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';

export default function SupabaseTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    async function checkConnection() {
      try {
        // Simple query to check if we can connect to Supabase
        const { data, error } = await supabase.from('_tables').select('name');
        
        if (error) {
          throw error;
        }
        
        // If we get here, connection was successful
        setConnectionStatus('success');
        
        // Extract table names if available
        if (data && Array.isArray(data)) {
          setTables(data.map(table => table.name));
        }
      } catch (err: any) {
        console.error('Supabase connection error:', err);
        setConnectionStatus('error');
        setErrorMessage(err.message || 'Failed to connect to Supabase');
      }
    }

    checkConnection();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        
        {connectionStatus === 'checking' && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <p>Checking connection to Supabase...</p>
          </div>
        )}
        
        {connectionStatus === 'success' && (
          <div className="text-green-600">
            <p className="font-medium">✅ Successfully connected to Supabase!</p>
            <p className="mt-2">
              Your Supabase project URL and anon key are correctly configured.
            </p>
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <div className="text-red-600">
            <p className="font-medium">❌ Failed to connect to Supabase</p>
            {errorMessage && (
              <p className="mt-2 p-3 bg-red-50 rounded">{errorMessage}</p>
            )}
            <div className="mt-4 p-4 bg-yellow-50 rounded">
              <p className="font-medium">Troubleshooting tips:</p>
              <ul className="list-disc ml-5 mt-2">
                <li>Check that your Supabase project is up and running</li>
                <li>Verify that the URL and anon key are correct</li>
                <li>Make sure your IP is not restricted in Supabase settings</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {connectionStatus === 'success' && tables.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Available Tables</h2>
          <ul className="list-disc ml-5">
            {tables.map((table, index) => (
              <li key={index} className="mb-1">{table}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <ol className="list-decimal ml-5">
          <li className="mb-2">Create tables in your Supabase dashboard</li>
          <li className="mb-2">Use the <code>supabase</code> client to interact with your data</li>
          <li className="mb-2">Implement authentication if needed</li>
          <li className="mb-2">Set up real-time subscriptions for live updates</li>
        </ol>
      </div>
    </div>
  );
}
