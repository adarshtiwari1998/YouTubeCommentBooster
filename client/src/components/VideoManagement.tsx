import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, MessageSquare, ThumbsUp, ExternalLink, Play, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VideoManagementProps {
  channelId: number;
  channelName: string;
}

export default function VideoManagement({ channelId, channelName }: VideoManagementProps) {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["/api/channels", channelId, "videos"],
    enabled: !!channelId,
  });

  const { data: analysisData, isLoading: isAnalyzing } = useQuery({
    queryKey: ["/api/channels", channelId, "analyze"],
    enabled: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/channels/${channelId}/analyze`),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/channels", channelId, "analyze"], data);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.videosNeedingAction} videos that need your attention.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze channel videos",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/channels/${channelId}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Sync Complete",
        description: "Channel videos have been synchronized successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync channel videos",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (video: any) => {
    if (video.userHasCommented && video.userHasLiked) {
      return <Badge variant="default" className="bg-success text-white">Complete</Badge>;
    }
    if (video.userHasCommented && !video.userHasLiked) {
      return <Badge variant="secondary">Needs Like</Badge>;
    }
    if (!video.userHasCommented && video.userHasLiked) {
      return <Badge variant="secondary">Needs Comment</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const filteredVideos = videos?.filter((video: any) => {
    switch (activeTab) {
      case "needsComment":
        return !video.userHasCommented;
      case "needsLike":
        return !video.userHasLiked;
      case "completed":
        return video.userHasCommented && video.userHasLiked;
      default:
        return true;
    }
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="w-24 h-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
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
          <CardTitle className="text-lg font-medium text-foreground">
            {channelName} - Video Management
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-material-blue hover:bg-material-blue-dark text-white"
              size="sm"
            >
              <Video className="h-4 w-4 mr-2" />
              {syncMutation.isPending ? "Syncing..." : "Sync Videos"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {analysisData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{analysisData.totalVideos}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{analysisData.videosNeedingAction}</p>
              <p className="text-sm text-muted-foreground">Need Action</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-material-blue">{analysisData.videosNeedingComment}</p>
              <p className="text-sm text-muted-foreground">Need Comment</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{analysisData.videosNeedingLike}</p>
              <p className="text-sm text-muted-foreground">Need Like</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Videos</TabsTrigger>
            <TabsTrigger value="needsComment">Need Comment</TabsTrigger>
            <TabsTrigger value="needsLike">Need Like</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Videos Found</h3>
                <p className="text-muted-foreground">
                  {activeTab === "all" 
                    ? "No videos available. Try syncing the channel first."
                    : `No videos found in the ${activeTab.replace(/([A-Z])/g, ' $1').toLowerCase()} category.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVideos.map((video: any) => (
                  <div key={video.videoId} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    {/* Video Thumbnail */}
                    <div className="relative w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate" title={video.title}>
                        {video.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Published: {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        {video.viewCount && (
                          <span className="text-xs text-muted-foreground">
                            {parseInt(video.viewCount).toLocaleString()} views
                          </span>
                        )}
                        {video.duration && (
                          <span className="text-xs text-muted-foreground">
                            Duration: {video.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Engagement Status */}
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className={`p-1 rounded ${video.userHasCommented ? 'bg-success text-white' : 'bg-muted'}`}>
                          <MessageSquare className="h-3 w-3" />
                        </div>
                        <div className={`p-1 rounded ${video.userHasLiked ? 'bg-success text-white' : 'bg-muted'}`}>
                          <ThumbsUp className="h-3 w-3" />
                        </div>
                      </div>
                      {getStatusBadge(video)}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`https://youtube.com/watch?v=${video.videoId}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}