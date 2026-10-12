import { useState, useEffect, useRef, useCallback } from "react";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  Send,
  Search,
  Smile,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Plus,
  Loader2,
  Circle,
  MessageCircle,
  Star,
  Archive,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { useApp } from "../contexts/AppContext";
import { chatApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "🚀", "🎉", "😂", "🙌", "👀"];

// Mock DM contacts — in production these come from workspace members
const MOCK_CONTACTS = [
  {
    id: "dm_sarah",
    name: "Sarah Chen",
    email: "sarah@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    status: "online" as const,
    lastMessage: "Can you review the latest design?",
    lastTime: "2m ago",
    unread: 3,
    role: "Designer",
  },
  {
    id: "dm_alex",
    name: "Alex Kumar",
    email: "alex@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    status: "online" as const,
    lastMessage: "The API endpoints are ready 🚀",
    lastTime: "15m ago",
    unread: 1,
    role: "Backend Engineer",
  },
  {
    id: "dm_priya",
    name: "Priya Sharma",
    email: "priya@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    status: "away" as const,
    lastMessage: "Let's sync up tomorrow morning",
    lastTime: "1h ago",
    unread: 0,
    role: "Product Manager",
  },
  {
    id: "dm_james",
    name: "James Wilson",
    email: "james@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    status: "offline" as const,
    lastMessage: "Thanks for the help!",
    lastTime: "Yesterday",
    unread: 0,
    role: "Frontend Engineer",
  },
  {
    id: "dm_emily",
    name: "Emily Davis",
    email: "emily@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    status: "busy" as const,
    lastMessage: "I'll check the Figma file",
    lastTime: "Yesterday",
    unread: 0,
    role: "UX Researcher",
  },
];

type ContactStatus = "online" | "away" | "busy" | "offline";

interface DmMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  read: boolean;
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isEdited?: boolean;
}

