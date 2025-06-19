import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, AlertCircle, Info, Play } from "lucide-react";

interface ProcessingTimelineProps {
  channelId?: number;
}

export default function ProcessingTimeline({ channelId }: ProcessingTimelineProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/processing/logs", channelId],
    queryParams: channelId ? { channelId } : undefined,
    refetchInterval: 5000, // Update every 5 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'info': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5" />
          <span>Processing Timeline</span>
          {logs?.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {logs.length} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {logs?.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log: any, index: number) => (
                <div key={log.id || index} className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${getStatusColor(log.status)}`}>
                        {log.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.message}
                    </p>
                    {log.video_id && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Video: {log.video_id}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No processing activity yet</p>
              <p className="text-sm">Start channel processing to see timeline updates</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}