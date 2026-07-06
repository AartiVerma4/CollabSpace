import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { AvatarStack } from "../components/AvatarStack";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  Image,
  Code,
  Quote,
  Share2,
  Clock,
  MoreHorizontal,
  MessageSquare,
  Check,
  ArrowLeft,
  RotateCcw,
  Save,
  Sparkles,
  Eye,
  Edit,
  Globe,
  Copy,
  ShieldOff,
  MessageCircle,
  CalendarClock,
  Infinity,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useApp } from "../contexts/AppContext";
import { documentApi, authApi, type SharePermission, type ShareLinkStatus } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";
import { cn } from "../components/ui/utils";

export function DocumentEditorPage({ isSharedView = false }: { isSharedView?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace, user, setUser } = useApp();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showComments, setShowComments] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activeCursors, setActiveCursors] = useState<any>({});
  
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Guest sharing state
  const shareToken = new URLSearchParams(window.location.search).get("token") || "";
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isRegisteringGuest, setIsRegisteringGuest] = useState(false);
  const [isValidatingLink, setIsValidatingLink] = useState(isSharedView);
  const [sharePermission, setSharePermission] = useState("Viewer");
  const [isLinkValid, setIsLinkValid] = useState(true);
  const [docWorkspaceId, setDocWorkspaceId] = useState<string | null>(null);

  // Share Settings Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRole, setShareRole] = useState<SharePermission>("Viewer");
  const [shareExpiresInDays, setShareExpiresInDays] = useState<number>(0); // 0 = never
  const [shareStatus, setShareStatus] = useState<ShareLinkStatus | null>(null);
  const [isLoadingShareStatus, setIsLoadingShareStatus] = useState(false);
  const [isRevokingLink, setIsRevokingLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  const revisionRef = useRef(0);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Colors for active collaborator cursors
  const colors = ["#4f46e5", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

  const loadDocDetails = async () => {
    if (!id) return;
    try {
      if (isSharedView) {
        if (!user) {
          // Unauthenticated guest: validate link metadata only (title + permission)
          // The guest join screen will render, then after login loadDocDetails re-runs
          const data = await documentApi.getPublic(id, shareToken);
          setTitle(data.title || "Untitled Document");
          setSharePermission(data.sharePermission || "Viewer");
          setIsLinkValid(true);
          setIsLoading(false);
          setIsValidatingLink(false);
          return;
        } else {
          // FIX Bug 1: Logged-in user visiting a share link (owner, non-member, etc.)
          // Use the share-token endpoint which bypasses workspace membership checks
          const docData = await documentApi.getByShareToken(id, shareToken);
          const doc = docData.document || docData;
          setTitle(doc.title || "Untitled Document");
          setContent(doc.content || "");
          revisionRef.current = doc.version || 0;
          setComments(docData.comments || []);
          setDocWorkspaceId(doc.workspaceId);
          setSharePermission(doc.sharePermission || "Viewer");
          setIsLinkValid(true);
          return;
        }
      }

      // Standard authenticated workspace-member access
      const docData = await documentApi.get(id);
      const doc = docData.document || docData;
      setTitle(doc.title || "Untitled Document");
      setContent(doc.content || "");
      revisionRef.current = doc.version || 0;
      setComments(docData.comments || []);
      setDocWorkspaceId(doc.workspaceId);
      if (doc.sharePermission) {
        setSharePermission(doc.sharePermission);
      }
      setIsLinkValid(true);
    } catch (err: any) {
      const message = err.message || "";
      // Show specific error for share link issues
      if (message.includes("revoked") || message.includes("expired") || message.includes("Invalid share")) {
        setIsLinkValid(false);
      } else {
        toast.error("Failed to load document");
        setIsLinkValid(false);
        if (!isSharedView) navigate("/documents");
      }
    } finally {
      setIsLoading(false);
      setIsValidatingLink(false);
    }
  };

  const loadVersions = async () => {
    if (!id) return;
    try {
      const data = await documentApi.getVersions(id, shareToken);
      setVersions(data);
    } catch (err: any) {
      console.warn("Failed to load version history:", err);
    }
  };

  // 1. Initial Load
  useEffect(() => {
    loadDocDetails();
  }, [id, user]);

  // Sync content into the contentEditable div whenever content state changes
  // (e.g., after initial load or remote socket update)
  useEffect(() => {
    const editor = contentAreaRef.current;
    if (!editor) return;
    // Only update DOM if it differs (avoids resetting cursor on local edits)
    if (editor.innerHTML !== content) {
      editor.innerHTML = content;
    }
  }, [content]);

  // 2. Socket.IO multiplayer sync
  useEffect(() => {
    const wsId = workspace?.id || docWorkspaceId;
    if (!id || !wsId || isLoading || !user) return;

    const socket = getSocket();
    
    // Join document room
    socketHelpers.joinDocument(id, wsId);

    // Socket listeners
    const handleCollaborators = (members: any[]) => {
      setCollaborators(
        members.map((m: any, index: number) => ({
          id: m.userId,
          name: m.name,
          avatar: m.avatar,
          color: colors[index % colors.length]
        }))
      );
    };

    const handleOperation = ({ op, revision, userId }: any) => {
      if (userId === user?.id) return;
      revisionRef.current = revision;
      if (op && typeof op === "string") {
        setContent(op);
      } else if (op && op.fullContent !== undefined) {
        setContent(op.fullContent);
      }
    };

    const handleCursor = ({ userId, name, range, color }: any) => {
      if (userId === user?.id) return;
      setActiveCursors((prev: any) => ({
        ...prev,
        [userId]: { name, range, color }
      }));
    };

    const handleCursorRemove = ({ userId }: any) => {
      setActiveCursors((prev: any) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("doc:collaborators", handleCollaborators);
    socket.on("doc:operation", handleOperation);
    socket.on("doc:cursor", handleCursor);
    socket.on("doc:cursor-remove", handleCursorRemove);

    return () => {
      socket.off("doc:collaborators", handleCollaborators);
      socket.off("doc:operation", handleOperation);
      socket.off("doc:cursor", handleCursor);
      socket.off("doc:cursor-remove", handleCursorRemove);
    };
  }, [id, workspace?.id, docWorkspaceId, isLoading, user]);

  // 3. Trigger updates on content type
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    
    // Increment local revision and emit socket operation
    revisionRef.current += 1;
    socketHelpers.emitDocumentOp(id!, { fullContent: newVal }, revisionRef.current);
  };

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    handleContentChange(html);
  };

  const handleCursorMove = () => {
    const userColor = colors[collaborators.findIndex(c => c.id === user?.id) % colors.length] || "#4f46e5";
    const sel = window.getSelection();
    const start = sel?.anchorOffset ?? 0;
    const end = sel?.focusOffset ?? 0;
    socketHelpers.emitDocumentCursor(id!, { index: start, length: Math.abs(end - start) }, userColor);
  };

  // 4. Save metadata (title rename)
  const handleTitleBlur = async () => {
    if (!id || !title) return;
    try {
      await documentApi.updateMetadata(id, { title });
    } catch (err: any) {
      console.warn("Failed to auto-save title:", err);
    }
  };

  // 5. Comments Operations
  // FIX Bug 3: No anchorRange sent — it's optional on the backend now
  const handleAddComment = async () => {
    if (!id || !newCommentText.trim()) return;
    try {
      const added = await documentApi.addComment(
        id,
        { text: newCommentText },           // anchorRange omitted — optional
        shareToken || undefined
      );
      // Backend returns the new comment; reload to get full populated list
      setNewCommentText("");
      toast.success("Comment added");
      loadDocDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment");
    }
  };

  // FIX Bug 7: Use 'replyText' field for threaded replies
  const handleAddReply = async (commentId: string) => {
    const replyText = replyTexts[commentId];
    if (!id || !replyText?.trim()) return;
    try {
      await documentApi.resolveComment(
        id,
        commentId,
        { replyText },                       // correct field name for threaded replies
        shareToken || undefined
      );
      setReplyTexts(prev => ({ ...prev, [commentId]: "" }));
      toast.success("Reply posted");
      loadDocDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to post reply");
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!id) return;
    try {
      await documentApi.resolveComment(id, commentId, { resolved: true }, shareToken);
      toast.success("Comment resolved");
      loadDocDetails();
    } catch (err: any) {
      toast.error("Failed to resolve comment");
    }
  };

  // 6. Restore version snapshot
  const handleRestoreVersion = async (versionId: string) => {
    if (!id) return;
    const confirm = window.confirm("Restore this document version snapshot?");
    if (!confirm) return;

    try {
      await documentApi.restoreVersion(id, versionId, shareToken);
      toast.success("Snapshot restored!");
      setShowVersions(false);
      loadDocDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore version snapshot");
    }
  };

  const handleGuestLoginSubmit = async () => {
    setIsRegisteringGuest(true);
    try {
      const data = await authApi.guestLogin({ name: guestName, email: guestEmail });
      localStorage.setItem("collabspace_token", data.accessToken);
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.user.name)}`,
        role: "viewer"
      });
      toast.success(`Welcome, ${data.user.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join collaboration");
    } finally {
      setIsRegisteringGuest(false);
    }
  };

  const handleGuestLoginSkip = async () => {
    setIsRegisteringGuest(true);
    try {
      const data = await authApi.guestLogin({});
      localStorage.setItem("collabspace_token", data.accessToken);
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.user.name)}`,
        role: "viewer"
      });
      toast.success(`Welcome, ${data.user.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join collaboration");
    } finally {
      setIsRegisteringGuest(false);
    }
  };

  const applyFormatting = (formatType: string) => {
    const editor = contentAreaRef.current;
    if (!editor) return;

    editor.focus();

    switch (formatType) {
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "align-left":
        document.execCommand("justifyLeft", false);
        break;
      case "align-center":
        document.execCommand("justifyCenter", false);
        break;
      case "align-right":
        document.execCommand("justifyRight", false);
        break;
      case "list":
        document.execCommand("insertUnorderedList", false);
        break;
      case "list-ordered":
        document.execCommand("insertOrderedList", false);
        break;
      case "code": {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const code = document.createElement("code");
          code.style.background = "rgba(0,0,0,0.08)";
          code.style.borderRadius = "3px";
          code.style.padding = "0 4px";
          code.style.fontFamily = "monospace";
          if (!range.collapsed) {
            range.surroundContents(code);
          } else {
            code.textContent = "code";
            range.insertNode(code);
          }
        }
        break;
      }
      case "quote": {
        document.execCommand("formatBlock", false, "blockquote");
        break;
      }
      case "link": {
        const url = prompt("Enter URL:", "https://");
        if (url) document.execCommand("createLink", false, url);
        break;
      }
      case "image": {
        const src = prompt("Enter image URL:", "https://");
        if (src) document.execCommand("insertImage", false, src);
        break;
      }
      default:
        break;
    }

    // Sync content back to state after execCommand
    const newHtml = editor.innerHTML;
    handleContentChange(newHtml);
  };

  const handleSaveDocument = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await documentApi.save(id, { content }, shareToken);
      toast.success("Document saved successfully! A new version snapshot has been recorded.");
      if (showVersions) {
        loadVersions();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  // FIX Bug 4/6: Load current share link status when modal opens
  const loadShareStatus = useCallback(async () => {
    if (!id) return;
    setIsLoadingShareStatus(true);
    try {
      const status = await documentApi.getShareStatus(id);
      setShareStatus(status);
      if (status.shareIsActive) {
        setShareRole(status.sharePermission);
      }
    } catch {
      // Not critical — just no status shown
    } finally {
      setIsLoadingShareStatus(false);
    }
  }, [id]);

  // Generate / regenerate share link
  const handleShareDocument = async () => {
    if (!id) return;
    setIsGeneratingLink(true);
    try {
      const data = await documentApi.share(id, {
        permission: shareRole,
        expiresInDays: shareExpiresInDays || undefined,
      });
      const fullLink = data.shareLink || `${window.location.origin}/share/doc/${id}?token=${data.token}`;
      setGeneratedLink(fullLink);
      navigator.clipboard.writeText(fullLink);
      toast.success(`Share link generated and copied to clipboard!`);
      // Refresh status
      setShareStatus({
        hasShareLink: true,
        shareIsActive: true,
        sharePermission: shareRole,
        shareExpiresAt: data.shareExpiresAt || null,
        shareCreatedAt: data.shareCreatedAt || null,
        isExpired: false,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create sharing link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy existing link without regenerating
  const handleCopyExistingLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard!");
    }
  };

  // Revoke the share link
  const handleRevokeShareLink = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      "Revoke this share link? Anyone using it will immediately lose access. You can generate a new link at any time."
    );
    if (!confirmed) return;
    setIsRevokingLink(true);
    try {
      await documentApi.revokeShare(id);
      setShareStatus(prev => prev ? { ...prev, shareIsActive: false } : null);
      setGeneratedLink(null);
      toast.success("Share link revoked. Old link is now invalid.");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke link");
    } finally {
      setIsRevokingLink(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!id) return;
    const confirm = window.confirm("Are you sure you want to delete this document?");
    if (!confirm) return;
    try {
      await documentApi.delete(id);
      toast.success("Document deleted");
      navigate("/documents");
    } catch (err: any) {
      toast.error("Failed to delete document");
    }
  };

  if (isSharedView && !isLinkValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-6 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Invalid or Expired Share Link</h2>
        <p className="text-muted-foreground max-w-md">
          The document you are trying to access does not exist, or the link has expired or is invalid. Please contact the document owner.
        </p>
        <Button onClick={() => navigate("/")} className="rounded-xl">Go to Home</Button>
      </div>
    );
  }

  if (isSharedView && !user) {
    if (isValidatingLink) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 p-4">
        <Card className="max-w-md w-full p-8 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl space-y-6 text-white animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-2">
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Join Collaboration</h2>
            <p className="text-sm text-slate-300">
              You've been invited to view/edit <strong>"{title}"</strong>. Enter your details to join the session.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Your Name</label>
              <Input
                placeholder="e.g. John Doe"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-xl bg-white/5 border-white/10 text-white placeholder-slate-400 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Your Email</label>
              <Input
                placeholder="e.g. john@example.com"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="rounded-xl bg-white/5 border-white/10 text-white placeholder-slate-400 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="rounded-xl w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2 py-6 cursor-pointer font-semibold shadow-lg shadow-indigo-500/20 border-none"
              onClick={handleGuestLoginSubmit}
              disabled={isRegisteringGuest}
            >
              {isRegisteringGuest ? "Joining..." : "Join Collaboration"}
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl w-full text-slate-300 hover:text-white hover:bg-white/5 py-6 cursor-pointer font-medium border-none bg-transparent"
              onClick={handleGuestLoginSkip}
              disabled={isRegisteringGuest}
            >
              Skip and Join as Guest
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    const loader = (
      <div className="flex items-center justify-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
    return isSharedView ? (
      <div className="h-screen flex flex-col bg-background">{loader}</div>
    ) : (
      <WorkspaceLayout>{loader}</WorkspaceLayout>
    );
  }

  const isReadOnly = isSharedView && sharePermission !== "Editor";
  const isCommentable = !isSharedView || sharePermission === "Editor" || sharePermission === "Commenter";

  const editorLayout = (
    <div className="h-full flex">
      {/* Editor Main */}
      <div className="flex-1 flex flex-col border-r">
        {/* Toolbar */}
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSharedView ? (
                <Link to="/documents">
                  <Button variant="ghost" size="icon" className="rounded-xl cursor-pointer">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <span className="text-xl font-bold tracking-tight text-primary mr-2">CollabSpace</span>
              )}
              <AvatarStack users={collaborators} size="sm" max={5} />
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live Sync
              </Badge>
              {isSharedView && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Shared view ({sharePermission})
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isSharedView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 cursor-pointer"
                  onClick={() => {
                    setShowVersions(!showVersions);
                    if (!showVersions) loadVersions();
                  }}
                >
                  <Clock className="h-4 w-4" />
                  History
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2 cursor-pointer"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4" />
                Comments
              </Button>
              {!isSharedView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 cursor-pointer"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <Button
                size="sm"
                className="rounded-xl gap-2 cursor-pointer"
                onClick={handleSaveDocument}
                disabled={isSaving || isReadOnly}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              {!isSharedView && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleDeleteDocument}>
                      Delete document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Formatting Helper bar */}
          <div className="px-6 py-2 flex items-center gap-1 border-t overflow-x-auto">
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("bold")} title="Bold" disabled={isReadOnly}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("italic")} title="Italic" disabled={isReadOnly}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("underline")} title="Underline" disabled={isReadOnly}>
              <Underline className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("align-left")} title="Align Left" disabled={isReadOnly}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("align-center")} title="Align Center" disabled={isReadOnly}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("align-right")} title="Align Right" disabled={isReadOnly}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("list")} title="Bullet List" disabled={isReadOnly}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("list-ordered")} title="Numbered List" disabled={isReadOnly}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("link")} title="Insert Link" disabled={isReadOnly}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("image")} title="Insert Image" disabled={isReadOnly}>
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("code")} title="Code Block" disabled={isReadOnly}>
              <Code className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 cursor-pointer" onClick={() => applyFormatting("quote")} title="Blockquote" disabled={isReadOnly}>
              <Quote className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="text-xs text-muted-foreground ml-2 hidden sm:block">Markdown & HTML formatting supported.</div>
          </div>
        </div>

        {/* Editor Content Area */}
        <div className="flex-1 flex flex-col p-8 bg-card dark:bg-card/30">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            readOnly={isReadOnly}
            className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-4 h-auto focus:border-b rounded-none"
            placeholder="Untitled Document"
          />
          
          <div className="text-xs text-muted-foreground mb-4">
            Collaborators online: {collaborators.length === 0 ? "Only you" : collaborators.map(c => c.name).join(", ")}
          </div>

          <div
            ref={contentAreaRef}
            contentEditable={!isReadOnly}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onMouseUp={handleCursorMove}
            onKeyUp={handleCursorMove}
            dangerouslySetInnerHTML={content && !contentAreaRef.current ? { __html: content } : undefined}
            data-placeholder={isReadOnly ? "This shared document is read-only..." : "Start drafting your collaborative document..."}
            className="w-full flex-1 min-h-[400px] border-none outline-none bg-transparent text-base focus:ring-0 leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          />
        </div>
      </div>

      {/* Side Panels */}
      {showVersions && !isSharedView && (
        <div className="w-80 border-l bg-muted/10 flex flex-col h-full animate-in slide-in-from-right duration-250">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Version History</h3>
              <p className="text-xs text-muted-foreground">Snapshot updates logged</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowVersions(false)}>Close</Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {versions.map((ver, idx) => (
                <Card key={ver._id} className="p-3 border rounded-xl hover:border-primary transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">v{versions.length - idx}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">{ver.createdBy?.name || "System"}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(ver.createdAt).toLocaleDateString()}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 rounded-lg cursor-pointer"
                    onClick={() => handleRestoreVersion(ver._id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore snapshot
                  </Button>
                </Card>
              ))}
              {versions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">No snapshots recorded yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {showComments && (!showVersions || isSharedView) && (
        <div className="w-80 border-l bg-muted/10 flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Discussion</h3>
              <p className="text-xs text-muted-foreground">
                {comments.filter(c => !c.resolved).length} active threads
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowComments(false)}>Close</Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment._id} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8 border bg-muted">
                      <AvatarImage src={comment.authorId?.avatar} alt={comment.authorId?.name} />
                      <AvatarFallback>{(comment.authorId?.name || "C")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{comment.authorId?.name || "Anonymous"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg leading-relaxed">
                        {comment.text}
                      </p>
                      {comment.resolved && (
                        <Badge variant="outline" className="mt-1 text-[10px] bg-green-500/10 text-green-600 border-green-300 gap-1">
                          <Check className="h-2 w-2" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>

                  {comment.replies?.map((rep: any) => (
                    <div key={rep._id} className="ml-8 flex items-start gap-2 bg-muted/10 p-2 rounded-lg">
                      <Avatar className="h-6 w-6 border bg-muted">
                        <AvatarFallback>{(rep.authorName || "R")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold">{rep.authorName}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{rep.text}</p>
                      </div>
                    </div>
                  ))}

                  {!comment.resolved && isCommentable && (
                    <div className="ml-8 space-y-2">
                      <div className="flex gap-1">
                        <Input
                          placeholder="Reply..."
                          value={replyTexts[comment._id] || ""}
                          onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment._id]: e.target.value }))}
                          className="h-7 text-xs rounded-lg flex-1"
                        />
                        <Button size="sm" className="h-7 text-[10px] rounded-lg cursor-pointer" onClick={() => handleAddReply(comment._id)}>
                          Reply
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] rounded-lg cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50/50"
                        onClick={() => handleResolveComment(comment._id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Resolve thread
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {isCommentable && (
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question or add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <Button size="sm" className="rounded-xl h-9 cursor-pointer" onClick={handleAddComment}>
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isSharedView) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 overflow-hidden">
          {editorLayout}
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout>
      {editorLayout}
      {/* ── Share Document Modal ── */}
      <Dialog
        open={showShareModal}
        onOpenChange={(open) => {
          setShowShareModal(open);
          if (open) {
            loadShareStatus();
            setGeneratedLink(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl border bg-card p-0 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Share Document
              </DialogTitle>
              <DialogDescription className="text-sm">
                Generate a secure link. Control who can access this document and when the link expires.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Current link status */}
            {isLoadingShareStatus ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Loading link status…
              </div>
            ) : shareStatus?.hasShareLink ? (
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border text-sm",
                shareStatus.shareIsActive
                  ? "bg-green-500/5 border-green-300/50 text-green-700 dark:text-green-400"
                  : "bg-red-500/5 border-red-300/50 text-red-600 dark:text-red-400"
              )}>
                <div className="flex items-center gap-2">
                  {shareStatus.shareIsActive
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <XCircle className="h-4 w-4" />}
                  <span className="font-medium">
                    {shareStatus.shareIsActive ? "Active share link" : "Link revoked"}
                  </span>
                  {shareStatus.shareExpiresAt && (
                    <span className="text-xs opacity-70">
                      · Expires {new Date(shareStatus.shareExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {shareStatus.shareIsActive && (
                  <button
                    onClick={handleRevokeShareLink}
                    disabled={isRevokingLink}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldOff className="h-3 w-3" />
                    {isRevokingLink ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            ) : null}

            {/* Permission selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access Level</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "Viewer" as const, icon: Eye, label: "View Only", desc: "Read only" },
                  { value: "Commenter" as const, icon: MessageCircle, label: "Commenter", desc: "Can comment" },
                  { value: "Editor" as const, icon: Edit, label: "Editor", desc: "Full edit" },
                ] as const).map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShareRole(value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer",
                      shareRole === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted/60 bg-transparent text-muted-foreground hover:border-muted hover:bg-muted/5"
                    )}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="font-semibold text-xs">{label}</span>
                    <span className="text-[10px] opacity-70 mt-0.5">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Link Expiry
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Never", icon: Infinity, days: 0 },
                  { label: "1 Day", icon: Clock, days: 1 },
                  { label: "7 Days", icon: Clock, days: 7 },
                  { label: "30 Days", icon: Clock, days: 30 },
                ].map(({ label, icon: Icon, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setShareExpiresInDays(days)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 text-center transition-all cursor-pointer text-xs",
                      shareExpiresInDays === days
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-muted/60 text-muted-foreground hover:border-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 mb-0.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated link preview */}
            {generatedLink && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border">
                <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{generatedLink}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 gap-1 text-xs rounded-lg cursor-pointer"
                  onClick={handleCopyExistingLink}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl cursor-pointer"
              onClick={() => setShowShareModal(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1 rounded-xl gap-2 cursor-pointer font-semibold"
              onClick={handleShareDocument}
              disabled={isGeneratingLink}
            >
              {isGeneratingLink ? (
                <><div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating…</>
              ) : (
                <><Share2 className="h-4 w-4" /> {shareStatus?.shareIsActive ? "Regenerate Link" : "Generate Link"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
}
