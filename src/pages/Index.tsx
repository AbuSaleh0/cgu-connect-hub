import { useState } from "react";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import LoginOverlay from "@/components/LoginOverlay";
import AuthPage from "@/components/AuthPage";
import samplePost1 from "@/assets/sample-post-1.jpg";
import samplePost2 from "@/assets/sample-post-2.jpg";
import samplePost3 from "@/assets/sample-post-3.jpg";

// Mock data for demonstration
const mockPosts = [
  {
    id: "1",
    username: "rahul_sharma",
    userAvatar: "",
    image: samplePost1,
    caption: "Beautiful day at CGU campus! 🌟 #CGULife #CampusVibes",
    likes: 234,
    comments: 18,
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    username: "priya_patel",
    userAvatar: "",
    image: samplePost2,
    caption: "Study group sessions hitting different 📚✨ Grateful for these amazing people!",
    likes: 189,
    comments: 12,
    timestamp: "5 hours ago",
  },
  {
    id: "3",
    username: "amit_kumar",
    userAvatar: "",
    image: samplePost3,
    caption: "Our campus is a work of art 🏛️ #CGUArchitecture #ProudToBeHere",
    likes: 312,
    comments: 24,
    timestamp: "8 hours ago",
  },
];

const Index = () => {
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [authView, setAuthView] = useState<"feed" | "login" | "signup">("feed");

  const handleInteractionClick = () => {
    setShowLoginOverlay(true);
  };

  const handleLoginClick = () => {
    setShowLoginOverlay(false);
    setAuthView("login");
  };

  const handleSignUpClick = () => {
    setShowLoginOverlay(false);
    setAuthView("signup");
  };

  const handleBackToFeed = () => {
    setAuthView("feed");
  };

  if (authView === "login") {
    return (
      <AuthPage
        mode="login"
        onBack={handleBackToFeed}
        onSwitchMode={() => setAuthView("signup")}
      />
    );
  }

  if (authView === "signup") {
    return (
      <AuthPage
        mode="signup"
        onBack={handleBackToFeed}
        onSwitchMode={() => setAuthView("login")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleLoginClick} onSignUpClick={handleSignUpClick} />

      <main className="container max-w-2xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {mockPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onInteractionClick={handleInteractionClick}
            />
          ))}
        </div>
      </main>

      {showLoginOverlay && (
        <LoginOverlay
          onClose={() => setShowLoginOverlay(false)}
          onLogin={handleLoginClick}
          onSignUp={handleSignUpClick}
        />
      )}
    </div>
  );
};

export default Index;
