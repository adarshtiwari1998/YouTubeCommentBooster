import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Bot } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { useToast } from "@/hooks/use-toast";

export default function AutomationControls() {
  const { toast } = useToast();
  const { startAutomation, stopAutomation, updateSettings } = useAutomation();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/automation/settings"],
    refetchInterval: 5000,
  });

  const { data: status } = useQuery({
    queryKey: ["/api/automation/status"],
    refetchInterval: 5000,
  });

  const handleDelayChange = async (delayMinutes: string) => {
    try {
      await updateSettings.mutateAsync({ delayMinutes: parseInt(delayMinutes) });
      toast({
        title: "Settings Updated",
        description: "Comment delay has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const handleResume = async () => {
    try {
      await startAutomation.mutateAsync();
      toast({
        title: "Automation Resumed",
        description: "Comment automation has been resumed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resume automation",
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      await stopAutomation.mutateAsync();
      toast({
        title: "Automation Stopped",
        description: "Comment automation has been stopped.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop automation",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusText = () => {
    if (status?.isRunning) return "Running";
    if (settings?.isActive) return "Active";
    return "Paused";
  };

  const getStatusColor = () => {
    if (status?.isRunning) return "text-success";
    if (settings?.isActive) return "text-material-blue";
    return "text-warning";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-foreground flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          Automation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status?.isRunning ? "bg-success animate-pulse" : 
              settings?.isActive ? "bg-material-blue" : "bg-warning animate-pulse"
            }`}></div>
            <span className="font-medium text-foreground">Status</span>
          </div>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Comment Delay */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Comment Delay</label>
          <Select
            value={settings?.delayMinutes?.toString() || "10"}
            onValueChange={handleDelayChange}
            disabled={updateSettings.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select delay" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleResume}
            disabled={startAutomation.isPending || status?.isRunning}
            className="bg-success hover:bg-green-600 text-white"
          >
            <Play className="h-4 w-4 mr-1" />
            Resume
          </Button>
          <Button
            onClick={handleStop}
            disabled={stopAutomation.isPending || !status?.isRunning}
            variant="outline"
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
