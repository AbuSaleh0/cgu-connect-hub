import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";

import CreatePost from "./pages/CreatePost";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Confessions from "./pages/Confessions";
import MyConfessions from "./pages/MyConfessions";
import SavedPosts from "./pages/SavedPosts";
import NotFound from "./pages/NotFound";
import ChangePassword from "./pages/ChangePassword";

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
      } else if (event === 'PASSWORD_RECOVERY') {
        // Handle password recovery flow
        window.location.href = '/change-password?reason=recovery';
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
        // Security Check: Enforce Domain Restriction
        const email = user.email || '';
        const isAllowedDomain = email.endsWith('@cgu-odisha.ac.in');
        const isAdmin = user.is_admin;

        if (!isAllowedDomain && !isAdmin) {
          console.error("Access Denied: Unauthorized email domain.");
          await supabase.auth.signOut();
          sessionManager.logout();
          alert("Access Restricted: Only cgu-odisha.ac.in emails are allowed.");
          return;
        }

        console.log("App: Login successful, updating session manager");
        sessionManager.login(user);

        // Check if user needs to set up profile
        if (!user.profile_setup_complete) {
          console.log("App: User needs profile setup, redirecting...");
          if (window.location.pathname !== '/profile-setup') {
            window.location.href = '/profile-setup';
          }
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
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/confessions" element={<Confessions />} />
            <Route path="/my-confessions" element={<MyConfessions />} />
            <Route path="/saved" element={<SavedPosts />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/:username" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;