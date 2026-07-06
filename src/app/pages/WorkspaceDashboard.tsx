import { useState, useEffect } from "react";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  FileText,
  Palette,
  Plus,
  Clock,
  TrendingUp,
  MessageSquare,
  Rocket,
  Loader2,
  Sparkles,
  Users,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../contexts/AppContext";
import { documentApi, boardApi, workspaceApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

// ─── Create Workspace Modal ────────────────────────────────────────────────────
function CreateWorkspaceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ws: any) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [slugConflict, setSlugConflict] = useState(false);

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const handleCreate = async () => {
    if (!name.trim() || !slug) return;
    setIsCreating(true);
    setSlugConflict(false);
    try {
      const res = await workspaceApi.create({ name: name.trim(), slug, description: description.trim() });
      toast.success(`Workspace "${name}" created!`);
      onCreated(res.workspace);
      setName("");
      setDescription("");
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
            <Label htmlFor="ws-name">Workspace Name *</Label>
            <Input
              id="ws-name"
              placeholder="e.g. Product Team, Design Studio…"
              value={name}
              onChange={(e) => { setName(e.target.value); setSlugConflict(false); }}
              className="rounded-xl"
              autoFocus
            />
            {slug && (
              <p className={`text-xs ${slugConflict ? "text-destructive" : "text-muted-foreground"}`}>
                URL: <code className="bg-muted px-1 py-0.5 rounded">{slug}</code>
                {slugConflict && " — this URL is already taken, try a different name"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="ws-desc"
              placeholder="What does this workspace do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl gap-2"
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
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
  );
}

// ─── No Workspace Onboarding Screen ───────────────────────────────────────────
function NoWorkspaceScreen({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <WorkspaceLayout>
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-20">
        <div className="max-w-lg w-full text-center">
          {/* Illustration */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Rocket className="h-16 w-16 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-yellow-400/90 flex items-center justify-center shadow-lg">
                <Sparkles className="h-4 w-4 text-yellow-900" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Welcome to CollabSpace!</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            You don't have a workspace yet. Create one to start collaborating with your team on documents, boards, and more.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: FileText, label: "Documents", desc: "Create & co-edit in real time" },
              { icon: Palette, label: "Boards", desc: "Visual design & brainstorming" },
              { icon: MessageSquare, label: "Chat", desc: "Team communication hub" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl border bg-card p-4 text-left hover:border-primary/50 transition-colors">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full rounded-xl gap-2 text-base h-12"
            onClick={onCreateClick}
          >
            <Plus className="h-5 w-5" />
            Create Your First Workspace
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Or ask a team admin to invite you to an existing workspace.
          </p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function WorkspaceDashboard() {
  const { user, workspace, refreshWorkspaces, setWorkspace } = useApp();
  const [documents, setDocuments] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalDocs: 0,
    activeBoards: 0,
    teamMembers: 0,
    messagesCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Load dashboard data whenever workspace changes ─────────────────────────
  useEffect(() => {
    if (!workspace?.id) {
      // No workspace: stop loading immediately
      setIsLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [docsData, boardsData, activityData] = await Promise.all([
          documentApi.list(workspace.id),
          boardApi.list(workspace.id),
          workspaceApi.getActivityFeed(workspace.id).catch(() => [])
        ]);

        setDocuments(docsData);
        setBoards(boardsData);
        setActivities(activityData);

        setStats({
          totalDocs: docsData.length,
          activeBoards: boardsData.length,
          teamMembers: workspace.members?.length || 1,
          messagesCount: 0
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [workspace?.id]);

  // ── Real-time presence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!workspace?.id) return;

    const socket = getSocket();
    socketHelpers.joinChat(workspace.id);
    socketHelpers.emitPresenceHeartbeat(workspace.id);

    const interval = setInterval(() => {
      socketHelpers.emitPresenceHeartbeat(workspace.id);
    }, 10000);

    const handlePresenceUpdate = (activeMembers: any[]) => {
      setOnlineUserIds(activeMembers.map((m) => m.userId));
    };

    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      clearInterval(interval);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [workspace?.id]);

  // ── Handle new workspace created from modal ────────────────────────────────
  const handleWorkspaceCreated = async (rawWs: any) => {
    setShowCreateModal(false);
    const loadedList = await refreshWorkspaces();
    const created = loadedList.find((w) => w.id === rawWs._id) || {
      id: rawWs._id,
      name: rawWs.name,
      slug: rawWs.slug,
      description: rawWs.description,
      icon: rawWs.logo || "🚀",
      ownerId: rawWs.ownerId,
      members: rawWs.members,
    };
    setWorkspace(created);
  };

  const teamMembers = workspace?.members?.map((m: any) => {
    const memberUser = m.userId || {};
    const userIdStr = memberUser._id || memberUser.id || "";
    const isOnline = onlineUserIds.includes(userIdStr) || userIdStr === user?.id;
    return {
      id: userIdStr,
      name: memberUser.name || "Workspace Member",
      avatar: memberUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberUser.name || "Member")}`,
      role: m.role || "Viewer",
      online: isOnline,
    };
  }) || [];

  // ── No workspace state ─────────────────────────────────────────────────────
  if (!workspace) {
    return (
      <>
        <NoWorkspaceScreen onCreateClick={() => setShowCreateModal(true)} />
        <CreateWorkspaceModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleWorkspaceCreated}
        />
      </>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user?.name} 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening in <span className="font-medium text-foreground">{workspace.name}</span> today
            </p>
          </div>
          <Button
            className="rounded-xl gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        <CreateWorkspaceModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleWorkspaceCreated}
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p>Loading workspace data…</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardDescription>Total Documents</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalDocs}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Active workspace content</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardDescription>Active Boards</CardDescription>
                  <CardTitle className="text-3xl">{stats.activeBoards}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Visual design files</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardDescription>Team Members</CardDescription>
                  <CardTitle className="text-3xl">{stats.teamMembers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{teamMembers.filter(m => m.online).length} online now</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardDescription>Workspace</CardDescription>
                  <CardTitle className="text-xl truncate">{workspace.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{workspace.members?.length || 1} members</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions + Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Link to="/documents">
                    <Button variant="outline" className="w-full h-20 rounded-xl flex-col gap-2 cursor-pointer">
                      <FileText className="h-6 w-6" />
                      <span>Documents</span>
                    </Button>
                  </Link>
                  <Link to="/chat">
                    <Button variant="outline" className="w-full h-20 rounded-xl flex-col gap-2 cursor-pointer">
                      <MessageSquare className="h-6 w-6" />
                      <span>Team Chat</span>
                    </Button>
                  </Link>
                  <Link to="/boards/1">
                    <Button variant="outline" className="w-full h-20 rounded-xl flex-col gap-2 cursor-pointer">
                      <Palette className="h-6 w-6" />
                      <span>Design Boards</span>
                    </Button>
                  </Link>
                  <Link to="/workspace/settings">
                    <Button variant="outline" className="w-full h-20 rounded-xl flex-col gap-2 cursor-pointer">
                      <Users className="h-6 w-6" />
                      <span>Manage Members</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Team Members</CardTitle>
                    <Link to="/workspace/settings">
                      <Button variant="ghost" size="sm" className="rounded-xl cursor-pointer">
                        <Plus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Invite team members to collaborate</p>
                      <Link to="/workspace/settings">
                        <Button size="sm" variant="outline" className="mt-3 rounded-xl">
                          Invite People
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teamMembers.slice(0, 4).map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-10 w-10 rounded-full border bg-muted"
                              />
                              {member.online && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{member.online ? "Online" : "Away"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Documents + Boards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Documents</CardTitle>
                    <Link to="/documents">
                      <Button variant="ghost" size="sm" className="rounded-xl cursor-pointer">
                        View all
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.slice(0, 3).map((doc) => (
                      <Link key={doc._id} to={`/documents/${doc._id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.title || "Untitled Document"}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Edited {new Date(doc.lastSavedAt || doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No documents yet.</p>
                        <Link to="/documents">
                          <Button size="sm" variant="outline" className="mt-3 rounded-xl gap-1">
                            <Plus className="h-3 w-3" /> Create Document
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Boards</CardTitle>
                    <Link to="/boards/1">
                      <Button variant="ghost" size="sm" className="rounded-xl cursor-pointer">
                        View all
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {boards.slice(0, 3).map((board) => (
                      <Link key={board._id} to={`/boards/${board._id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Palette className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{board.title || "Untitled Board"}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Created {new Date(board.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {boards.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Palette className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No boards yet.</p>
                        <Link to="/boards/1">
                          <Button size="sm" variant="outline" className="mt-3 rounded-xl gap-1">
                            <Plus className="h-3 w-3" /> Create Board
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.slice(0, 4).map((activity) => {
                    const actor = activity.actorId || {};
                    const avatarUrl = actor.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(actor.name || "System")}`;
                    return (
                      <div key={activity._id} className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                        <img
                          src={avatarUrl}
                          alt={actor.name || "System"}
                          className="h-10 w-10 rounded-full border bg-muted shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{actor.name || "System"}</span>{" "}
                            <span className="text-muted-foreground">{activity.action?.replace(/_/g, " ")}</span>{" "}
                            {activity.target && <span className="font-medium">{activity.target}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {activities.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Activity will appear here as your team collaborates.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
