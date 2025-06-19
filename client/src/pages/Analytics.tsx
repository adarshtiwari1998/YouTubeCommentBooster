import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Calendar, Target, Activity, Clock } from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: channels } = useQuery({
    queryKey: ["/api/channels"],
  });

  const { data: activity } = useQuery({
    queryKey: ["/api/activity"],
  });

  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
  });

  const totalInteractions = activity?.length || 0;
  const successfulInteractions = activity?.filter((log: any) => log.type === "success").length || 0;
  const failedInteractions = activity?.filter((log: any) => log.type === "error").length || 0;

  const successRate = totalInteractions > 0 ? (successfulInteractions / totalInteractions) * 100 : 0;

  const getChannelProgress = (channel: any) => {
    return channel.totalVideos > 0 ? (channel.processedVideos / channel.totalVideos) * 100 : 0;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor performance and track automation metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Channels</p>
                <p className="text-2xl font-bold">{stats?.totalChannels || 0}</p>
                <p className="text-xs text-green-600">+{channels?.filter((c: any) => c.isActive).length || 0} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{Math.round(successRate)}%</p>
                <p className="text-xs text-muted-foreground">{successfulInteractions}/{totalInteractions} successful</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Interactions</p>
                <p className="text-2xl font-bold">{totalInteractions}</p>
                <p className="text-xs text-muted-foreground">Comments & likes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Videos</p>
                <p className="text-2xl font-bold">{stats?.pendingVideos || 0}</p>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>YouTube API Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Daily Quota</span>
                  <span>{systemStatus?.youtube?.quotaUsed || 0} / 10,000</span>
                </div>
                <Progress value={systemStatus?.youtube?.quotaPercentage || 0} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                <Badge variant={systemStatus?.youtube?.status === "connected" ? "default" : "secondary"}>
                  {systemStatus?.youtube?.status || "disconnected"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Gemini AI Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Requests Today</span>
                  <span>{systemStatus?.gemini?.quotaUsed || 0}</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                <Badge variant={systemStatus?.gemini?.status === "connected" ? "default" : "secondary"}>
                  {systemStatus?.gemini?.status || "disconnected"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channels?.map((channel: any) => (
              <div key={channel.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium">{channel.name}</h3>
                    <Badge variant={channel.status === "active" ? "default" : "secondary"}>
                      {channel.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(getChannelProgress(channel))}% complete
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{channel.totalVideos}</p>
                    <p className="text-xs text-muted-foreground">Total Videos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{channel.processedVideos}</p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-orange-600">{channel.totalVideos - channel.processedVideos}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                
                <Progress value={getChannelProgress(channel)} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}