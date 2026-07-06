import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { useApp } from "../contexts/AppContext";
import { authApi } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { LogOut, Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser, refreshWorkspaces, setWorkspace, logout } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutCurrentSession = () => {
    setIsSigningOut(true);
    logout().finally(() => {
      setIsSigningOut(false);
      toast.success("Signed out. You can now log in.");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem("collabspace_token", data.accessToken);
      
      // Init socket connection
      getSocket(data.accessToken);

      // Load workspaces and select default
      const workspacesList = await refreshWorkspaces();
      if (workspacesList.length > 0) {
        setWorkspace(workspacesList[0]);
      }

      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.user.name)}`,
        role: "admin" // temporary fallback, AppContext will adjust based on workspace
      });

      toast.success("Logged in successfully!");
      navigate("/workspace");
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = "838776437599-3cr6p8eg61mei43280rp76d99mve5oia.apps.googleusercontent.com";
    const redirectUri = "http://localhost:5000/api/auth/google/callback";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("profile email")}`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <Logo />
            <ThemeToggle />
          </div>

          {/* Already-logged-in banner */}
          {user && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">Already signed in</p>
                <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
                  Signed in as <span className="font-semibold">{user.name}</span> ({user.email})
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs border-amber-500/50 hover:bg-amber-500/10"
                  onClick={() => navigate("/workspace")}
                >
                  Go to workspace
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSigningOut}
                  className="rounded-lg text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleSignOutCurrentSession}
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <LogOut className="h-3 w-3 mr-1" />
                  )}
                  {isSigningOut ? "Signing out…" : "Sign out"}
                </Button>
              </div>
            </div>
          )}

          <Card className="rounded-2xl border-2">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR CONTINUE WITH
                </span>
              </div>

              <Button variant="outline" className="w-full rounded-xl" type="button" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-4xl font-bold">
            Collaborate with your team in real-time
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of teams using CollabSpace to work faster and smarter together.
          </p>
        </div>
      </div>
    </div>
  );
}
