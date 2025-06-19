import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Tv, ChevronRight, Trash2, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddChannelDialog from "./AddChannelDialog";

export default function ChannelsList() {
  const { toast } = useToast();
  
  const { data: channels = [], isLoading, refetch } = useQuery({
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

  const handleDeleteChannel = async (channelId: number) => {
    try {
      await apiRequest("DELETE", `/api/channels/${channelId}`);
      await refetch();
      toast({
        title: "Channel Removed",
        description: "Channel has been removed from automation.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete channel",
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
        {channels.length > 0 ? (
          <div className="space-y-4">
            {channels.map((channel: any) => (
              <div key={channel.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                      {channel.thumbnailUrl ? (
                        <img
                          src={channel.thumbnailUrl}
                          alt={channel.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Tv className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{channel.name}</h3>
                      <p className="text-sm text-muted-foreground">{channel.handle}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Videos:</span>
                          <span className="font-medium">{channel.totalVideos || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fetched:</span>
                          <span className="font-medium text-blue-600">{channel.fetchedVideos || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processed:</span>
                          <span className="font-medium text-green-600">{channel.completedVideos || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`font-medium text-xs px-2 py-1 rounded ${
                            channel.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            channel.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            channel.status === 'fetching' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {channel.status || 'pending'}
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={channel.totalVideos > 0 ? ((channel.completedVideos || 0) / channel.totalVideos) * 100 : 0} 
                        className="mt-3 h-2"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      onClick={() => window.location.href = `/channel/${channel.id}`}
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                    >
                      View Channel
                    </Button>
                    <Button
                      onClick={() => handleSyncChannel(channel.id)}
                      variant="outline"
                      size="sm"
                      className="min-w-[120px]"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                    <Button
                      onClick={() => window.open(`https://youtube.com/${channel.handle}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="min-w-[120px]"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Channel
                    </Button>
                    <Button
                      onClick={() => handleDeleteChannel(channel.id)}
                      variant="destructive"
                      size="sm"
                      className="min-w-[120px]"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No channels added yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first YouTube channel to start automating comments and likes
            </p>
            <AddChannelDialog />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
