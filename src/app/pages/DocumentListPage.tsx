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
  Plus,
  Search,
  Filter,
  Grid,
  List,
  FileText,
  Folder,
  MoreHorizontal,
  Star,
  Clock,
  Download,
  Trash2,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { documentApi } from "../../lib/api";
import { toast } from "sonner";

export function DocumentListPage() {
  const { workspace } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateDocument = async () => {
    if (!workspace?.id) {
      toast.error("Please select a workspace first");
      return;
    }

    setIsCreating(true);
    try {
      const newDoc = await documentApi.create({
        title: "Untitled Document",
        workspaceId: workspace.id,
        content: ""
      });
      toast.success("Document created!");
      navigate(`/documents/${newDoc._id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    } finally {
      setIsCreating(false);
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

  const filteredDocuments = documents.filter((doc) =>
    (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <WorkspaceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Documents</h1>
            <p className="text-muted-foreground">
              {filteredDocuments.length} documents in your workspace
            </p>
          </div>
          <Button className="rounded-xl cursor-pointer" onClick={handleCreateDocument} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "New Document"}
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Documents Grid/List */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-4">All Documents</h2>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                No documents found. Click "New Document" to get started.
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => (
                  <Card key={doc._id} className="rounded-2xl hover:border-primary transition-all group">
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
                        <h3 className="font-semibold mb-2 hover:text-primary transition-colors cursor-pointer">
                          {doc.title || "Untitled Document"}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline" className="rounded-full">
                          Doc
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Edited {new Date(doc.lastSavedAt || doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <Card key={doc._id} className="rounded-2xl hover:border-primary transition-all">
                    <div className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <Link to={`/documents/${doc._id}`} className="flex-1">
                        <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                          {doc.title || "Untitled Document"}
                        </h3>
                      </Link>
                      <Badge variant="outline" className="rounded-full">
                        Doc
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground w-32">
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
    </WorkspaceLayout>
  );
}
