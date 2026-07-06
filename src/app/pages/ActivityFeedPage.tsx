import { useState, useEffect } from "react";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { FileText, Palette, MessageSquare, UserPlus, Settings2, Filter, Loader2 } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { workspaceApi } from "../../lib/api";
import { toast } from "sonner";

type ActivityType = "document" | "board" | "member" | "settings" | "chat" | "all";

interface ActivityItem {
  _id: string;
  type: string;
  actorName?: string;
  actorAvatar?: string;
  action: string;
  targetName?: string;
  createdAt: string;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "document": return FileText;
    case "board": return Palette;
    case "chat": return MessageSquare;
    case "member": return UserPlus;
    case "settings": return Settings2;
    default: return FileText;
  }
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string = ""): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Static fallback activities shown when API returns empty
const STATIC_ACTIVITIES: ActivityItem[] = [
  {
    _id: "s1",
    type: "document",
    actorName: "System",
    action: "Your workspace is ready. Start creating documents and boards!",
    targetName: "",
    createdAt: new Date().toISOString(),
  },
];

export function ActivityFeedPage() {
  const { workspace } = useApp();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>("all");

  useEffect(() => {
    if (!workspace?.id) return;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const data = await workspaceApi.getActivityFeed(workspace.id);
        setActivities(data.length > 0 ? data : STATIC_ACTIVITIES);
      } catch (err: any) {
        // Fall back gracefully to static placeholder
        setActivities(STATIC_ACTIVITIES);
        console.warn("Activity feed unavailable:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [workspace?.id]);

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter);

  return (
    <WorkspaceLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
          <p className="text-muted-foreground">
            Stay up to date with everything happening in your workspace
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Tabs
            defaultValue="all"
            className="flex-1"
            onValueChange={(val) => setFilter(val as ActivityType)}
          >
            <TabsList className="rounded-xl">
              <TabsTrigger value="all" className="rounded-lg">All Activity</TabsTrigger>
              <TabsTrigger value="chat" className="rounded-lg">Mentions</TabsTrigger>
              <TabsTrigger value="document" className="rounded-lg">Documents</TabsTrigger>
              <TabsTrigger value="board" className="rounded-lg">Boards</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" className="rounded-xl gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {workspace?.name ? `Activity in ${workspace.name}` : "Activity from the last 7 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-30" />
                  <p className="font-medium text-foreground">No activity yet</p>
                  <p className="text-sm mt-1">
                    Activity will appear here as your team collaborates.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div
                        key={activity._id}
                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-accent transition-colors cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.actorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold">{activity.actorName || "Someone"}</span>{" "}
                            <span className="text-muted-foreground">{activity.action}</span>
                            {activity.targetName && (
                              <>
                                {" "}
                                <span className="font-semibold">{activity.targetName}</span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  );
}
