import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Home,
  FileText,
  Palette,
  MessageSquare,
  Activity,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  Plus,
  Search,
  Menu,
  Rocket,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { cn } from "./ui/utils";
import { workspaceApi } from "../../lib/api";
import { toast } from "sonner";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { user, workspace, workspaces, setWorkspace, refreshWorkspaces, logout } = useApp();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Create Workspace modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [slugConflict, setSlugConflict] = useState(false);

  const wsSlug = wsName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const handleCreateWorkspace = async () => {
    if (!wsName.trim() || !wsSlug) return;
    setIsCreating(true);
    setSlugConflict(false);
    try {
      const res = await workspaceApi.create({
        name: wsName.trim(),
        slug: wsSlug,
        description: wsDescription.trim(),
      });
      const rawWs = res.workspace;
      const loadedList = await refreshWorkspaces();
      const created =
        loadedList.find((w) => w.id === rawWs._id) || {
          id: rawWs._id,
          name: rawWs.name,
          slug: rawWs.slug,
          description: rawWs.description,
          icon: rawWs.logo || "🚀",
          ownerId: rawWs.ownerId,
          members: rawWs.members,
        };
      setWorkspace(created);
      toast.success(`Workspace "${rawWs.name}" created!`);
      setShowCreateModal(false);
      setWsName("");
      setWsDescription("");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("slug")) {
        setSlugConflict(true);
      } else {
        toast.error(err.message || "Failed to create workspace");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/workspace" },
    { icon: FileText, label: "Documents", path: "/documents" },
    { icon: Palette, label: "Boards", path: "/boards/1" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: Activity, label: "Activity", path: "/activity" },
  ];

  return (
    <div className="h-screen flex bg-background">
      {/* ── Create Workspace Modal ─────────────────────────────────────── */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreateModal(false);
            setWsName("");
            setWsDescription("");
            setSlugConflict(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Create a new workspace
            </DialogTitle>
            <DialogDescription>
              A workspace is where your team collaborates on documents, boards, and conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="layout-ws-name">Workspace Name *</Label>
              <Input
                id="layout-ws-name"
                placeholder="e.g. Product Team, Design Studio…"
                value={wsName}
                onChange={(e) => {
                  setWsName(e.target.value);
                  setSlugConflict(false);
                }}
                className="rounded-xl"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              />
              {wsSlug && (
                <p className={`text-xs ${slugConflict ? "text-destructive" : "text-muted-foreground"}`}>
                  URL identifier:{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{wsSlug}</code>
                  {slugConflict && " — already taken, try a different name"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="layout-ws-desc">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="layout-ws-desc"
                placeholder="What does this workspace do?"
                value={wsDescription}
                onChange={(e) => setWsDescription(e.target.value)}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={handleCreateWorkspace}
                disabled={!wsName.trim() || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isCreating ? "Creating…" : "Create Workspace"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "border-r bg-sidebar flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          {!sidebarCollapsed && <Logo size="sm" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Workspace Switcher */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between rounded-xl">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg">{workspace?.icon || "🚀"}</span>
                    <span className="truncate">
                      {workspace?.name || "Select workspace"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-xl" align="start">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wide">
                  Your Workspaces
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {workspaces.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                    No workspaces yet
                  </div>
                ) : (
                  workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => setWorkspace(ws)}
                      className="cursor-pointer rounded-lg mx-1 gap-2"
                    >
                      <span className="text-base">{ws.icon || "🚀"}</span>
                      <span className="flex-1 truncate">{ws.name}</span>
                      {ws.id === workspace?.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg mx-1 gap-2 text-primary focus:text-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create new workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Collapsed state: workspace icon */}
        {sidebarCollapsed && workspace && (
          <div className="p-2 flex justify-center">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              title={workspace.name}
              onClick={() => setSidebarCollapsed(false)}
            >
              <span className="text-lg">{workspace?.icon || "🚀"}</span>
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full rounded-xl",
                  sidebarCollapsed ? "justify-center px-2" : "justify-start"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t space-y-1">
          {/* Quick create workspace button (always visible) */}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              className="w-full rounded-xl justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-5 w-5 shrink-0" />
              <span className="ml-3">New Workspace</span>
            </Button>
          )}
          <Link to="/workspace/settings">
            <Button
              variant="ghost"
              className={cn(
                "w-full rounded-xl",
                sidebarCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Settings</span>}
            </Button>
          </Link>
          {/* Logout button always visible in sidebar */}
          <Button
            variant="ghost"
            disabled={isLoggingOut}
            className={cn(
              "w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10",
              sidebarCollapsed ? "justify-center px-2" : "justify-start"
            )}
            onClick={() => {
              setIsLoggingOut(true);
              logout().finally(() => {
                setIsLoggingOut(false);
                navigate("/login");
              });
            }}
          >
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            {!sidebarCollapsed && (
              <span className="ml-3">{isLoggingOut ? "Signing out…" : "Log out"}</span>
            )}
          </Button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents, boards, messages..."
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Users className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-xl gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <div>
                    <p>{user?.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer"
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/workspace/settings")}
                  className="cursor-pointer"
                >
                  Settings
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    className="cursor-pointer"
                  >
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isLoggingOut}
                  onClick={() => {
                    setIsLoggingOut(true);
                    logout().finally(() => {
                      setIsLoggingOut(false);
                      navigate("/login");
                    });
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  {isLoggingOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {isLoggingOut ? "Signing out…" : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
