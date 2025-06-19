import { useParams } from "wouter";
import VideoManagement from "@/components/VideoManagement";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProcessChannel() {
  const { id } = useParams();
  const channelId = parseInt(id || '0');

  const { data: channel, isLoading } = useQuery({
    queryKey: ["/api/channels", channelId],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Channel Not Found</h1>
        <p className="text-muted-foreground mb-4">The requested channel could not be found.</p>
        <Button onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-medium text-foreground">Video Processing</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {channel.name} - Manage video automation pipeline
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <VideoManagement channelId={channelId} channelName={channel.name} />
      </main>
    </>
  );
}