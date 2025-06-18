import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Tv, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChannelsList() {
  const { toast } = useToast();
  
  const { data: channels, isLoading, refetch } = useQuery({
    queryKey: ["/api/channels"],
  });

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Channel data has been refreshed.",
    });
  };

  const handleSyncChannel = async (channelId: number) => {
    try {
      await apiRequest("POST", `/api/channels/${channelId}/sync`);
      await refetch();
      toast({
        title: "Sync Started",
        description: "Channel videos are being synchronized.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync channel",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-success";
      case "processing":
        return "text-warning";
      case "completed":
        return "text-success";
      case "error":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "processing":
        return "Processing";
      case "completed":
        return "Complete";
      case "error":
        return "Error";
      default:
        return "Pending";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-foreground">Channels Status</CardTitle>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="text-material-blue hover:text-material-blue-dark"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {channels?.map((channel: any) => (
            <div key={channel.id} className="p-4 hover:bg-accent/50 transition-colors rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Tv className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{channel.name}</h4>
                    <p className="text-sm text-muted-foreground">{channel.handle}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {channel.totalVideos} videos
                      </span>
                      <span className="text-xs text-warning">
                        {channel.pendingVideos} pending
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      channel.status === "processing" ? "bg-warning animate-pulse" : "bg-success"
                    }`}></div>
                    <span className={`text-sm ${getStatusColor(channel.status)}`}>
                      {getStatusText(channel.status)}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleSyncChannel(channel.id)}
                    variant="ghost"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{channel.progress}%</span>
                </div>
                <Progress value={channel.progress} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
