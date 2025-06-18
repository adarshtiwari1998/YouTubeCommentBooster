import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Brain, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export default function SystemStatus() {
  const { data: systemStatus, isLoading } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activity"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "connected":
      case "operational":
        return <div className="w-2 h-2 bg-success rounded-full"></div>;
      case "running":
        return <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>;
      case "disconnected":
      case "stopped":
        return <div className="w-2 h-2 bg-error rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-warning rounded-full"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "operational":
        return "Operational";
      case "running":
        return "Running";
      case "disconnected":
        return "Disconnected";
      case "stopped":
        return "Stopped";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "operational":
      case "running":
        return "text-success";
      case "disconnected":
      case "stopped":
        return "text-error";
      default:
        return "text-warning";
    }
  };

  const recentErrors = activities?.filter((activity: any) => 
    activity.type === "error" && 
    new Date(activity.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-foreground">
            System Status & Errors
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusIndicator("operational")}
            <span className="text-sm text-muted-foreground">All systems operational</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* YouTube API Status */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="h-5 w-5 text-success" />
              <span className="font-medium text-foreground">API Status</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">YouTube Data API v3</p>
            <div className="flex items-center space-x-2">
              {getStatusIndicator(systemStatus?.youtube?.status || "disconnected")}
              <span className={`text-xs font-medium ${getStatusColor(systemStatus?.youtube?.status || "disconnected")}`}>
                {getStatusText(systemStatus?.youtube?.status || "disconnected")}
              </span>
            </div>
          </div>

          {/* Gemini AI Status */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="h-5 w-5 text-material-blue" />
              <span className="font-medium text-foreground">Gemini AI</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Comment Generation</p>
            <div className="flex items-center space-x-2">
              {getStatusIndicator(systemStatus?.gemini?.status || "disconnected")}
              <span className={`text-xs font-medium ${getStatusColor(systemStatus?.gemini?.status || "disconnected")}`}>
                {getStatusText(systemStatus?.gemini?.status || "disconnected")}
              </span>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="font-medium text-foreground">Rate Limits</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">API Quota Usage</p>
            <div className="flex items-center space-x-2">
              {getStatusIndicator(systemStatus?.youtube?.quotaPercentage > 80 ? "warning" : "operational")}
              <span className={`text-xs font-medium ${
                systemStatus?.youtube?.quotaPercentage > 80 ? "text-warning" : "text-success"
              }`}>
                {systemStatus?.youtube?.quotaPercentage || 0}% Used
              </span>
            </div>
          </div>
        </div>

        {/* Recent Issues */}
        <div>
          <h4 className="font-medium text-foreground mb-3">Recent Issues</h4>
          <div className="space-y-2">
            {recentErrors.length === 0 ? (
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">No recent errors</p>
                  <p className="text-xs text-muted-foreground">System running smoothly</p>
                </div>
              </div>
            ) : (
              recentErrors.slice(0, 3).map((error: any) => (
                <div key={error.id} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-error" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error">System Error</p>
                    <p className="text-xs text-muted-foreground">{error.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(error.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
