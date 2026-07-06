import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { WorkspaceDashboard } from "./pages/WorkspaceDashboard";
import { DocumentListPage } from "./pages/DocumentListPage";
import { DocumentEditorPage } from "./pages/DocumentEditorPage";
import { DesignBoardPage } from "./pages/DesignBoardPage";
import { TeamChatPage } from "./pages/TeamChatPage";
import { DirectMessagesPage } from "./pages/DirectMessagesPage";
import { ActivityFeedPage } from "./pages/ActivityFeedPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { WorkspaceSettingsPage } from "./pages/WorkspaceSettingsPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useApp } from "./contexts/AppContext";

// Wrapper for pages requiring active user session
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Wrapper for auth routes (like Login / Register) that are inaccessible when already signed in
function PublicRoute({ children, allowAuthenticated = false }: { children: React.ReactNode; allowAuthenticated?: boolean }) {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated and this route doesn't allow authenticated users, redirect to workspace
  if (user && !allowAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return <>{children}</>;
}

function DashboardRedirect() {
  return <Navigate to="/workspace" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    // allowAuthenticated=true so logged-in users can visit /login and sign out via the banner
    element: <PublicRoute allowAuthenticated><LoginPage /></PublicRoute>,
  },
  {
    path: "/register",
    element: <PublicRoute><RegisterPage /></PublicRoute>,
  },
  {
    path: "/forgot-password",
    element: <PublicRoute><ForgotPasswordPage /></PublicRoute>,
  },
  {
    path: "/reset-password",
    element: <PublicRoute><ResetPasswordPage /></PublicRoute>,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><DashboardRedirect /></ProtectedRoute>,
  },
  {
    path: "/workspace",
    element: <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>,
  },
  {
    path: "/workspace/settings",
    element: <ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>,
  },
  {
    path: "/documents",
    element: <ProtectedRoute><DocumentListPage /></ProtectedRoute>,
  },
  {
    path: "/documents/:id",
    element: <ProtectedRoute><DocumentEditorPage /></ProtectedRoute>,
  },
  {
    path: "/share/doc/:id",
    element: <DocumentEditorPage isSharedView={true} />,
  },
  {
    path: "/boards/:id",
    element: <ProtectedRoute><DesignBoardPage /></ProtectedRoute>,
  },
  {
    path: "/chat",
    element: <ProtectedRoute><TeamChatPage /></ProtectedRoute>,
  },
  {
    path: "/messages",
    element: <ProtectedRoute><DirectMessagesPage /></ProtectedRoute>,
  },
  {
    path: "/activity",
    element: <ProtectedRoute><ActivityFeedPage /></ProtectedRoute>,
  },
  {
    path: "/profile",
    element: <ProtectedRoute><UserProfilePage /></ProtectedRoute>,
  },
  {
    path: "/admin",
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
