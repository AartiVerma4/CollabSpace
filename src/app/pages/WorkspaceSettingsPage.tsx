import { useState, useEffect } from "react";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Plus, Trash2, Crown, Shield, Eye, Save } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { workspaceApi } from "../../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function WorkspaceSettingsPage() {
  const { workspace, user, refreshWorkspaces, setWorkspace } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with workspace metadata
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "");
      setIcon(workspace.icon || "🚀");
      setDescription(workspace.description || "");
    }
  }, [workspace]);

  if (!workspace) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-center text-muted-foreground">
          No active workspace selected. Please select or create a workspace first.
        </div>
      </WorkspaceLayout>
    );
  }

  const isOwner = workspace.ownerId?._id === user?.id || workspace.ownerId === user?.id;
  const isWorkspaceAdmin = isOwner || user?.role === "admin";

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await workspaceApi.update(workspace.id, {
        name,
        logo: icon,
        description
      });
      const updatedList = await refreshWorkspaces();
      const updated = updatedList.find(w => w.id === workspace.id);
      if (updated) setWorkspace(updated);
      toast.success("Workspace updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update workspace settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!isOwner) {
      toast.error("Only the workspace owner can delete this workspace");
      return;
    }
    const confirm = window.confirm("Are you absolutely sure you want to permanently delete this workspace? All data will be lost.");
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await workspaceApi.delete(workspace.id);
      const updatedList = await refreshWorkspaces();
      setWorkspace(updatedList.length > 0 ? updatedList[0] : null);
      toast.success("Workspace deleted successfully");
      navigate("/workspace");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workspace");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInviteMember = async () => {
    const email = prompt("Enter email address to invite:");
    if (!email) return;
    const roleInput = prompt("Enter role (Admin, Editor, Commenter, Viewer):", "Editor");
    if (!roleInput) return;

    const formattedRole = roleInput.charAt(0).toUpperCase() + roleInput.slice(1).toLowerCase();
    
    try {
      await workspaceApi.invite(workspace.id, { email, role: formattedRole });
      toast.success(`Invitation sent to ${email} as ${formattedRole}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch invitation");
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await workspaceApi.updateMemberRole(workspace.id, memberId, role);
      const updatedList = await refreshWorkspaces();
      const updated = updatedList.find(w => w.id === workspace.id);
      if (updated) setWorkspace(updated);
      toast.success("Member role updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (memberId === user?.id) {
      toast.error("You cannot remove yourself from workspace settings. To leave, contact the owner.");
      return;
    }
    const confirm = window.confirm(`Remove ${memberName} from this workspace?`);
    if (!confirm) return;

    try {
      await workspaceApi.removeMember(workspace.id, memberId);
      const updatedList = await refreshWorkspaces();
      const updated = updatedList.find(w => w.id === workspace.id);
      if (updated) setWorkspace(updated);
      toast.success(`${memberName} has been removed`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const teamMembers = workspace.members?.map((m: any) => {
    const memberUser = m.userId || {};
    return {
      id: memberUser._id || memberUser.id || "",
      name: memberUser.name || "Member",
      email: memberUser.email || "",
      avatar: memberUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberUser.name || "Member")}`,
      role: m.role || "Viewer"
    };
  }) || [];

  return (
    <WorkspaceLayout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Workspace Settings</h1>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="rounded-xl">
              <TabsTrigger value="general" className="rounded-lg cursor-pointer">General</TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg cursor-pointer">Members</TabsTrigger>
              <TabsTrigger value="permissions" className="rounded-lg cursor-pointer">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="space-y-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Workspace Information</CardTitle>
                    <CardDescription>
                      Update your workspace details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspaceName">Workspace Name</Label>
                      <Input
                        id="workspaceName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-xl"
                        disabled={!isWorkspaceAdmin || isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspaceIcon">Workspace Icon</Label>
                      <Input
                        id="workspaceIcon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className="rounded-xl"
                        disabled={!isWorkspaceAdmin || isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspaceDesc">Workspace Description</Label>
                      <Input
                        id="workspaceDesc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the purpose of this workspace"
                        className="rounded-xl"
                        disabled={!isWorkspaceAdmin || isSaving}
                      />
                    </div>
                    {isWorkspaceAdmin && (
                      <Button className="rounded-xl gap-2 cursor-pointer" onClick={handleSaveGeneral} disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {isOwner && (
                  <Card className="rounded-2xl border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                      <CardDescription>
                        Irreversible actions for this workspace
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Delete Workspace</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this workspace and all its data
                          </p>
                        </div>
                        <Button variant="destructive" className="rounded-xl cursor-pointer" onClick={handleDeleteWorkspace} disabled={isDeleting}>
                          {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="members">
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage who has access to this workspace
                      </CardDescription>
                    </div>
                    {isWorkspaceAdmin && (
                      <Button className="rounded-xl gap-2 cursor-pointer" onClick={handleInviteMember}>
                        <Plus className="h-4 w-4" />
                        Invite Members
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 rounded-xl border hover:border-primary transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border bg-muted">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{member.name}</p>
                                {(member.role === "Admin" || member.role === "Owner") && (
                                  <Badge variant="outline" className="gap-1 bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400">
                                    <Crown className="h-3 w-3" />
                                    {member.role}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isWorkspaceAdmin && member.id !== workspace.ownerId?._id && member.id !== workspace.ownerId ? (
                              <Select
                                defaultValue={member.role}
                                onValueChange={(val) => handleRoleChange(member.id, val)}
                              >
                                <SelectTrigger className="w-32 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Editor">Editor</SelectItem>
                                  <SelectItem value="Commenter">Commenter</SelectItem>
                                  <SelectItem value="Viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary" className="rounded-xl">{member.role}</Badge>
                            )}
                            
                            {isWorkspaceAdmin && member.id !== workspace.ownerId?._id && member.id !== workspace.ownerId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Roles & Permissions</CardTitle>
                  <CardDescription>
                    Define what each role can do in this workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    {
                      role: "Owner / Admin",
                      icon: Crown,
                      description: "Full administrative controls over workspace operations",
                      permissions: [
                        "Update workspace branding (Name, Icon, Description)",
                        "Invite other team members and manage role elevations",
                        "Remove existing members (except the owner)",
                        "Create, edit, comments, and delete files",
                        "Permanently delete the entire workspace (Owner only)",
                      ],
                    },
                    {
                      role: "Editor",
                      icon: Shield,
                      description: "Standard collaborator who can modify workspace files",
                      permissions: [
                        "Create, edit, save documents and canvas boards",
                        "Comment on documents and discuss with team",
                        "Participate in live multiplayer cursor synchronization",
                        "Access chat rooms and channels",
                      ],
                    },
                    {
                      role: "Commenter & Viewer",
                      icon: Eye,
                      description: "Read-only access limits",
                      permissions: [
                        "View all documents and design boards",
                        "Comment on document pages (Commenter role only)",
                        "Read workspace notifications and activity feeds",
                      ],
                    },
                  ].map((roleInfo, index) => (
                    <div key={index} className="border rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <roleInfo.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{roleInfo.role}</h3>
                          <p className="text-sm text-muted-foreground">
                            {roleInfo.description}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 ml-13">
                        {roleInfo.permissions.map((permission, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
