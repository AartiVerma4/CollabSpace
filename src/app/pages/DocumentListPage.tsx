import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Plus,
  Search,
  Grid,
  List,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Clock,
  Trash2,
  FolderInput,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { documentApi } from "../../lib/api";
import { toast } from "sonner";

export function DocumentListPage() {
  const { workspace } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New Folder Modal state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Move Document Modal state
  const [movingDoc, setMovingDoc] = useState<any | null>(null);
  const [targetFolder, setTargetFolder] = useState("");

  const loadDocuments = async () => {
    if (!workspace?.id) return;
    setIsLoading(true);
    try {
      const data = await documentApi.list(workspace.id);
      setDocuments(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [workspace?.id]);

  // Extract unique custom folders from existing documents
  const folderNames = Array.from(
    new Set(
      documents
        .map((doc) => doc.folder?.trim())
        .filter((f): f is string => Boolean(f))
    )
  ).sort();

  const handleCreateDocument = async (folderToUse?: string) => {
    if (!workspace?.id) {
      toast.error("Please select a workspace first");
      return;
    }

    setIsCreating(true);
    const assignedFolder =
      folderToUse !== undefined
        ? folderToUse
        : selectedFolder !== "all" && selectedFolder !== "uncategorized"
        ? selectedFolder
        : "";

    try {
      const newDoc = await documentApi.create({
        title: "Untitled Document",
        workspaceId: workspace.id,
        folder: assignedFolder,
        content: "",
      });
      toast.success("Document created!");
      navigate(`/documents/${newDoc._id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    setNewFolderName("");
    setShowNewFolderModal(false);
    setSelectedFolder(folderName);
    toast.success(`Folder "${folderName}" ready. Create a document to add to this folder!`);
  };

  const handleMoveDocument = async () => {
    if (!movingDoc) return;
    try {
      await documentApi.updateMetadata(movingDoc._id, {
        folder: targetFolder.trim(),
      });
      toast.success(`Moved "${movingDoc.title || "Document"}" to folder "${targetFolder.trim() || "Uncategorized"}"`);
      setMovingDoc(null);
      setTargetFolder("");
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to move document");
    }
  };

  const handleDeleteDocument = async (id: string, title: string) => {
    const confirm = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirm) return;

    try {
      await documentApi.delete(id);
      toast.success("Document deleted");
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  // Filter documents by search and folder selection
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFolder === "all") return true;
    if (selectedFolder === "uncategorized") return !doc.folder || !doc.folder.trim();
    return (doc.folder || "").trim().toLowerCase() === selectedFolder.toLowerCase();
  });

  return (
    <WorkspaceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documents & Folders</h1>
            <p className="text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} across {folderNames.length} folder{folderNames.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl cursor-pointer gap-2"
              onClick={() => setShowNewFolderModal(true)}
            >
              <FolderPlus className="h-4 w-4" />
              New Folder
            </Button>
            <Button className="rounded-xl cursor-pointer" onClick={() => handleCreateDocument()} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? "Creating..." : "New Document"}
            </Button>
          </div>
        </div>

        {/* Folder Cards Overview */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Folder className="h-4 w-4 text-primary" />
            Folders Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* All Documents Card */}
            <Card
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedFolder === "all"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => setSelectedFolder("all")}
            >
              <div className="flex items-center justify-between mb-2">
                <Folder className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  {documents.length}
                </Badge>
              </div>
              <p className="font-semibold text-sm truncate">All Documents</p>
            </Card>

            {/* Uncategorized Card */}
            <Card
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                selectedFolder === "uncategorized"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => setSelectedFolder("uncategorized")}
            >
              <div className="flex items-center justify-between mb-2">
                <Folder className="h-5 w-5 text-slate-400" />
                <Badge variant="outline" className="text-xs">
                  {documents.filter((d) => !d.folder || !d.folder.trim()).length}
                </Badge>
              </div>
              <p className="font-semibold text-sm truncate text-muted-foreground">Uncategorized</p>
            </Card>

            {/* Named Folders */}
            {folderNames.map((folderName) => {
              const count = documents.filter(
                (d) => (d.folder || "").trim().toLowerCase() === folderName.toLowerCase()
              ).length;
              const isSelected = selectedFolder.toLowerCase() === folderName.toLowerCase();

              return (
                <Card
                  key={folderName}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setSelectedFolder(folderName)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Folder className="h-5 w-5 text-indigo-500 fill-indigo-500/20" />
                    <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-200">
                      {count}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm truncate capitalize">{folderName}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search in ${selectedFolder === "all" ? "all documents" : selectedFolder}...`}
              className="pl-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {selectedFolder !== "all" && (
              <Badge variant="outline" className="px-3 py-1.5 rounded-xl gap-2 bg-muted/40">
                <span>Filter: <strong>{selectedFolder}</strong></span>
                <button
                  onClick={() => setSelectedFolder("all")}
                  className="text-xs text-muted-foreground hover:text-foreground font-bold ml-1"
                >
                  ✕
                </button>
              </Badge>
            )}
            <div className="flex border rounded-xl overflow-hidden">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none cursor-pointer"
                onClick={() => setView("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none cursor-pointer"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-foreground mb-1">
                  No documents found in {selectedFolder === "all" ? "workspace" : `folder "${selectedFolder}"`}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new document to start drafting inside this folder.
                </p>
                <Button
                  className="rounded-xl cursor-pointer"
                  onClick={() => handleCreateDocument()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => (
                  <Card key={doc._id} className="rounded-2xl hover:border-primary transition-all group flex flex-col justify-between">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setMovingDoc(doc);
                                  setTargetFolder(doc.folder || "");
                                }}
                              >
                                <FolderInput className="h-4 w-4 mr-2" />
                                Move to folder…
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive"
                                onClick={() => handleDeleteDocument(doc._id, doc.title)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <Link to={`/documents/${doc._id}`}>
                        <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors cursor-pointer line-clamp-1">
                          {doc.title || "Untitled Document"}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {doc.folder && doc.folder.trim() ? (
                          <Badge variant="secondary" className="rounded-md gap-1 bg-indigo-500/10 text-indigo-600 border-indigo-200">
                            <Folder className="h-3 w-3" />
                            {doc.folder.trim()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-md text-muted-foreground">
                            Uncategorized
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-3 border-t bg-muted/20 rounded-b-2xl flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(doc.lastSavedAt || doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span>By {doc.authorId?.name || "Team Member"}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <Card key={doc._id} className="rounded-2xl hover:border-primary transition-all">
                    <div className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <Link to={`/documents/${doc._id}`} className="flex-1 min-w-0">
                        <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer truncate">
                          {doc.title || "Untitled Document"}
                        </h3>
                      </Link>
                      {doc.folder && doc.folder.trim() ? (
                        <Badge variant="secondary" className="rounded-md gap-1 bg-indigo-500/10 text-indigo-600 border-indigo-200 shrink-0">
                          <Folder className="h-3 w-3" />
                          {doc.folder.trim()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md text-muted-foreground shrink-0">
                          Uncategorized
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground w-32 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(doc.lastSavedAt || doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setMovingDoc(doc);
                              setTargetFolder(doc.folder || "");
                            }}
                          >
                            <FolderInput className="h-4 w-4 mr-2" />
                            Move to folder…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive"
                            onClick={() => handleDeleteDocument(doc._id, doc.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Create New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Folder Name</label>
              <Input
                placeholder="e.g. Design Specs, Sprint Plans, Engineering"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreateNewFolder()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowNewFolderModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleCreateNewFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Modal */}
      <Dialog open={Boolean(movingDoc)} onOpenChange={(open) => !open && setMovingDoc(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderInput className="h-5 w-5 text-primary" />
              Move Document to Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select or type a folder name for <strong>"{movingDoc?.title}"</strong>:
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Target Folder</label>
              <Input
                placeholder="Leave blank for Uncategorized"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {folderNames.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Existing Folders:</label>
                <div className="flex gap-2 flex-wrap">
                  {folderNames.map((f) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setTargetFolder(f)}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setMovingDoc(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleMoveDocument}>
              Move Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
}
