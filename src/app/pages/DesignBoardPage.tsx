import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { AvatarStack } from "../components/AvatarStack";
import {
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Pen,
  Type,
  StickyNote,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Share2,
  Download,
  Layers,
  Lock,
  Eye,
  Trash2,
  Copy,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useApp } from "../contexts/AppContext";
import { boardApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

const tools = [
  { icon: MousePointer, name: "Select", shortcut: "V" },
  { icon: Square, name: "Rectangle", shortcut: "R" },
  { icon: Circle, name: "Circle", shortcut: "O" },
  { icon: Triangle, name: "Triangle", shortcut: "T" },
  { icon: StickyNote, name: "Sticky Note", shortcut: "S" },
];

export function DesignBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace, user } = useApp();

  const [title, setTitle] = useState("Design Canvas");
  const [selectedTool, setSelectedTool] = useState("select");
  const [zoom, setZoom] = useState(100);
  const [objects, setObjects] = useState<any[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activeCursors, setActiveCursors] = useState<Record<string, { name: string; x: number; y: number; color: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // General properties of selected object
  const [fillColor, setFillColor] = useState("#4f46e5");
  const [opacity, setOpacity] = useState(100);

  const colors = ["#4f46e5", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

  // 1. Initial redirect for placeholder '1' and loading board
  useEffect(() => {
    if (!workspace?.id) return;
    
    if (id === "1") {
      const redirectBoard = async () => {
        try {
          const list = await boardApi.list(workspace.id);
          if (list.length > 0) {
            navigate(`/boards/${list[0]._id}`, { replace: true });
          } else {
            const created = await boardApi.create({ title: "Feature Brainstorm", workspaceId: workspace.id });
            navigate(`/boards/${created._id}`, { replace: true });
          }
        } catch (err: any) {
          toast.error("Failed to load design boards");
        }
      };
      redirectBoard();
      return;
    }

    const loadBoardDetails = async () => {
      setIsLoading(true);
      try {
        const board = await boardApi.get(id!);
        setTitle(board.title || "Design Canvas");
        setObjects(board.objects || []);
      } catch (err) {
        toast.error("Failed to load design board");
        navigate("/workspace");
      } finally {
        setIsLoading(false);
      }
    };

    loadBoardDetails();
  }, [id, workspace?.id]);

  // 2. Socket.IO sync handlers
  useEffect(() => {
    if (!id || id === "1" || isLoading || !workspace?.id) return;

    const socket = getSocket();
    
    socketHelpers.joinBoard(id, workspace.id);

    const handleCollaborators = (members: any[]) => {
      setCollaborators(
        members.map((m: any, idx: number) => ({
          id: m.userId,
          name: m.name,
          avatar: m.avatar,
          color: colors[idx % colors.length]
        }))
      );
    };

    const handleObjectUpdate = ({ object, userId }: any) => {
      if (userId === user?.id) return;
      
      setObjects((prev) => {
        const index = prev.findIndex((obj) => obj.id === object.id);
        if (index !== -1) {
          if (object.isDeleted) {
            return prev.filter((obj) => obj.id !== object.id);
          }
          const next = [...prev];
          next[index] = object;
          return next;
        } else if (!object.isDeleted) {
          return [...prev, object];
        }
        return prev;
      });
    };

    const handleCursor = ({ userId, name, x, y }: any) => {
      if (userId === user?.id) return;
      const idx = collaborators.findIndex(c => c.id === userId);
      const userColor = colors[idx !== -1 ? idx : 1];
      setActiveCursors((prev) => ({
        ...prev,
        [userId]: { name, x, y, color: userColor }
      }));
    };

    const handleCursorRemove = ({ userId }: any) => {
      setActiveCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("canvas:collaborators", handleCollaborators);
    socket.on("canvas:object-update", handleObjectUpdate);
    socket.on("canvas:cursor", handleCursor);
    socket.on("canvas:cursor-remove", handleCursorRemove);

    return () => {
      socket.off("canvas:collaborators", handleCollaborators);
      socket.off("canvas:object-update", handleObjectUpdate);
      socket.off("canvas:cursor", handleCursor);
      socket.off("canvas:cursor-remove", handleCursorRemove);
    };
  }, [id, isLoading, workspace?.id, collaborators.length]);

  // 3. Pointer move triggers socket pointer sync
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!id || id === "1") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    socketHelpers.emitBoardCursor(id, x, y);
  };

  // 4. Create new visual shape elements on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === "select") return;

    if (!id || id === "1") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 50;
    const y = e.clientY - rect.top - 50;

    const newShape = {
      id: "shape_" + Math.random().toString(36).substring(2, 9),
      type: selectedTool,
      name: `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} Shape`,
      x,
      y,
      width: selectedTool === "sticky-note" ? 150 : 100,
      height: selectedTool === "sticky-note" ? 150 : 100,
      fill: selectedTool === "sticky-note" ? "#fef08a" : fillColor,
      opacity: 1,
      isDeleted: false
    };

    setObjects((prev) => [...prev, newShape]);
    setSelectedObjectId(newShape.id);
    
    // Broadcast shape
    socketHelpers.emitBoardObjectUpdate(id, newShape);
    setSelectedTool("select");
  };

  // 5. Delete selected shapes
  const handleDeleteSelected = async () => {
    if (!selectedObjectId || !id) return;
    
    const targetObj = objects.find(o => o.id === selectedObjectId);
    if (!targetObj) return;

    const updated = { ...targetObj, isDeleted: true };
    setObjects(prev => prev.filter(o => o.id !== selectedObjectId));
    setSelectedObjectId(null);

    socketHelpers.emitBoardObjectUpdate(id, updated);
  };

  const handleUpdateProperties = (color: string, opVal: number) => {
    setFillColor(color);
    setOpacity(opVal);
    
    if (!selectedObjectId || !id) return;
    
    setObjects(prev => prev.map(o => {
      if (o.id === selectedObjectId) {
        const updated = { ...o, fill: color, opacity: opVal / 100 };
        socketHelpers.emitBoardObjectUpdate(id, updated);
        return updated;
      }
      return o;
    }));
  };

  const selectedObject = objects.find(o => o.id === selectedObjectId);

  if (isLoading || id === "1") {
    return (
      <WorkspaceLayout>
        <div className="flex items-center justify-center py-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="h-full flex flex-col">
        {/* Top Toolbar */}
        <div className="border-b bg-background">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">{title}</h1>
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live Design
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <AvatarStack users={collaborators} size="sm" max={5} />
              <Separator orientation="vertical" className="h-6" />
              <Button size="sm" className="rounded-xl gap-2 cursor-pointer" onClick={() => toast.success("Figma board link ready for sharing!")}>
                <Share2 className="h-4 w-4" />
                Share link
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-16 border-r bg-muted/20 flex flex-col items-center gap-1 py-4">
            {tools.map((tool) => (
              <Button
                key={tool.name}
                variant={selectedTool === tool.name.toLowerCase() ? "secondary" : "ghost"}
                size="icon"
                className="rounded-xl cursor-pointer mb-2"
                onClick={() => setSelectedTool(tool.name.toLowerCase())}
                title={`${tool.name} (${tool.shortcut})`}
              >
                <tool.icon className="h-5 w-5" />
              </Button>
            ))}
            {selectedObjectId && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-destructive hover:bg-destructive/10 mt-6 cursor-pointer"
                onClick={handleDeleteSelected}
                title="Delete selected shape"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Canvas Area */}
          <div
            className="flex-1 relative bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden cursor-crosshair"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
          >
            {/* Canvas Grid Pattern */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            />

            {/* Render Canvas Elements */}
            <div className="absolute inset-0" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "0 0" }}>
              {objects.map((obj) => {
                const isSel = obj.id === selectedObjectId;
                
                return (
                  <div
                    key={obj.id}
                    className={`absolute p-2 select-none transition-shadow ${
                      isSel ? "ring-2 ring-primary ring-offset-2 rounded" : "hover:ring-1 hover:ring-muted-foreground"
                    }`}
                    style={{
                      left: obj.x,
                      top: obj.y,
                      width: obj.width,
                      height: obj.height,
                      cursor: "pointer",
                      opacity: obj.opacity ?? 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                      setFillColor(obj.fill || "#4f46e5");
                      setOpacity((obj.opacity ?? 1) * 100);
                    }}
                  >
                    {obj.type === "rectangle" && (
                      <div className="w-full h-full border-2 border-foreground" style={{ backgroundColor: obj.fill || "#4f46e5", borderRadius: "8px" }} />
                    )}
                    {obj.type === "circle" && (
                      <div className="w-full h-full border-2 border-foreground rounded-full" style={{ backgroundColor: obj.fill || "#4f46e5" }} />
                    )}
                    {obj.type === "triangle" && (
                      <div
                        className="w-0 h-0 border-l-[50px] border-l-transparent border-r-[50px] border-r-transparent border-b-[86px]"
                        style={{ borderBottomColor: obj.fill || "#4f46e5" }}
                      />
                    )}
                    {obj.type === "sticky-note" && (
                      <div
                        className="w-full h-full p-3 shadow-md border border-yellow-400 text-xs font-semibold overflow-hidden leading-relaxed rotate-2"
                        style={{ backgroundColor: obj.fill || "#fef08a", color: "#854d0e" }}
                      >
                        Sticky notes: Type text in properties to update.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Render multiplayer collaborator mouse pointers */}
              {Object.entries(activeCursors).map(([userId, pointer]) => (
                <div
                  key={userId}
                  className="absolute pointer-events-none flex items-center gap-1 transition-all duration-100"
                  style={{ left: pointer.x, top: pointer.y }}
                >
                  <ArrowRight className="h-4 w-4 transform -rotate-45" style={{ color: pointer.color, fill: pointer.color }} />
                  <Badge style={{ backgroundColor: pointer.color }} className="text-[10px]">
                    {pointer.name}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Card className="rounded-xl p-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg h-8 w-8 cursor-pointer"
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg h-8 w-8 cursor-pointer"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </Card>
            </div>
          </div>

          {/* Right Panel - Properties & Layers */}
          <div className="w-80 border-l bg-background flex flex-col">
            <Tabs defaultValue="properties" className="flex-1 flex flex-col">
              <TabsList className="m-4 rounded-xl">
                <TabsTrigger value="properties" className="flex-1 rounded-lg">
                  Properties
                </TabsTrigger>
                <TabsTrigger value="layers" className="flex-1 rounded-lg">
                  Layers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="flex-1 mt-0">
                <ScrollArea className="h-full p-4">
                  {selectedObject ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="p-3 bg-muted/40 rounded-xl">
                        <Label className="text-xs text-muted-foreground uppercase">Selected Element</Label>
                        <p className="font-semibold text-sm capitalize">{selectedObject.type} ({selectedObject.id})</p>
                      </div>

                      <div>
                        <Label>Fill Color</Label>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="color"
                            value={fillColor}
                            onChange={(e) => handleUpdateProperties(e.target.value, opacity)}
                            className="h-10 w-10 border rounded-md cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={fillColor}
                            onChange={(e) => handleUpdateProperties(e.target.value, opacity)}
                            className="flex-1 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Opacity</Label>
                        <div className="mt-2 flex items-center gap-3">
                          <Slider
                            value={[opacity]}
                            onValueChange={(val) => handleUpdateProperties(fillColor, val[0])}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-sm w-12">{opacity}%</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>X Position</Label>
                          <Input type="text" readOnly value={Math.round(selectedObject.x)} className="mt-2 rounded-lg bg-muted/20" />
                        </div>
                        <div>
                          <Label>Y Position</Label>
                          <Input type="text" readOnly value={Math.round(selectedObject.y)} className="mt-2 rounded-lg bg-muted/20" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Width</Label>
                          <Input type="text" readOnly value={selectedObject.width} className="mt-2 rounded-lg bg-muted/20" />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input type="text" readOnly value={selectedObject.height} className="mt-2 rounded-lg bg-muted/20" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                      Select a shape on the canvas to configure properties.
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="layers" className="flex-1 mt-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-1">
                    {objects.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedObjectId(layer.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer group ${
                          layer.id === selectedObjectId ? "bg-accent font-semibold" : ""
                        }`}
                      >
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate capitalize">{layer.name || layer.type}</span>
                      </div>
                    ))}
                    {objects.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-xs">No shapes drawn yet.</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
