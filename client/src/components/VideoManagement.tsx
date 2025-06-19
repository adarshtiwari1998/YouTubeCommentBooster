import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, RefreshCw, MessageCircle, ThumbsUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProcessingTimeline from "./ProcessingTimeline";

interface VideoManagementProps {
  channelId: number;
  channelName: string;
}

export default function VideoManagement({ channelId, channelName }: VideoManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: channelStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/channels", channelId, "status"],
    refetchInterval: 5000,
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["/api/channels", channelId, "videos"],
  });

  const { data: queue } = useQuery({
    queryKey: ["/api/videos/queue"],
    queryParams: { channelId },
    refetchInterval: 5000,
  });

  const startProcessing = useMutation({
    mutationFn: () => apiRequest("POST", `/api/channels/${channelId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId] });
      toast({
        title: "Processing Started",
        description: "Channel video processing has been initiated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to start processing",
        variant: "destructive",
      });
    },
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'fetched': return 'bg-blue-500';
      case 'filtered': return 'bg-yellow-500';
      case 'queued': return 'bg-orange-500';
      case 'processing': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'outline',
      fetching: 'secondary',
      fetched: 'default',
      filtering: 'secondary',
      filtered: 'default',
      processing: 'secondary',
      completed: 'default',
      error: 'destructive',
    };
    return variants[status] || 'outline';
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{channelName} - Processing Status</span>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusBadge(channelStatus?.channel?.status)}>
                {channelStatus?.channel?.status || 'pending'}
              </Badge>
              {channelStatus?.isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  Processing...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{channelStatus?.stats?.totalVideos || 0}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{channelStatus?.stats?.fetchedVideos || 0}</p>
              <p className="text-sm text-muted-foreground">Fetched</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{channelStatus?.stats?.filteredVideos || 0}</p>
              <p className="text-sm text-muted-foreground">Filtered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{channelStatus?.stats?.completedVideos || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">{channelStatus?.stats?.commented || 0}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-1" />
                Commented
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-600">{channelStatus?.stats?.liked || 0}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Liked
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-orange-600">{channelStatus?.stats?.commentPending || 0}</p>
              <p className="text-sm text-muted-foreground">Comments Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-orange-600">{channelStatus?.stats?.likePending || 0}</p>
              <p className="text-sm text-muted-foreground">Likes Pending</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>
                  {channelStatus?.stats?.totalVideos > 0 ? 
                    Math.round((channelStatus?.stats?.completedVideos / channelStatus?.stats?.totalVideos) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={channelStatus?.stats?.totalVideos > 0 ? 
                  (channelStatus?.stats?.completedVideos / channelStatus?.stats?.totalVideos) * 100 : 0} 
                className="h-3"
              />
            </div>
            <Button
              onClick={() => startProcessing.mutate()}
              disabled={startProcessing.isPending || channelStatus?.isProcessing}
              className="ml-4"
            >
              {startProcessing.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {channelStatus?.isProcessing ? "Processing..." : "Start Processing"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Processing Timeline</TabsTrigger>
          <TabsTrigger value="videos">Video List</TabsTrigger>
          <TabsTrigger value="queue">Processing Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <ProcessingTimeline channelId={channelId} />
        </TabsContent>

        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <CardTitle>Videos ({videos?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {videosLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : videos?.length > 0 ? (
                  <div className="space-y-3">
                    {videos.map((video: any) => (
                      <div key={video.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{video.title}</h3>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStageColor(video.processingStage)} text-white`}
                            >
                              {video.processingStage}
                            </Badge>
                            {video.hasCommented && (
                              <Badge variant="outline" className="text-xs">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Commented
                              </Badge>
                            )}
                            {video.hasLiked && (
                              <Badge variant="outline" className="text-xs">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Liked
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No videos found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Processing Queue ({queue?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {queue?.length > 0 ? (
                  <div className="space-y-3">
                    {queue.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-gray-100">
                            {item.action === 'comment' ? (
                              <MessageCircle className="h-4 w-4" />
                            ) : (
                              <ThumbsUp className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.action}</p>
                            <p className="text-xs text-muted-foreground">Video: {item.video_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={item.status === 'pending' ? 'outline' : 'default'}>
                            {item.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.scheduled_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items in queue</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}