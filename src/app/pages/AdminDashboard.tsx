import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users,
  FileText,
  Activity,
  TrendingUp,
  BarChart3,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { ScrollArea } from "../components/ui/scroll-area";

const userGrowthData = [
  { month: "Jan", users: 45 },
  { month: "Feb", users: 52 },
  { month: "Mar", users: 61 },
  { month: "Apr", users: 75 },
  { month: "May", users: 88 },
  { month: "Jun", users: 102 },
];

const documentActivityData = [
  { day: "Mon", created: 12, edited: 45 },
  { day: "Tue", created: 15, edited: 52 },
  { day: "Wed", created: 18, edited: 48 },
  { day: "Thu", created: 14, edited: 61 },
  { day: "Fri", created: 20, edited: 55 },
  { day: "Sat", created: 8, edited: 22 },
  { day: "Sun", created: 6, edited: 18 },
];

const recentLogs = [
  { id: "1", action: "User login", user: "sarah@collabspace.com", time: "2 min ago", status: "success" },
  { id: "2", action: "Document created", user: "alex@collabspace.com", time: "5 min ago", status: "success" },
  { id: "3", action: "Settings updated", user: "maria@collabspace.com", time: "12 min ago", status: "success" },
  { id: "4", action: "Failed login attempt", user: "unknown@example.com", time: "15 min ago", status: "failed" },
  { id: "5", action: "Member invited", user: "david@collabspace.com", time: "22 min ago", status: "success" },
  { id: "6", action: "Workspace created", user: "emma@collabspace.com", time: "35 min ago", status: "success" },
];

export function AdminDashboard() {
  return (
    <WorkspaceLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your CollabSpace organization
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Users</CardDescription>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">102</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+16% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Active Workspaces</CardDescription>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">24</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+8% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Documents</CardDescription>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">1,247</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+23% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Activity Score</CardDescription>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">94%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Very high engagement</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="users" className="rounded-lg">User Analytics</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg">Activity</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Total users over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#4f46e5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Document Activity</CardTitle>
                <CardDescription>Documents created and edited this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={documentActivityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="created" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="edited" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-sm">Created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Edited</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Recent system activities and events</CardDescription>
                  </div>
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 rounded-xl border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">{log.user}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {log.time}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              log.status === "success"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceLayout>
  );
}
