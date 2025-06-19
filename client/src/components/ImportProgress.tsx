import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, Clock, Download, Filter, Play } from "lucide-react";

interface ImportProgressProps {
  channelId: number;
  channelName: string;
  onImportComplete: () => void;
}

export default function ImportProgress({ channelId, channelName, onImportComplete }: ImportProgressProps) {
  const [importStarted, setImportStarted] = useState(false);

  const { data: channel } = useQuery({
    queryKey: [`/api/channels/${channelId}`],
    refetchInterval: importStarted ? 2000 : false,
  });

  const { data: logs = [] } = useQuery({
    queryKey: [`/api/processing/logs`],
    refetchInterval: importStarted ? 2000 : false,
  });

  const { data: videos = [] } = useQuery({
    queryKey: [`/api/channels/${channelId}/videos`],
    refetchInterval: importStarted ? 5000 : false,
  });

  const startImport = async () => {
    setImportStarted(true);
    try {
      const response = await fetch(`/api/channels/${channelId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to start import');
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'fetching':
        return <Download className="h-4 w-4 text-blue-600" />;
      case 'filtering':
        return <Filter className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Play className="h-4 w-4 text-purple-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const importProgress = channel ? {
    totalVideos: channel.totalVideos || 0,
    fetchedVideos: videos.length || 0,
    progressPercent: channel.totalVideos > 0 ? (videos.length / channel.totalVideos) * 100 : 0,
    isCompleted: channel.status === 'completed' || channel.status === 'fetched'
  } : { totalVideos: 0, fetchedVideos: 0, progressPercent: 0, isCompleted: false };

  useEffect(() => {
    if (importProgress.isCompleted && importStarted) {
      setTimeout(() => {
        onImportComplete();
      }, 3000);
    }
  }, [importProgress.isCompleted, importStarted, onImportComplete]);

  if (!importStarted && (!videos.length || videos.length === 0)) {
    return (
      <div className="space-y-6">
        {/* Channel Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{channelName}</span>
              <Badge variant="outline">Ready for Import</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{channel?.totalVideos || 0}</p>
                <p className="text-sm text-muted-foreground">Total Videos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{channel?.subscriberCount || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Subscribers</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Click "Start Import" to begin importing videos from this channel. 
                This will fetch all videos and prepare them for processing.
              </p>
              <Button 
                onClick={startImport}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Import Progress: {channelName}</span>
            <Badge variant={importProgress.isCompleted ? "default" : "secondary"}>
              {importProgress.isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{importProgress.totalVideos}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{importProgress.fetchedVideos}</p>
              <p className="text-sm text-muted-foreground">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{Math.round(importProgress.progressPercent)}%</p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Import Progress</span>
              <span>{importProgress.fetchedVideos} / {importProgress.totalVideos}</span>
            </div>
            <Progress value={importProgress.progressPercent} className="h-3" />
          </div>

          {importProgress.isCompleted && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Import Completed Successfully!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                All videos have been imported. Redirecting to channel analytics...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Import Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.slice(0, 20).map((log: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(log.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStageIcon(log.stage)}
                        <span className="font-medium text-sm">{log.stage}</span>
                        <Badge variant="outline" className="text-xs">{log.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Waiting for import to begin...</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}