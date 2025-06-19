import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, MessageSquare, ThumbsUp, Eye, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";

export default function ChannelAnalytics() {
  const { channelId } = useParams();

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: [`/api/channels/${channelId}`],
    enabled: !!channelId,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: [`/api/channels/${channelId}/videos`],
    enabled: !!channelId,
  });

  const { data: processingLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: [`/api/processing/logs`, channelId],
    enabled: !!channelId,
  });

  const { data: channelStatus } = useQuery({
    queryKey: [`/api/channels/${channelId}/status`],
    enabled: !!channelId,
  });

  if (channelLoading) {
    return <div className="p-6">Loading channel information...</div>;
  }

  if (!channel) {
    return <div className="p-6">Channel not found</div>;
  }

  const totalVideos = videos.length || 0;
  const processedVideos = videos.filter((v: any) => v.status === 'completed')?.length || 0;
  const commentsPosted = videos.filter((v: any) => v.hasCommented)?.length || 0;
  const likesGiven = videos.filter((v: any) => v.hasLiked)?.length || 0;
  const pendingVideos = videos.filter((v: any) => v.status === 'pending')?.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          {channel?.thumbnailUrl && (
            <img
              src={channel.thumbnailUrl}
              alt={channel.name || 'Channel'}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{channel?.name || 'Channel'}</h1>
            <p className="text-muted-foreground">{channel?.handle || channel?.channelId}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              {processedVideos} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments Posted</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commentsPosted}</div>
            <p className="text-xs text-muted-foreground">
              {totalVideos > 0 ? Math.round((commentsPosted / totalVideos) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Likes Given</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{likesGiven}</div>
            <p className="text-xs text-muted-foreground">
              {totalVideos > 0 ? Math.round((likesGiven / totalVideos) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVideos}</div>
            <p className="text-xs text-muted-foreground">
              Videos waiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div>Loading processing logs...</div>
          ) : processingLogs.length > 0 ? (
            <div className="space-y-4">
              {processingLogs.slice(0, 10).map((log: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)}`} />
                  <div className="flex-1">
                    <p className="font-medium">{log.stage}</p>
                    <p className="text-sm text-muted-foreground">{log.message}</p>
                  </div>
                  <Badge variant="outline">{log.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No processing logs available</p>
          )}
        </CardContent>
      </Card>

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div>Loading videos...</div>
          ) : videos.length > 0 ? (
            <div className="space-y-4">
              {videos.map((video: any) => (
                <div key={video.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(video.status)}`} />
                  <div className="flex-1">
                    <h3 className="font-medium">{video.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Published: {new Date(video.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {video.hasCommented && (
                      <Badge variant="secondary">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Commented
                      </Badge>
                    )}
                    {video.hasLiked && (
                      <Badge variant="secondary">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Liked
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">{video.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No videos found for this channel</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}