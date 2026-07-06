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
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import { useApp } from "../contexts/AppContext";
import { chatApi } from "../../lib/api";
import { getSocket, socketHelpers } from "../../lib/socket";
import { toast } from "sonner";

// Default workspace channels
const DEFAULT_CHANNELS = [
  { id: "general", name: "general", pinned: true },
  { id: "design", name: "design", pinned: false },
  { id: "engineering", name: "engineering", pinned: false },
  { id: "marketing", name: "marketing", pinned: false },
  { id: "random", name: "random", pinned: false },
];

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
  attachments: string[];
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
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

  const [selectedChannelId, setSelectedChannelId] = useState("general");
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom whenever messages change ──────────────────────────────
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
        // Clear unread badge on channel open
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

  // ── Socket.IO: join workspace chat room & handle events ────────────────────
  useEffect(() => {
    if (!workspace?.id) return;

    const socket = getSocket();
    socketHelpers.joinChat(workspace.id);

    // Start presence heartbeat
    socketHelpers.emitPresenceHeartbeat(workspace.id);
    const heartbeatInterval = setInterval(
      () => socketHelpers.emitPresenceHeartbeat(workspace.id),
      30000
    );

    // Incoming message from other clients
    const handleIncomingMessage = (msg: ChatMessage) => {
      if (msg.channelId === selectedChannelId) {
        setMessages((prev) => {
          // Deduplicate by _id in case REST and socket race
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        // Badge unread count for inactive channels
        setChannelUnreads((prev) => ({
          ...prev,
          [msg.channelId]: (prev[msg.channelId] || 0) + 1,
        }));
      }
    };

    // Presence members list update
    const handlePresenceUpdate = (members: OnlineMember[]) => {
      setOnlineMembers(members);
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("chat:message", handleIncomingMessage);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [workspace?.id, selectedChannelId]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!message.trim() || !workspace?.id || isSending) return;

    const text = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      // POST via REST to persist in MongoDB
      const savedMsg: ChatMessage = await chatApi.postMessage({
        workspaceId: workspace.id,
        channelId: selectedChannelId,
        text,
      });

      // Optimistically append to local list (REST saved message is source of truth)
      setMessages((prev) => {
        if (prev.some((m) => m._id === savedMsg._id)) return prev;
        return [...prev, savedMsg];
      });

      // Broadcast to other clients via socket
      socketHelpers.emitChatMessage(workspace.id, savedMsg);
    } catch (err: any) {
      toast.error("Failed to send message: " + (err.message || "Unknown error"));
      setMessage(text); // restore on failure
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChannelSwitch = (channelId: string) => {
    setSelectedChannelId(channelId);
    setChannelUnreads((prev) => ({ ...prev, [channelId]: 0 }));
  };

  const selectedChannel = DEFAULT_CHANNELS.find((c) => c.id === selectedChannelId);

  // Members to show in sidebar: prefer presence list, fall back to workspace members
  const membersToShow: OnlineMember[] =
    onlineMembers.length > 0
      ? onlineMembers
      : (workspace?.members || []).slice(0, 8).map((m: any) => ({
          userId: m.userId?._id || m.userId,
          name: m.userId?.name || "Member",
          avatar: m.userId?.avatar,
        }));

  return (
    <WorkspaceLayout>
      <div className="h-full flex">
        {/* ── Channels Sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
          <div className="p-4">
            <Button className="w-full rounded-xl justify-start gap-2">
              <Plus className="h-4 w-4" />
              New Channel
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Channels
                </h3>
              </div>
              {DEFAULT_CHANNELS.map((channel) => (
                <Button
                  key={channel.id}
                  variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start rounded-xl gap-2"
                  onClick={() => handleChannelSwitch(channel.id)}
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

            <div className="space-y-1">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Direct Messages
                </h3>
              </div>
              {membersToShow.slice(0, 5).map((member) => (
                <Button
                  key={member.userId}
                  variant="ghost"
                  className="w-full justify-start rounded-xl gap-2"
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
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ── Chat Area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="h-16 border-b px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">{selectedChannel?.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {membersToShow.length > 0
                    ? `${membersToShow.length} member${membersToShow.length !== 1 ? "s" : ""} online`
                    : workspace?.members?.length
                    ? `${workspace.members.length} member${workspace.members.length !== 1 ? "s" : ""}`
                    : "Team channel"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Search className="h-4 w-4" />
              </Button>
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

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Hash className="h-12 w-12 mb-4 opacity-30" />
                <p className="font-semibold text-foreground">
                  Welcome to #{selectedChannel?.name}!
                </p>
                <p className="text-sm mt-1">
                  This is the beginning of the #{selectedChannel?.name} channel.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  const author = msg.authorId;
                  const isOwn = author?._id === user?.id;
                  return (
                    <div key={msg._id} className="flex gap-3 group">
                      <Avatar className="shrink-0 mt-0.5">
                        <AvatarImage src={author?.avatar} alt={author?.name} />
                        <AvatarFallback className="text-xs">
                          {author?.name ? getInitials(author.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className={`font-semibold text-sm ${isOwn ? "text-primary" : ""}`}>
                            {author?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isOwn && (
                            <CheckCheck className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <p className="text-sm leading-relaxed break-words">
                          {msg.text}
                        </p>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {msg.reactions.map((reaction, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 rounded-full gap-1"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-xs">{reaction.count}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                        {/* Quick-add reaction on hover */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                        >
                          <Smile className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4 shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder={`Message #${selectedChannel?.name}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="rounded-xl pr-20"
                  disabled={isSending}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" type="button">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" type="button">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                className="rounded-xl shrink-0"
                onClick={sendMessage}
                disabled={!message.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>@mention</strong> someone to notify them · Press{" "}
              <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd> to send
            </p>
          </div>
        </div>

        {/* ── Members Sidebar ──────────────────────────────────────────────── */}
        <div className="w-60 border-l bg-muted/20 shrink-0">
          <div className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              Online ({membersToShow.length})
            </h3>
            <div className="space-y-2">
              {membersToShow.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.userId === user?.id ? "You · Available" : "Available"}
                    </p>
                  </div>
                </div>
              ))}
              {membersToShow.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No members online
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
