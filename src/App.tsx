import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import PasswordSetup from "./pages/PasswordSetup";
import CreatePost from "./pages/CreatePost";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

import { supabase } from "@/lib/supabase";
import { dbService } from "@/database/service";
import { sessionManager } from "@/lib/session";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleLogin(session);
    });

    // Listen for the redirect back from Google
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleLogin(session);
      } else if (event === 'SIGNED_OUT') {
        sessionManager.logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (session: any) => {
    console.log("App: Handling login with session:", session);
    try {
      // Sync user to DB and update local session
      console.log("App: Syncing user...");
      const { user, isNew } = await dbService.syncUserWithSupabase();
      console.log("App: Sync result:", user);

      if (user) {
        console.log("App: Login successful, updating session manager");
        sessionManager.login(user);

        // Check if user needs to setup password (OAuth users)
        if (!user.password || user.password_setup_complete === false) {
          console.log("App: User needs to setup password, redirecting...");
          window.location.href = '/password-setup';
          return;
        }









        // Remove the ugly hash from URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        console.error("App: Sync returned null user");
      }
    } catch (error) {
      console.error("Login sync failed:", error);
      // If sync fails, sign out to prevent stuck state
      await supabase.auth.signOut();
      sessionManager.logout();
      alert("Login failed. Please try again.");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/password-setup" element={<PasswordSetup />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/:username" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;