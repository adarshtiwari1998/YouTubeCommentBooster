import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, RefreshCw, ExternalLink, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Channels() {
  const { toast } = useToast();
  
  const { data: channels, isLoading, refetch } = useQuery({
    queryKey: ["/api/channels"],
  });

  const handleSyncChannel = async (channelId: number) => {
    try {
      await apiRequest("POST", `/api/channels/${channelId}/sync`);
      await refetch();
      toast({
        title: "Sync Started",
        description: "Channel synchronization has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync channel",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      processing: "secondary",
      completed: "default",
      error: "destructive",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <>
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-16 h-16 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-medium text-foreground">Channels</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your YouTube channels and video synchronization
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh All</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6">
          {channels?.map((channel: any) => (
            <Card key={channel.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <Tv className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-medium text-foreground">{channel.name}</h3>
                        {getStatusBadge(channel.status)}
                      </div>
                      <p className="text-muted-foreground mb-2">{channel.handle}</p>
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{channel.totalVideos}</strong> total videos
                        </span>
                        <span>
                          <strong className="text-foreground">{channel.processedVideos}</strong> processed
                        </span>
                        <span>
                          <strong className="text-warning">{channel.totalVideos - channel.processedVideos}</strong> pending
                        </span>
                      </div>
                      
                      {/* Progress */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>{channel.progress || 0}%</span>
                        </div>
                        <Progress value={channel.progress || 0} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={() => handleSyncChannel(channel.id)}
                      size="sm"
                      className="bg-material-blue hover:bg-material-blue-dark text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Videos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://youtube.com/${channel.handle}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Channel
                    </Button>
                  </div>
                </div>

                {/* Channel Stats */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{channel.totalVideos}</p>
                      <p className="text-sm text-muted-foreground">Total Videos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success">{channel.processedVideos}</p>
                      <p className="text-sm text-muted-foreground">Processed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">{channel.totalVideos - channel.processedVideos}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-material-blue">{channel.progress || 0}%</p>
                      <p className="text-sm text-muted-foreground">Complete</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
