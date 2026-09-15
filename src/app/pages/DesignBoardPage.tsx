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
  Trash2,
  Copy,
  Play,
  Code,
  Layout,
  Star,
  MessageSquarePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  RotateCcw,
  Sparkles,
  Plus,
  Box,
  Smartphone,
  Monitor,
  Tablet,
  Check,
  X,
  Mic,
  Volume2,
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  Zap,
  Wand2,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useApp } from "../contexts/AppContext";
import { boardApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

// Tools
const TOOLS = [
  { id: "select", icon: MousePointer, name: "Move / Select", shortcut: "V" },
  { id: "frame", icon: Layout, name: "Frame / Artboard", shortcut: "F" },
  { id: "text", icon: Type, name: "Text Writing Tool", shortcut: "T" },
  { id: "rectangle", icon: Square, name: "Rectangle", shortcut: "R" },
  { id: "circle", icon: Circle, name: "Ellipse", shortcut: "O" },
  { id: "star", icon: Star, name: "Star / Icon", shortcut: "S" },
  { id: "arrow", icon: ArrowRight, name: "Line / Arrow", shortcut: "L" },
  { id: "pen", icon: Pen, name: "Freehand Vector Pen", shortcut: "P" },
  { id: "smart-toggle", icon: ToggleRight, name: "Smart Toggle Switch", shortcut: "W" },
  { id: "hand", icon: Hand, name: "Hand / Pan", shortcut: "H" },
  { id: "comment", icon: MessageSquarePlus, name: "Pin Comment", shortcut: "C" },
  { id: "voice-pin", icon: Mic, name: "Voice Memo Pin", shortcut: "M" },
];

const FRAME_PRESETS = [
  { id: "desktop", name: "Desktop (1440 × 900)", width: 1440, height: 900, icon: Monitor },
  { id: "iphone", name: "iPhone 15 Pro (393 × 852)", width: 393, height: 852, icon: Smartphone },
  { id: "ipad", name: "iPad Air (820 × 1180)", width: 820, height: 1180, icon: Tablet },
  { id: "card", name: "Component Card (360 × 240)", width: 360, height: 240, icon: Box },
];

const UI_ASSETS = [
  {
    id: "hero-cta-btn",
    name: "Hero Action Button",
    type: "rectangle",
    width: 180,
    height: 52,
    fill: "#4f46e5",
    borderRadius: 14,
    text: "Start Free Trial →",
    textColor: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  {
    id: "nav-bar",
    name: "Header Navigation Bar",
    type: "rectangle",
    width: 900,
    height: 64,
    fill: "#0f172a",
    borderRadius: 16,
    text: "CollabSpace      Features      Pricing      Docs                      Login      Sign Up",
    textColor: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  {
    id: "pricing-card",
    name: "Pro Pricing Card",
    type: "rectangle",
    width: 280,
    height: 340,
    fill: "#ffffff",
    strokeColor: "#6366f1",
    strokeWidth: 2,
    borderRadius: 24,
    text: "PRO PLAN\n\n$29 / month\n\n✔ Unlimited Design Canvas\n✔ AI Layout Generator\n✔ Export React + Tailwind\n✔ Real-time Collaboration",
    textColor: "#0f172a",
    fontSize: 14,
    fontWeight: "500",
  },
];

const FONT_FAMILIES = ["Inter", "Outfit", "Roboto", "Playfair Display", "Fira Code", "sans-serif"];
const PRESET_COLORS = [
  "#4f46e5",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#64748b",
  "#0f172a",
  "#ffffff",
];

export function DesignBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace, user } = useApp();

  const [title, setTitle] = useState("Website & App Canvas Prototype");
  const [selectedTool, setSelectedTool] = useState("select");
  const [activeTabRight, setActiveTabRight] = useState<"design" | "prototype" | "inspect">("design");
  const [activeTabLeft, setActiveTabLeft] = useState<"layers" | "assets" | "pages">("layers");

  // Pages
  const [pages, setPages] = useState(["Page 1: Website Landing", "Page 2: App Dashboard", "Page 3: Components"]);
  const [currentPage, setCurrentPage] = useState("Page 1: Website Landing");

  // Canvas Viewport
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 80, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [gridTheme, setGridTheme] = useState<"dots" | "grid" | "whiteboard" | "blueprint">("dots");

  // Objects & Selection
  const [objects, setObjects] = useState<any[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Inline Canvas Writing State
  const [editingTextObjId, setEditingTextObjId] = useState<string | null>(null);

  // Pin Comments & Voice Pins
  const [comments, setComments] = useState<any[]>([]);
  const [voicePins, setVoicePins] = useState<any[]>([]);

  // Dragging & Resizing
  const [draggingObjId, setDraggingObjId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number; objX: number; objY: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    objX: 0,
    objY: 0,
  });

  // Pen Vector Drawing
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);

  // Modals
  const [showPrototypeModal, setShowPrototypeModal] = useState(false);
  const [activeProtoFrameId, setActiveProtoFrameId] = useState<string | null>(null);
  const [showAICopilotModal, setShowAICopilotModal] = useState(false);
  const [inspectFormat, setInspectFormat] = useState<"css" | "react">("react");

  // Multiplayer
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [activeCursors, setActiveCursors] = useState<Record<string, { name: string; x: number; y: number; color: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Object Properties
  const [fillColor, setFillColor] = useState("#4f46e5");
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [borderRadius, setBorderRadius] = useState(12);
  const [opacity, setOpacity] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Typography Properties
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(18);
  const [fontWeight, setFontWeight] = useState("600");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [textColor, setTextColor] = useState("#ffffff");
  const [protoTargetId, setProtoTargetId] = useState<string>("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const colors = ["#4f46e5", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

  // 1. Initial Load
  useEffect(() => {
    if (!workspace?.id) return;

    if (id === "1") {
      const redirectBoard = async () => {
        try {
          const list = await boardApi.list(workspace.id);
          if (list.length > 0) {
            navigate(`/boards/${list[0]._id}`, { replace: true });
          } else {
            const created = await boardApi.create({ title: "SaaS App Prototype", workspaceId: workspace.id });
            navigate(`/boards/${created._id}`, { replace: true });
          }
        } catch (err) {
          toast.error("Failed to load design board");
        }
      };
      redirectBoard();
      return;
    }

    const loadBoardDetails = async () => {
      setIsLoading(true);
      try {
        const board = await boardApi.get(id!);
        setTitle(board.title || "Website & App Canvas Prototype");
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

  // 2. Socket Synchronization
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
          color: colors[idx % colors.length],
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
      const idx = collaborators.findIndex((c) => c.id === userId);
      const userColor = colors[idx !== -1 ? idx : 1];
      setActiveCursors((prev) => ({
        ...prev,
        [userId]: { name, x, y, color: userColor },
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

  const saveBoardToBackend = async (newObjects: any[]) => {
    if (!id || id === "1") return;
    try {
      setIsSaving(true);
      await boardApi.update(id, { title, objects: newObjects });
    } catch (err) {
      console.warn("Failed to auto-save board:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left - panOffset.x) / (zoom / 100);
    const y = (clientY - rect.top - panOffset.y) / (zoom / 100);
    return { x, y };
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!id || id === "1") return;

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    socketHelpers.emitBoardCursor(id, x, y);

    if (isPenDrawing && selectedTool === "pen") {
      setPenPoints((prev) => [...prev, { x, y }]);
      return;
    }

    if (resizingHandle && selectedObjectId) {
      const deltaX = (e.clientX - resizeStart.x) / (zoom / 100);
      const deltaY = (e.clientY - resizeStart.y) / (zoom / 100);

      let newX = resizeStart.objX;
      let newY = resizeStart.objY;
      let newW = resizeStart.w;
      let newH = resizeStart.h;

      if (resizingHandle.includes("e")) newW = Math.max(20, resizeStart.w + deltaX);
      if (resizingHandle.includes("s")) newH = Math.max(20, resizeStart.h + deltaY);
      if (resizingHandle.includes("w")) {
        const possibleW = resizeStart.w - deltaX;
        if (possibleW > 20) {
          newW = possibleW;
          newX = resizeStart.objX + deltaX;
        }
      }
      if (resizingHandle.includes("n")) {
        const possibleH = resizeStart.h - deltaY;
        if (possibleH > 20) {
          newH = possibleH;
          newY = resizeStart.objY + deltaY;
        }
      }

      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id === selectedObjectId) {
            const updated = { ...obj, x: newX, y: newY, width: newW, height: newH };
            socketHelpers.emitBoardObjectUpdate(id, updated);
            return updated;
          }
          return obj;
        })
      );
      return;
    }

    if (draggingObjId) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id === draggingObjId) {
            const updated = { ...obj, x: newX, y: newY };
            socketHelpers.emitBoardObjectUpdate(id, updated);
            return updated;
          }
          return obj;
        })
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === "hand" || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (selectedTool === "pen") {
      setIsPenDrawing(true);
      setPenPoints([{ x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);

    if (isPenDrawing && selectedTool === "pen") {
      setIsPenDrawing(false);
      if (penPoints.length > 1) {
        const minX = Math.min(...penPoints.map((p) => p.x));
        const minY = Math.min(...penPoints.map((p) => p.y));

        const penShape = {
          id: "pen_" + Math.random().toString(36).substring(2, 9),
          type: "pen",
          name: "Freehand Drawing",
          x: minX,
          y: minY,
          points: penPoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          fill: "transparent",
          strokeColor: fillColor,
          strokeWidth,
          opacity: opacity / 100,
          width: Math.max(...penPoints.map((p) => p.x)) - minX + 10,
          height: Math.max(...penPoints.map((p) => p.y)) - minY + 10,
        };

        const updated = [...objects, penShape];
        setObjects(updated);
        socketHelpers.emitBoardObjectUpdate(id!, penShape);
        saveBoardToBackend(updated);
      }
      setPenPoints([]);
    }

    if (resizingHandle) {
      setResizingHandle(null);
      saveBoardToBackend(objects);
    }

    if (draggingObjId) {
      setDraggingObjId(null);
      saveBoardToBackend(objects);
    }
  };

  // Canvas Click: Create Elements / Tools
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === "select" || selectedTool === "hand" || selectedTool === "pen") return;
    if (!id || id === "1") return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // Voice Memo Pin Tool
    if (selectedTool === "voice-pin") {
      const voicePin = {
        id: "vpin_" + Math.random().toString(36).substring(2, 9),
        x,
        y,
        authorName: user?.name || "Member",
        duration: "0:14",
      };
      setVoicePins((prev) => [...prev, voicePin]);
      toast.success("Voice memo audio pin dropped on canvas!");
      setSelectedTool("select");
      return;
    }

    // Comment Pin Tool
    if (selectedTool === "comment") {
      const commentText = prompt("Enter canvas feedback comment:");
      if (commentText?.trim()) {
        const newComment = {
          id: "comment_" + Math.random().toString(36).substring(2, 9),
          x,
          y,
          text: commentText.trim(),
          authorName: user?.name || "Member",
        };
        setComments((prev) => [...prev, newComment]);
        toast.success("Comment annotation pinned!");
      }
      setSelectedTool("select");
      return;
    }

    // Smart Toggle Switch Widget
    if (selectedTool === "smart-toggle") {
      const toggleWidget = {
        id: "widget_" + Math.random().toString(36).substring(2, 9),
        type: "smart-toggle",
        name: "Interactive Toggle Switch",
        x,
        y,
        width: 60,
        height: 32,
        toggled: true,
        fill: "#4f46e5",
      };

      const updated = [...objects, toggleWidget];
      setObjects(updated);
      setSelectedObjectId(toggleWidget.id);
      socketHelpers.emitBoardObjectUpdate(id, toggleWidget);
      saveBoardToBackend(updated);
      setSelectedTool("select");
      toast.success("Interactive Toggle Switch added to canvas!");
      return;
    }

    // Standard Shapes & Writing Tools
    let defaultWidth = 160;
    let defaultHeight = 50;
    let name = `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)}`;

    if (selectedTool === "frame") {
      defaultWidth = 393;
      defaultHeight = 852;
      name = "iPhone 15 Frame";
    } else if (selectedTool === "rectangle") {
      defaultWidth = 200;
      defaultHeight = 120;
    } else if (selectedTool === "circle") {
      defaultWidth = 140;
      defaultHeight = 140;
    }

    const newShape: any = {
      id: "obj_" + Math.random().toString(36).substring(2, 9),
      type: selectedTool,
      name,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      fill: selectedTool === "frame" ? "#ffffff" : selectedTool === "text" ? "transparent" : fillColor,
      strokeColor: selectedTool === "frame" ? "#cbd5e1" : strokeColor,
      strokeWidth: selectedTool === "frame" ? 1 : strokeWidth,
      borderRadius: selectedTool === "frame" ? 24 : borderRadius,
      opacity: opacity / 100,
      rotation: 0,
      text: selectedTool === "text" ? "Write heading text here..." : selectedTool === "rectangle" ? "Button Copy" : "",
      textColor: textColor,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      textAlign: textAlign,
      locked: false,
      visible: true,
    };

    const updated = [...objects, newShape];
    setObjects(updated);
    setSelectedObjectId(newShape.id);
    socketHelpers.emitBoardObjectUpdate(id, newShape);
    saveBoardToBackend(updated);
    setSelectedTool("select");
  };

  // AI Layout Generator ("AI Design Copilot")
  const handleGenerateAILayout = (type: "hero" | "pricing" | "login" | "stats" | "navbar") => {
    if (!id) return;
    const startX = 120;
    const startY = 120;
    let generatedFrame: any = null;
    let childElements: any[] = [];

    if (type === "hero") {
      generatedFrame = {
        id: "frame_hero_" + Math.random().toString(36).substring(2, 7),
        type: "frame",
        name: "Website Hero Section",
        x: startX,
        y: startY,
        width: 1100,
        height: 600,
        fill: "#0f172a",
        borderRadius: 24,
        strokeColor: "#1e293b",
        strokeWidth: 1,
      };

      childElements = [
        {
          id: "hero_title",
          type: "text",
          name: "Hero Title",
          x: startX + 80,
          y: startY + 120,
          width: 940,
          height: 120,
          text: "Build Faster with CollabSpace Real-Time AI Canvas",
          textColor: "#ffffff",
          fontSize: 42,
          fontWeight: "900",
          textAlign: "center",
          fill: "transparent",
        },
        {
          id: "hero_subtitle",
          type: "text",
          name: "Hero Subtitle",
          x: startX + 180,
          y: startY + 260,
          width: 740,
          height: 60,
          text: "Design, prototype, and collaborate in real-time with instant React code export.",
          textColor: "#94a3b8",
          fontSize: 18,
          fontWeight: "500",
          textAlign: "center",
          fill: "transparent",
        },
        {
          id: "hero_btn_1",
          type: "rectangle",
          name: "Primary CTA Button",
          x: startX + 380,
          y: startY + 360,
          width: 180,
          height: 54,
          fill: "#6366f1",
          borderRadius: 16,
          text: "Start Free Trial →",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "700",
        },
        {
          id: "hero_btn_2",
          type: "rectangle",
          name: "Secondary CTA Button",
          x: startX + 580,
          y: startY + 360,
          width: 160,
          height: 54,
          fill: "#1e293b",
          strokeColor: "#334155",
          strokeWidth: 1.5,
          borderRadius: 16,
          text: "Watch Demo",
          textColor: "#f8fafc",
          fontSize: 16,
          fontWeight: "600",
        },
      ];
    } else if (type === "login") {
      generatedFrame = {
        id: "frame_login_" + Math.random().toString(36).substring(2, 7),
        type: "frame",
        name: "User Login Card",
        x: startX,
        y: startY,
        width: 420,
        height: 520,
        fill: "#ffffff",
        borderRadius: 24,
        strokeColor: "#e2e8f0",
        strokeWidth: 1,
      };

      childElements = [
        {
          id: "login_title",
          type: "text",
          name: "Login Heading",
          x: startX + 40,
          y: startY + 50,
          width: 340,
          height: 40,
          text: "Welcome Back",
          textColor: "#0f172a",
          fontSize: 28,
          fontWeight: "800",
          textAlign: "center",
          fill: "transparent",
        },
        {
          id: "login_input_1",
          type: "rectangle",
          name: "Email Input",
          x: startX + 40,
          y: startY + 140,
          width: 340,
          height: 48,
          fill: "#f8fafc",
          strokeColor: "#cbd5e1",
          strokeWidth: 1,
          borderRadius: 12,
          text: "you@company.com",
          textColor: "#64748b",
          fontSize: 14,
        },
        {
          id: "login_input_2",
          type: "rectangle",
          name: "Password Input",
          x: startX + 40,
          y: startY + 210,
          width: 340,
          height: 48,
          fill: "#f8fafc",
          strokeColor: "#cbd5e1",
          strokeWidth: 1,
          borderRadius: 12,
          text: "••••••••••••",
          textColor: "#64748b",
          fontSize: 14,
        },
        {
          id: "login_submit",
          type: "rectangle",
          name: "Sign In Button",
          x: startX + 40,
          y: startY + 290,
          width: 340,
          height: 50,
          fill: "#4f46e5",
          borderRadius: 14,
          text: "Sign In to Account",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "700",
        },
      ];
    }

    if (generatedFrame) {
      const newItems = [generatedFrame, ...childElements];
      const updated = [...objects, ...newItems];
      setObjects(updated);
      newItems.forEach((item) => socketHelpers.emitBoardObjectUpdate(id, item));
      saveBoardToBackend(updated);
      setShowAICopilotModal(false);
      toast.success(`AI Copilot generated ${generatedFrame.name} layout on canvas!`);
    }
  };

  // 1-Click Design Theme Transformer
  const handleTransformTheme = (mode: "light" | "dark" | "cyberpunk") => {
    if (!id) return;

    setObjects((prev) => {
      const updated = prev.map((obj) => {
        if (mode === "dark") {
          if (obj.type === "frame") return { ...obj, fill: "#0f172a", strokeColor: "#1e293b" };
          if (obj.type === "rectangle" && obj.fill === "#ffffff") return { ...obj, fill: "#1e293b", textColor: "#f8fafc" };
          if (obj.type === "text") return { ...obj, textColor: "#f8fafc" };
        } else if (mode === "cyberpunk") {
          if (obj.type === "frame") return { ...obj, fill: "#180b2d", strokeColor: "#06b6d4" };
          if (obj.fill === "#4f46e5" || obj.fill === "#6366f1") return { ...obj, fill: "#ec4899", textColor: "#ffffff" };
          if (obj.type === "text") return { ...obj, textColor: "#22d3ee" };
        } else {
          // Light Mode
          if (obj.type === "frame") return { ...obj, fill: "#ffffff", strokeColor: "#cbd5e1" };
          if (obj.type === "text") return { ...obj, textColor: "#0f172a" };
        }
        return obj;
      });

      saveBoardToBackend(updated);
      return updated;
    });

    toast.success(`Canvas transformed to ${mode.toUpperCase()} design theme!`);
  };

  // Mouse Down Object Dragging
  const handleShapeMouseDown = (e: React.MouseEvent, obj: any) => {
    if (selectedTool !== "select" || obj.locked) return;
    e.stopPropagation();

    setSelectedObjectId(obj.id);
    setFillColor(obj.fill || "#4f46e5");
    setStrokeColor(obj.strokeColor || "#1e293b");
    setStrokeWidth(obj.strokeWidth || 2);
    setBorderRadius(obj.borderRadius || 0);
    setOpacity((obj.opacity ?? 1) * 100);
    setRotation(obj.rotation || 0);
    setTextContent(obj.text || "");
    setTextColor(obj.textColor || "#ffffff");
    setFontSize(obj.fontSize || 18);
    setFontFamily(obj.fontFamily || "Inter");
    setFontWeight(obj.fontWeight || "600");
    setTextAlign(obj.textAlign || "center");
    setProtoTargetId(obj.protoTargetId || "");

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    setDraggingObjId(obj.id);
    setDragOffset({ x: x - obj.x, y: y - obj.y });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string, obj: any) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: obj.width,
      h: obj.height,
      objX: obj.x,
      objY: obj.y,
    });
  };

  const handleUpdateObject = (updates: Partial<any>) => {
    if (!selectedObjectId || !id) return;

    setObjects((prev) => {
      const updatedList = prev.map((o) => {
        if (o.id === selectedObjectId) {
          const updated = { ...o, ...updates };
          socketHelpers.emitBoardObjectUpdate(id, updated);
          return updated;
        }
        return o;
      });
      saveBoardToBackend(updatedList);
      return updatedList;
    });
  };

  const handleAlign = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedObjectId || !id) return;
    const target = objects.find((o) => o.id === selectedObjectId);
    if (!target) return;

    let newX = target.x;
    let newY = target.y;

    if (type === "left") newX = 100;
    if (type === "center") newX = 500 - target.width / 2;
    if (type === "right") newX = 900 - target.width;
    if (type === "top") newY = 100;
    if (type === "middle") newY = 400 - target.height / 2;
    if (type === "bottom") newY = 700 - target.height;

    handleUpdateObject({ x: newX, y: newY });
    toast.success(`Aligned ${type}`);
  };

  const handleDuplicateSelected = () => {
    if (!selectedObjectId || !id) return;
    const targetObj = objects.find((o) => o.id === selectedObjectId);
    if (!targetObj) return;

    const duplicated = {
      ...targetObj,
      id: "obj_" + Math.random().toString(36).substring(2, 9),
      name: `${targetObj.name || targetObj.type} Copy`,
      x: targetObj.x + 30,
      y: targetObj.y + 30,
    };

    const updated = [...objects, duplicated];
    setObjects(updated);
    setSelectedObjectId(duplicated.id);
    socketHelpers.emitBoardObjectUpdate(id, duplicated);
    saveBoardToBackend(updated);
    toast.success("Layer duplicated");
  };

  const handleDeleteSelected = () => {
    if (!selectedObjectId || !id) return;

    const targetObj = objects.find((o) => o.id === selectedObjectId);
    if (!targetObj) return;

    const updated = { ...targetObj, isDeleted: true };
    const newList = objects.filter((o) => o.id !== selectedObjectId);
    setObjects(newList);
    setSelectedObjectId(null);

    socketHelpers.emitBoardObjectUpdate(id, updated);
    saveBoardToBackend(newList);
    toast.success("Layer deleted");
  };

  const handleLayerOrder = (direction: "front" | "back") => {
    if (!selectedObjectId) return;
    const idx = objects.findIndex((o) => o.id === selectedObjectId);
    if (idx === -1) return;

    const newObjects = [...objects];
    const [item] = newObjects.splice(idx, 1);

    if (direction === "front") newObjects.push(item);
    else newObjects.unshift(item);

    setObjects(newObjects);
    saveBoardToBackend(newObjects);
  };

  // Generate React JSX + Tailwind CSS Code
  const getReactTailwindCode = (obj: any) => {
    if (!obj) return "";
    const bgClass = obj.fill === "#0f172a" ? "bg-slate-900" : obj.fill === "#4f46e5" ? "bg-indigo-600" : "bg-white";
    const textClass = obj.textColor === "#ffffff" ? "text-white" : "text-slate-900";
    const roundedClass = obj.borderRadius >= 20 ? "rounded-3xl" : obj.borderRadius >= 12 ? "rounded-xl" : "rounded-md";

    return `export default function ${obj.name?.replace(/[^a-zA-Z0-9]/g, "") || "CanvasComponent"}() {
  return (
    <div className="relative w-[${Math.round(obj.width)}px] h-[${Math.round(obj.height)}px] ${bgClass} ${textClass} ${roundedClass} shadow-xl p-6 flex flex-col justify-between">
      <h3 className="text-xl font-bold">${obj.text || obj.name || "Title"}</h3>
      <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl transition-all">
        Action Link
      </button>
    </div>
  );
}`;
  };

  const selectedObject = objects.find((o) => o.id === selectedObjectId);
  const frames = objects.filter((o) => o.type === "frame");

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
      <div className="h-full flex flex-col bg-background select-none">
        {/* ── Top Bar Toolbar ────────────────────────────────────────── */}
        <div className="border-b bg-background sticky top-0 z-30 flex items-center justify-between px-4 py-2">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => saveBoardToBackend(objects)}
                  className="font-bold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-1"
                />
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-300 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Live Sync
                </Badge>
              </div>
            </div>
          </div>

          {/* AI Copilot & Theme Transformer Buttons */}
          <div className="flex items-center gap-2">
            <Button
              className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer shadow-md text-xs"
              size="sm"
              onClick={() => setShowAICopilotModal(true)}
            >
              <Wand2 className="h-3.5 w-3.5" />
              AI Design Copilot
            </Button>

            {/* Theme Transformer Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1 cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Theme Transformer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-48 p-2">
                <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => handleTransformTheme("light")}>
                  <Sun className="h-4 w-4 text-amber-500" />
                  Light Theme
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => handleTransformTheme("dark")}>
                  <Moon className="h-4 w-4 text-indigo-400" />
                  Dark SaaS Theme
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => handleTransformTheme("cyberpunk")}>
                  <Zap className="h-4 w-4 text-pink-500" />
                  Neon Cyberpunk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Present Prototype */}
            <Button
              className="rounded-xl gap-2 bg-green-600 hover:bg-green-500 text-white cursor-pointer shadow-md text-xs"
              size="sm"
              onClick={() => {
                if (frames.length === 0) {
                  toast.error("Create at least 1 Frame to present prototype!");
                  return;
                }
                setActiveProtoFrameId(frames[0].id);
                setShowPrototypeModal(true);
              }}
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              Present Prototype
            </Button>
          </div>
        </div>

        {/* ── Main Canvas View ───────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-14 border-r bg-muted/20 flex flex-col items-center gap-1 py-3 z-10 shrink-0">
            {TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? "secondary" : "ghost"}
                size="icon"
                className={`rounded-xl cursor-pointer mb-1 transition-all ${
                  selectedTool === tool.id ? "ring-2 ring-primary bg-primary/10 text-primary" : ""
                }`}
                onClick={() => setSelectedTool(tool.id)}
                title={`${tool.name} (${tool.shortcut})`}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          {/* Left Panel (Layers & Asset UI Library) */}
          <div className="w-64 border-r bg-background flex flex-col shrink-0">
            <Tabs value={activeTabLeft} onValueChange={(v: any) => setActiveTabLeft(v)} className="flex-1 flex flex-col">
              <TabsList className="m-3 rounded-xl">
                <TabsTrigger value="layers" className="flex-1 rounded-lg text-xs">
                  Layers ({objects.length})
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex-1 rounded-lg text-xs">
                  UI Assets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="layers" className="flex-1 mt-0">
                <ScrollArea className="h-full px-3">
                  <div className="space-y-1 py-1">
                    {objects.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedObjectId(layer.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-accent cursor-pointer transition-colors ${
                          layer.id === selectedObjectId ? "bg-accent font-semibold border" : ""
                        }`}
                      >
                        <Box className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="flex-1 truncate">{layer.name || layer.type}</span>
                      </div>
                    ))}
                    {objects.length === 0 && (
                      <p className="text-center py-10 text-xs text-muted-foreground">No layers yet. Click tools or AI Copilot to generate components.</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="assets" className="flex-1 mt-0">
                <ScrollArea className="h-full p-3">
                  <p className="text-xs text-muted-foreground mb-3">Click to insert UI components onto canvas:</p>
                  <div className="space-y-2">
                    {UI_ASSETS.map((asset) => (
                      <Card
                        key={asset.id}
                        className="p-3 rounded-xl hover:border-primary cursor-pointer transition-all flex items-center justify-between"
                        onClick={() => {
                          const newAsset = { ...asset, id: "asset_" + Math.random().toString(36).substring(2, 7), x: 200, y: 200 };
                          setObjects((prev) => [...prev, newAsset]);
                          saveBoardToBackend([...objects, newAsset]);
                          toast.success(`Inserted ${asset.name}`);
                        }}
                      >
                        <span className="text-xs font-semibold">{asset.name}</span>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Viewport Canvas Area */}
          <div
            ref={canvasRef}
            className={`flex-1 relative overflow-hidden select-none ${
              gridTheme === "blueprint" ? "bg-slate-950 text-white" : "bg-slate-50 dark:bg-slate-900"
            }`}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Objects Engine */}
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                transformOrigin: "0 0",
              }}
            >
              {objects.map((obj) => {
                const isSel = obj.id === selectedObjectId;

                return (
                  <div
                    key={obj.id}
                    className={`absolute select-none transition-shadow ${
                      isSel ? "ring-2 ring-indigo-500 ring-offset-2" : "hover:ring-1 hover:ring-indigo-300"
                    }`}
                    style={{
                      left: obj.x,
                      top: obj.y,
                      width: obj.width,
                      height: obj.height,
                      cursor: selectedTool === "select" ? "move" : "pointer",
                      opacity: obj.opacity ?? 1,
                      borderRadius: `${obj.borderRadius || 0}px`,
                    }}
                    onMouseDown={(e) => handleShapeMouseDown(e, obj)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTextObjId(obj.id);
                    }}
                  >
                    {/* Frame Label */}
                    {obj.type === "frame" && (
                      <div className="absolute -top-7 left-0 text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                        <Layout className="h-3 w-3 text-indigo-500" />
                        <span>{obj.name}</span>
                      </div>
                    )}

                    {/* Frame Body */}
                    {obj.type === "frame" && (
                      <div
                        className="w-full h-full border shadow-xl relative overflow-hidden"
                        style={{
                          backgroundColor: obj.fill || "#ffffff",
                          borderColor: obj.strokeColor || "#cbd5e1",
                          borderWidth: `${obj.strokeWidth || 1}px`,
                          borderRadius: `${obj.borderRadius || 16}px`,
                        }}
                      />
                    )}

                    {/* Rectangle / Button / Card with Direct Canvas Writing */}
                    {obj.type === "rectangle" && (
                      <div
                        className="w-full h-full border transition-colors shadow-sm flex items-center justify-center p-3 text-center"
                        style={{
                          backgroundColor: obj.fill || "#4f46e5",
                          borderColor: obj.strokeColor || "#1e293b",
                          borderWidth: `${obj.strokeWidth || 2}px`,
                          borderRadius: `${obj.borderRadius || 12}px`,
                          color: obj.textColor || "#ffffff",
                          fontFamily: obj.fontFamily || "Inter",
                          fontSize: `${obj.fontSize || 16}px`,
                          fontWeight: obj.fontWeight || "600",
                        }}
                      >
                        {editingTextObjId === obj.id ? (
                          <textarea
                            autoFocus
                            value={obj.text || ""}
                            onChange={(e) => handleUpdateObject({ text: e.target.value })}
                            onBlur={() => setEditingTextObjId(null)}
                            className="w-full h-full bg-transparent outline-none resize-none text-center font-bold"
                            style={{ color: obj.textColor || "#ffffff" }}
                          />
                        ) : (
                          <span className="whitespace-pre-line leading-relaxed">{obj.text || obj.name}</span>
                        )}
                      </div>
                    )}

                    {/* Circle */}
                    {obj.type === "circle" && (
                      <div
                        className="w-full h-full border rounded-full transition-colors shadow-sm"
                        style={{
                          backgroundColor: obj.fill || "#4f46e5",
                          borderColor: obj.strokeColor || "#1e293b",
                          borderWidth: `${obj.strokeWidth || 2}px`,
                        }}
                      />
                    )}

                    {/* Direct Text Writing Tool */}
                    {obj.type === "text" && (
                      <div className="w-full h-full p-1">
                        <textarea
                          value={obj.text || ""}
                          onChange={(e) => handleUpdateObject({ text: e.target.value })}
                          className="w-full h-full bg-transparent outline-none font-bold resize-none leading-snug"
                          style={{
                            color: obj.textColor || "#0f172a",
                            fontSize: `${obj.fontSize || 20}px`,
                            fontFamily: obj.fontFamily || "Inter",
                            fontWeight: obj.fontWeight || "700",
                            textAlign: obj.textAlign || "left",
                          }}
                          placeholder="Double-click to write text..."
                        />
                      </div>
                    )}

                    {/* Smart Interactive Toggle Switch */}
                    {obj.type === "smart-toggle" && (
                      <div
                        className={`w-full h-full rounded-full p-1 cursor-pointer transition-colors flex items-center ${
                          obj.toggled ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateObject({ toggled: !obj.toggled });
                          toast.success(`Toggle switched ${!obj.toggled ? "ON" : "OFF"}`);
                        }}
                      >
                        <div className="h-6 w-6 rounded-full bg-white shadow-md" />
                      </div>
                    )}

                    {/* 8-Point Resizing Handles */}
                    {isSel && (
                      <>
                        {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
                          <div
                            key={handle}
                            className="absolute h-2.5 w-2.5 bg-white border-2 border-indigo-600 rounded-sm z-30 shadow-md cursor-pointer"
                            style={{
                              top: handle.includes("n") ? "-5px" : handle.includes("s") ? "calc(100% - 5px)" : "calc(50% - 5px)",
                              left: handle.includes("w") ? "-5px" : handle.includes("e") ? "calc(100% - 5px)" : "calc(50% - 5px)",
                            }}
                            onMouseDown={(e) => handleResizeStart(e, handle, obj)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Voice Memo Pins */}
              {voicePins.map((vpin, idx) => (
                <div key={vpin.id} className="absolute z-40 flex items-center gap-2 p-2 rounded-2xl bg-indigo-600 text-white shadow-xl" style={{ left: vpin.x, top: vpin.y }}>
                  <Volume2 className="h-4 w-4 animate-bounce" />
                  <span className="text-xs font-semibold">Voice Memo #{idx + 1} ({vpin.duration})</span>
                </div>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <Card className="rounded-2xl p-2 flex items-center gap-3 shadow-xl bg-background/90 border">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold w-12 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </Card>
            </div>
          </div>

          {/* ── Right Inspector Panel ───────────────────────────────────── */}
          <div className="w-80 border-l bg-background flex flex-col shrink-0">
            <Tabs value={activeTabRight} onValueChange={(v: any) => setActiveTabRight(v)} className="flex-1 flex flex-col">
              <TabsList className="m-3 rounded-xl">
                <TabsTrigger value="design" className="flex-1 rounded-lg text-xs">
                  Design
                </TabsTrigger>
                <TabsTrigger value="inspect" className="flex-1 rounded-lg text-xs">
                  Inspect
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="flex-1 mt-0">
                <ScrollArea className="h-full p-4">
                  {selectedObject ? (
                    <div className="space-y-6">
                      {/* Typography Controls for Direct Writing */}
                      {(selectedObject.type === "text" || selectedObject.text) && (
                        <div className="space-y-3 p-3 bg-muted/30 rounded-xl border">
                          <Label className="text-xs font-bold text-primary flex items-center gap-1">
                            <Type className="h-3.5 w-3.5" />
                            Typography & Writing
                          </Label>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Font Family</Label>
                            <select
                              value={fontFamily}
                              onChange={(e) => {
                                setFontFamily(e.target.value);
                                handleUpdateObject({ fontFamily: e.target.value });
                              }}
                              className="w-full h-8 rounded-xl border text-xs px-2 bg-background mt-1"
                            >
                              {FONT_FAMILIES.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Font Size (px)</Label>
                              <Input
                                type="number"
                                value={fontSize}
                                onChange={(e) => {
                                  setFontSize(Number(e.target.value));
                                  handleUpdateObject({ fontSize: Number(e.target.value) });
                                }}
                                className="h-8 rounded-xl text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Font Weight</Label>
                              <select
                                value={fontWeight}
                                onChange={(e) => {
                                  setFontWeight(e.target.value);
                                  handleUpdateObject({ fontWeight: e.target.value });
                                }}
                                className="w-full h-8 rounded-xl border text-xs px-2 bg-background"
                              >
                                <option value="400">Regular</option>
                                <option value="600">Semi-Bold</option>
                                <option value="700">Bold</option>
                                <option value="900">Black</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] text-muted-foreground">Text Color</Label>
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => {
                                setTextColor(e.target.value);
                                handleUpdateObject({ textColor: e.target.value });
                              }}
                              className="h-7 w-full rounded-lg border cursor-pointer mt-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Fill & Geometry */}
                      <div>
                        <Label className="text-xs font-semibold">Fill Color</Label>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              className={`h-7 w-7 rounded-lg border transition-transform ${
                                fillColor === c ? "scale-110 ring-2 ring-primary" : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: c }}
                              onClick={() => {
                                setFillColor(c);
                                handleUpdateObject({ fill: c });
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1" onClick={handleDuplicateSelected}>
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1 text-destructive" onClick={handleDeleteSelected}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                      Select an element to edit typography or styling properties.
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* React JSX + Tailwind Inspect Tab */}
              <TabsContent value="inspect" className="flex-1 mt-0">
                <ScrollArea className="h-full p-4">
                  {selectedObject ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-indigo-600">
                          <FileCode className="h-4 w-4" />
                          React (TSX) + Tailwind Code
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] rounded-lg cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(getReactTailwindCode(selectedObject));
                            toast.success("React + Tailwind component code copied!");
                          }}
                        >
                          Copy React Code
                        </Button>
                      </div>

                      <pre className="p-3 bg-slate-900 text-cyan-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border">
                        {getReactTailwindCode(selectedObject)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-muted-foreground text-sm">
                      Select any component on canvas to export production React JSX code.
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── AI Layout Generator Modal ───────────────────────────────── */}
      <Dialog open={showAICopilotModal} onOpenChange={setShowAICopilotModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-indigo-600" />
              AI Design Copilot Generator
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Select a website UI prompt to instantly generate complete design layouts on your canvas:</p>
          <div className="space-y-3 py-2">
            <Card
              className="p-3 rounded-2xl hover:border-indigo-500 cursor-pointer transition-all border flex items-center justify-between"
              onClick={() => handleGenerateAILayout("hero")}
            >
              <div>
                <p className="font-bold text-sm">🚀 Website Hero Section</p>
                <p className="text-xs text-muted-foreground">Main title, subtitle & dual CTA action buttons</p>
              </div>
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </Card>

            <Card
              className="p-3 rounded-2xl hover:border-indigo-500 cursor-pointer transition-all border flex items-center justify-between"
              onClick={() => handleGenerateAILayout("login")}
            >
              <div>
                <p className="font-bold text-sm">🔒 User Login & Auth Card</p>
                <p className="text-xs text-muted-foreground">Card container, input fields & sign in button</p>
              </div>
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
}
