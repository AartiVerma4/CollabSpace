import { useState, useEffect, useRef, useCallback } from "react";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  Hash,
  Plus,
  Search,
  Smile,
  Paperclip,
  Send,
  MoreHorizontal,
  Pin,
  Star,
  Bell,
  Loader2,
  CheckCheck,
  User,
  Image,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { useApp } from "../contexts/AppContext";
import { chatApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

const DEFAULT_CHANNELS = [
  { id: "general", name: "general", pinned: true },
  { id: "design", name: "design", pinned: false },
  { id: "engineering", name: "engineering", pinned: false },
  { id: "marketing", name: "marketing", pinned: false },
  { id: "random", name: "random", pinned: false },
];

const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "🚀", "🎉", "👀", "🙌"];

interface ChatMessage {
  _id: string;
  channelId: string;
  workspaceId: string;
  authorId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  text: string;
  attachments?: string[];
  createdAt: string;
  reactions?: { emoji: string; count: number; users?: string[] }[];
}

interface OnlineMember {
  userId: string;
  name: string;
  avatar?: string;
  socketId?: string;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamChatPage() {
  const { workspace, user } = useApp();

  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState("general");
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({});

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // { userId: userName }
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // New Channel Modal
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  // Attachment Modal
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Load message history on channel switch ─────────────────────────────────
  useEffect(() => {
    if (!workspace?.id) return;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      setMessages([]);
      try {
        const data = await chatApi.getMessages(workspace.id, selectedChannelId);
        setMessages(data);
        setChannelUnreads((prev) => ({ ...prev, [selectedChannelId]: 0 }));
      } catch (err: any) {
        toast.error("Failed to load messages: " + (err.message || "Unknown error"));
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
    inputRef.current?.focus();
  }, [selectedChannelId, workspace?.id]);

  // ── Socket.IO Collaboration Handlers ──────────────────────────────────────
  useEffect(() => {
    if (!workspace?.id) return;

    const socket = getSocket();
    socketHelpers.joinChat(workspace.id);

    // Heartbeat
    socketHelpers.emitPresenceHeartbeat(workspace.id);
    const heartbeatInterval = setInterval(
      () => socketHelpers.emitPresenceHeartbeat(workspace.id),
      30000
    );

    // Incoming Chat Message
    const handleIncomingMessage = (msg: ChatMessage) => {
      if (msg.channelId === selectedChannelId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        setChannelUnreads((prev) => ({
          ...prev,
          [msg.channelId]: (prev[msg.channelId] || 0) + 1,
        }));
      }
    };

    // Presence update
    const handlePresenceUpdate = (members: OnlineMember[]) => {
      setOnlineMembers(members);
    };

    // Typing Indicators
    const handleTyping = ({ channelId, userId, userName }: any) => {
      if (channelId === selectedChannelId && userId !== user?.id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
      }
    };

    const handleStopTyping = ({ channelId, userId }: any) => {
      if (channelId === selectedChannelId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    // Message Reaction
    const handleReaction = ({ messageId, emoji, userId }: any) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;
          const existingReactions = msg.reactions || [];
          const rIndex = existingReactions.findIndex((r) => r.emoji === emoji);

          let updatedReactions = [...existingReactions];
          if (rIndex !== -1) {
            updatedReactions[rIndex] = {
              ...updatedReactions[rIndex],
              count: updatedReactions[rIndex].count + 1,
            };
          } else {
            updatedReactions.push({ emoji, count: 1, users: [userId] });
          }

          return { ...msg, reactions: updatedReactions };
        })
      );
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:stop-typing", handleStopTyping);
    socket.on("chat:reaction", handleReaction);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("chat:message", handleIncomingMessage);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:stop-typing", handleStopTyping);
      socket.off("chat:reaction", handleReaction);
    };
  }, [workspace?.id, selectedChannelId, user?.id]);

  // Handle typing status broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!workspace?.id || !user?.name) return;