function generateMockMessages(contactId: string, currentUserId: string, contactName: string): DmMessage[] {
  const base = Date.now();
  return [
    {
      id: `${contactId}_1`,
      senderId: contactId,
      senderName: contactName,
      text: "Hey! How's the project coming along?",
      timestamp: new Date(base - 3600000),
      read: true,
      reactions: [],
    },
    {
      id: `${contactId}_2`,
      senderId: currentUserId,
      senderName: "You",
      text: "Going great! Just finished the authentication module. Real-time collaboration is next 🚀",
      timestamp: new Date(base - 3540000),
      read: true,
      reactions: [{ emoji: "🚀", count: 1, reacted: false }],
    },
    {
      id: `${contactId}_3`,
      senderId: contactId,
      senderName: contactName,
      text: "That's awesome! Can't wait to see the live demo. Did you get the Socket.IO reconnection working?",
      timestamp: new Date(base - 3480000),
      read: true,
      reactions: [],
    },
    {
      id: `${contactId}_4`,
      senderId: currentUserId,
      senderName: "You",
      text: "Yes! The reconnection logic is solid now. Exponential backoff and all.",
      timestamp: new Date(base - 1800000),
      read: true,
      reactions: [{ emoji: "👍", count: 1, reacted: true }],
    },
    {
      id: `${contactId}_5`,
      senderId: contactId,
      senderName: contactName,
      text: "Perfect. Let's deploy it today! I'll set up the Render service now.",
      timestamp: new Date(base - 600000),
      read: false,
      reactions: [],
    },
  ];
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StatusIndicator({ status }: { status: ContactStatus }) {
  const colors: Record<ContactStatus, string> = {
    online: "bg-emerald-500",
    away: "bg-amber-500",
    busy: "bg-red-500",
    offline: "bg-slate-400",
  };
  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${colors[status]}`}
    />
  );
}

export function DirectMessagesPage() {
  const { user, workspace } = useApp();

  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [selectedContact, setSelectedContact] = useState(MOCK_CONTACTS[0]);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load messages when switching contacts
  useEffect(() => {
    if (selectedContact && user) {
      const mock = generateMockMessages(selectedContact.id, user.id, selectedContact.name);
      setMessages(mock);

      // Mark contact as read
      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? { ...c, unread: 0 } : c))
      );
    }
  }, [selectedContact.id, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate typing indicator from contact
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.random() > 0.7) setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending || !user) return;

    const text = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    const optimisticMsg: DmMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text,
      timestamp: new Date(),
      read: false,
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Simulate backend response (in production, use real DM API)
    setTimeout(() => {
      setIsSending(false);
      // Simulate reply
      if (Math.random() > 0.5) {
        const replies = [
          "Got it! I'll take a look.",
          "Thanks for the update 👍",
          "Sounds good, let's connect later.",
          "On it! Will ping you when done 🚀",
          "Perfect, that works for me!",
        ];
        const reply: DmMessage = {
          id: `reply_${Date.now()}`,
          senderId: selectedContact.id,
          senderName: selectedContact.name,
          senderAvatar: selectedContact.avatar,
          text: replies[Math.floor(Math.random() * replies.length)],
          timestamp: new Date(),
          read: false,
          reactions: [],
        };
        setTimeout(() => setMessages((prev) => [...prev, reply]), 1500);
      }
    }, 500);
  }, [newMessage, isSending, user, selectedContact]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                : r
            ).filter((r) => r.count > 0),
          };
        }
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
      })
    );
    setShowEmojiPicker(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    toast.success("Message deleted");
  };

  const handleEditMessage = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditText(text);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editText.trim()) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: editText.trim(), isEdited: true } : m
      )
    );
    setEditingMessageId(null);
    setEditText("");
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = contacts.reduce((sum, c) => sum + c.unread, 0);
  const isMyMessage = (msg: DmMessage) => msg.senderId === user?.id;

  return (
    <WorkspaceLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* ─── Contact Sidebar ─────────────────────────────────────────── */}
        <aside className="w-72 border-r border-border flex flex-col shrink-0">
          {/* Header */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Direct Messages</h2>
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                    {totalUnread}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group hover:bg-muted/60 ${
                    selectedContact.id === contact.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : ""
                  }`}
                >
                  {/* Avatar with status */}
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={contact.avatar} alt={contact.name} />
                      <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <StatusIndicator status={contact.status} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${contact.unread > 0 ? "font-semibold" : ""}`}>
                        {contact.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">{contact.lastTime}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${contact.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {contact.lastMessage}
                      </p>
                      {contact.unread > 0 && (
                        <Badge variant="destructive" className="h-4 w-4 p-0 text-xs flex items-center justify-center shrink-0 ml-1">
                          {contact.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* ─── Chat Area ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <header className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} />
                  <AvatarFallback>{getInitials(selectedContact.name)}</AvatarFallback>
                </Avatar>
                <StatusIndicator status={selectedContact.status} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{selectedContact.name}</h3>
                  <span className="text-xs text-muted-foreground">· {selectedContact.role}</span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedContact.status === "online"
                    ? "🟢 Active now"
                    : selectedContact.status === "away"
                    ? "🟡 Away"
                    : selectedContact.status === "busy"
                    ? "🔴 Do not disturb"
                    : "⚫ Offline"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Voice call">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Video call">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Search in conversation">
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Star className="h-4 w-4 mr-2" />
                    Star conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Start a conversation with {selectedContact.name}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, idx) => {
                  const mine = isMyMessage(msg);
                  const prevMsg = messages[idx - 1];
                  const showAvatar =
                    !prevMsg ||
                    prevMsg.senderId !== msg.senderId ||
                    msg.timestamp.getTime() - new Date(prevMsg.timestamp).getTime() > 300000;
                  const showTimestamp =
                    !prevMsg ||
                    msg.timestamp.getTime() - new Date(prevMsg.timestamp).getTime() > 600000;

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showTimestamp && (
                        <div className="flex items-center gap-3 my-4">
                          <Separator className="flex-1" />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(msg.timestamp)}
                          </span>
                          <Separator className="flex-1" />
                        </div>
                      )}

                      {/* Message row */}
                      <div
                        className={`flex gap-3 group ${mine ? "flex-row-reverse" : "flex-row"} ${
                          !showAvatar ? (mine ? "pr-10" : "pl-10") : ""
                        }`}
                      >
                        {/* Avatar */}
                        {showAvatar && (
                          <div className="shrink-0 mt-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={mine ? user?.avatar : selectedContact.avatar}
                                alt={mine ? user?.name : selectedContact.name}
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(mine ? (user?.name || "Me") : selectedContact.name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}

                        {/* Bubble + actions */}
                        <div className={`flex flex-col max-w-[65%] ${mine ? "items-end" : "items-start"}`}>
                          {showAvatar && (
                            <span className="text-xs text-muted-foreground mb-1 px-1">
                              {mine ? "You" : selectedContact.name}
                            </span>
                          )}

                          <div className="relative group/bubble">
                            {/* Hover actions */}
                            <div
                              className={`absolute top-0 ${
                                mine ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                              } opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1`}
                            >
                              <button
                                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="React"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                              {mine && (
                                <>
                                  <button
                                    onClick={() => handleEditMessage(msg.id, msg.text)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Emoji picker popup */}
                            {showEmojiPicker === msg.id && (
                              <div
                                className={`absolute top-0 z-10 ${
                                  mine ? "right-full mr-2" : "left-full ml-2"
                                } bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1`}
                              >
                                {EMOJI_OPTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="text-lg hover:scale-125 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Message bubble */}
                            {editingMessageId === msg.id ? (
                              <div className="flex flex-col gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit(msg.id);
                                    if (e.key === "Escape") setEditingMessageId(null);
                                  }}
                                  className="text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => setEditingMessageId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => handleSaveEdit(msg.id)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-colors ${
                                  mine
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-muted text-foreground rounded-tl-sm"
                                }`}
                              >
                                {msg.text}
                                {msg.isEdited && (
                                  <span className="text-xs opacity-60 ml-1">(edited)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reactions */}
                          {msg.reactions.length > 0 && (
                            <div className={`flex gap-1 mt-1 flex-wrap ${mine ? "justify-end" : ""}`}>
                              {msg.reactions.map((r) => (
                                <button
                                  key={r.emoji}
                                  onClick={() => handleReaction(msg.id, r.emoji)}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
                                    r.reacted
                                      ? "bg-primary/15 border-primary/30 text-primary"
                                      : "bg-muted border-border hover:bg-muted/80"
                                  }`}
                                >
                                  {r.emoji} {r.count}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Read status for own messages */}
                          {mine && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                              {msg.read ? (
                                <CheckCheck className="h-3 w-3 text-primary" />
                              ) : (
                                <Check className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3 items-end">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedContact.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(selectedContact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-border shrink-0">
            <div className="flex items-end gap-3 bg-muted/50 rounded-2xl px-4 py-2 border border-border focus-within:border-primary/50 focus-within:bg-background transition-all">
              <div className="flex-1 min-w-0">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedContact.name}...`}
                  className="border-0 bg-transparent p-0 focus-visible:ring-0 text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to send
            </p>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
