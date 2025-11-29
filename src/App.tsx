import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { initDb } from "@/database";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import PasswordSetup from "./pages/PasswordSetup";
import CreatePost from "./pages/CreatePost";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "480868754919-qac8r02tb9ounahcdp68ufmabtfntmvo.apps.googleusercontent.com";
  
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('🚀 App.tsx: Starting database initialization...');
        await initDb();
        console.log('✅ App.tsx: Database initialized, setting dbReady to true');
        setDbReady(true);
      } catch (err) {
        console.error('❌ App.tsx: Database initialization failed:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('❌ App.tsx: Error details:', errorMessage);
        setError(`Failed to initialize the database: ${errorMessage.includes('WASM') ? 'WebAssembly loading error. Please check browser console.' : 'Please refresh the page to try again.'}`);
      }
    };
    
    console.log('🔄 App.tsx: useEffect triggered, calling initializeDatabase');
    initializeDatabase();
  }, []);

  if (error) {
    // Render an error message with styling
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="text-red-500 text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Database Error</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    // Render a loading indicator with styling
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-t-blue-400 animate-spin mx-auto" style={{ animationDuration: '1.5s' }}></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CGU Connect Hub</h1>
          <p className="text-lg text-gray-600 mb-2">Initializing database...</p>
          <p className="text-sm text-gray-500">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  // Render the main application once the database is ready
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/password-setup" element={<PasswordSetup />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/search" element={<Search />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/:username" element={<Profile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