    socketHelpers.emitTyping(workspace.id, selectedChannelId, user.name);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketHelpers.emitStopTyping(workspace.id, selectedChannelId);
    }, 2000);
  };

  // Send message
  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !workspace?.id || isSending) return;

    const text = message.trim();
    const currentAttachments = [...attachments];
    setMessage("");
    setAttachments([]);
    setIsSending(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketHelpers.emitStopTyping(workspace.id, selectedChannelId);

    try {
      const savedMsg: ChatMessage = await chatApi.postMessage({
        workspaceId: workspace.id,
        channelId: selectedChannelId,
        text: text || "Attached file:",
        attachments: currentAttachments,
      });

      setMessages((prev) => {
        if (prev.some((m) => m._id === savedMsg._id)) return prev;
        return [...prev, savedMsg];
      });

      socketHelpers.emitChatMessage(workspace.id, savedMsg);
    } catch (err: any) {
      toast.error("Failed to send message: " + (err.message || "Unknown error"));
      setMessage(text);
      setAttachments(currentAttachments);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Add emoji reaction
  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!workspace?.id || !user?.id) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;
        const existingReactions = msg.reactions || [];
        const rIndex = existingReactions.findIndex((r) => r.emoji === emoji);

        let updatedReactions = [...existingReactions];
        if (rIndex !== -1) {
          updatedReactions[rIndex] = {
            ...updatedReactions[rIndex],
            count: updatedReactions[rIndex].count + 1,
          };
        } else {
          updatedReactions.push({ emoji, count: 1, users: [user.id] });
        }

        return { ...msg, reactions: updatedReactions };
      })
    );

    socketHelpers.emitReaction(workspace.id, messageId, emoji, user.id);
  };

  // Create Channel
  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    const cleanName = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    const newChan = { id: cleanName, name: cleanName, pinned: false };

    setChannels((prev) => [...prev, newChan]);
    setSelectedChannelId(cleanName);
    setNewChannelName("");
    setShowNewChannelModal(false);
    toast.success(`Channel #${cleanName} created!`);
  };

  // Add attachment
  const handleAddAttachment = () => {
    if (!attachmentUrlInput.trim()) return;
    setAttachments((prev) => [...prev, attachmentUrlInput.trim()]);
    setAttachmentUrlInput("");
    setShowAttachmentModal(false);
    toast.success("File attached to message!");
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const isDirectMessage = selectedChannelId.startsWith("dm_");
  const dmTargetMember = isDirectMessage
    ? onlineMembers.find((m) => `dm_${m.userId}` === selectedChannelId) || workspace?.members?.find((m: any) => `dm_${m.userId?._id || m.userId}` === selectedChannelId)
    : null;

  const membersToShow: OnlineMember[] =
    onlineMembers.length > 0
      ? onlineMembers
      : (workspace?.members || []).map((m: any) => ({
          userId: m.userId?._id || m.userId,
          name: m.userId?.name || "Member",
          avatar: m.userId?.avatar,
        }));

  const filteredMessages = messages.filter((msg) =>
    (msg.text || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typingNames = Object.values(typingUsers);

  return (
    <WorkspaceLayout>
      <div className="h-full flex">
        {/* ── Channels & DMs Sidebar ─────────────────────────────────────── */}
        <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
          <div className="p-4">
            <Button
              className="w-full rounded-xl justify-start gap-2 cursor-pointer"
              onClick={() => setShowNewChannelModal(true)}
            >
              <Plus className="h-4 w-4" />
              New Channel
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2">
            {/* Public Channels */}
            <div className="space-y-1">
              <div className="px-3 py-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Channels
                </h3>
              </div>
              {channels.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start rounded-xl gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedChannelId(channel.id);
                    setChannelUnreads((prev) => ({ ...prev, [channel.id]: 0 }));
                  }}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{channel.name}</span>
                  {(channelUnreads[channel.id] || 0) > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full"
                    >
                      {channelUnreads[channel.id]}
                    </Badge>
                  )}
                  {channel.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                </Button>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Direct Messages */}
            <div className="space-y-1">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Direct Messages
                </h3>
              </div>
              {membersToShow.map((member) => {
                const dmId = `dm_${member.userId}`;
                const isSelected = selectedChannelId === dmId;

                return (
                  <Button
                    key={member.userId}
                    variant={isSelected ? "secondary" : "ghost"}
                    className="w-full justify-start rounded-xl gap-2 cursor-pointer"
                    onClick={() => {
                      setSelectedChannelId(dmId);
                      setChannelUnreads((prev) => ({ ...prev, [dmId]: 0 }));
                    }}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                    </div>
                    <span className="flex-1 text-left text-sm truncate">{member.name}</span>
                    {(channelUnreads[dmId] || 0) > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                        {channelUnreads[dmId]}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* ── Main Chat Area ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-16 border-b px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {isDirectMessage ? (
                <User className="h-5 w-5 text-indigo-500" />
              ) : (
                <Hash className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h2 className="font-semibold capitalize">
                  {isDirectMessage
                    ? `Direct Message · ${dmTargetMember?.name || (dmTargetMember as any)?.userId?.name || "Team Member"}`
                    : selectedChannel?.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isDirectMessage
                    ? "Private 1-on-1 collaboration chat"
                    : `${membersToShow.length} member${membersToShow.length !== 1 ? "s" : ""} active`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showSearchInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search in chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs rounded-xl w-48"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setShowSearchInput(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setShowSearchInput(true)}>
                  <Search className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Stream */}
          <ScrollArea className="flex-1 p-6">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Loading messages…</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Hash className="h-12 w-12 mb-4 opacity-30 text-primary" />
                <p className="font-semibold text-foreground text-lg">
                  Welcome to #{isDirectMessage ? "Direct Message" : selectedChannel?.name}!
                </p>
                <p className="text-sm mt-1">
                  Start collaborating live with your team in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredMessages.map((msg) => {
                  const author = msg.authorId;
                  const isOwn = author?._id === user?.id;

                  return (
                    <div key={msg._id} className="flex gap-3 group">
                      <Avatar className="shrink-0 mt-0.5 border">
                        <AvatarImage src={author?.avatar} alt={author?.name} />
                        <AvatarFallback className="text-xs">
                          {author?.name ? getInitials(author.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className={`font-semibold text-sm ${isOwn ? "text-primary font-bold" : ""}`}>
                            {author?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isOwn && (
                            <CheckCheck className="h-3.5 w-3.5 text-green-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>

                        <p className="text-sm leading-relaxed break-words bg-muted/20 p-3 rounded-2xl border border-transparent hover:border-border transition-all">
                          {msg.text}
                        </p>

                        {/* File Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {msg.attachments.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-xl bg-indigo-500/10 border border-indigo-200 text-xs font-medium text-indigo-600 hover:underline"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>Attachment #{i + 1}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Emoji Reactions */}
                        <div className="flex items-center gap-1 flex-wrap mt-2">
                          {msg.reactions?.map((reaction, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 rounded-full gap-1 text-xs cursor-pointer hover:bg-primary/10"
                              onClick={() => handleAddReaction(msg._id, reaction.emoji)}
                            >
                              <span>{reaction.emoji}</span>
                              <span className="font-semibold text-[11px]">{reaction.count}</span>
                            </Button>
                          ))}

                          {/* Quick Emoji Picker Buttons on Hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                            {EMOJI_OPTIONS.slice(0, 4).map((emoji) => (
                              <button
                                key={emoji}
                                className="hover:scale-125 transition-transform p-1 text-xs cursor-pointer"
                                onClick={() => handleAddReaction(msg._id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Typing Indicator Bar */}
          {typingNames.length > 0 && (
            <div className="px-6 py-1 text-xs text-muted-foreground italic flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>
                <strong>{typingNames.join(", ")}</strong> {typingNames.length === 1 ? "is" : "are"} typing…
              </span>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-6 py-2 border-t flex gap-2 bg-muted/20">
              {attachments.map((att, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-2 py-1 rounded-lg">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{att}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3 ml-1" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t p-4 shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder={
                    isDirectMessage
                      ? `Message ${dmTargetMember?.name || "Member"}...`
                      : `Message #${selectedChannel?.name}...`
                  }
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="rounded-xl pr-20 py-3"
                  disabled={isSending}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg cursor-pointer"
                    type="button"
                    onClick={() => setShowAttachmentModal(true)}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                className="rounded-xl shrink-0 cursor-pointer"
                onClick={sendMessage}
                disabled={(!message.trim() && attachments.length === 0) || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Press <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded">Enter</kbd> to send · Live collaboration enabled
            </p>
          </div>
        </div>

        {/* ── Members Sidebar ────────────────────────────────────────────── */}
        <div className="w-60 border-l bg-muted/20 shrink-0">
          <div className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block animate-pulse" />
              Collaborators ({membersToShow.length})
            </h3>
            <div className="space-y-2">
              {membersToShow.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedChannelId(`dm_${member.userId}`);
                  }}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {member.userId === user?.id ? "You · Online" : "Online"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Channel Modal */}
      <Dialog open={showNewChannelModal} onOpenChange={setShowNewChannelModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Channel Name</label>
              <Input
                placeholder="e.g. project-roadmap, feedback, launches"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowNewChannelModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
              Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Modal */}
      <Dialog open={showAttachmentModal} onOpenChange={setShowAttachmentModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Attach File / Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">File URL / Image Link</label>
              <Input
                placeholder="https://example.com/file.png"
                value={attachmentUrlInput}
                onChange={(e) => setAttachmentUrlInput(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowAttachmentModal(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleAddAttachment} disabled={!attachmentUrlInput.trim()}>
              Add Attachment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
}
