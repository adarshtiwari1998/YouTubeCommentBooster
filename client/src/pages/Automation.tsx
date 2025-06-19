import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, Settings as SettingsIcon, Clock, Activity } from "lucide-react";
import AutomationControls from "@/components/AutomationControls";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Automation() {
  const { toast } = useToast();

  const { data: automationStatus } = useQuery({
    queryKey: ["/api/automation/status"],
    refetchInterval: 5000,
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/automation/settings"],
  });

  const { data: channels } = useQuery({
    queryKey: ["/api/channels"],
  });

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? "bg-green-500" : "bg-gray-500";
  };

  const getStatusText = (isRunning: boolean) => {
    return isRunning ? "Running" : "Stopped";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Automation</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and control your YouTube automation system
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(automationStatus?.isRunning)}`}></div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">{getStatusText(automationStatus?.isRunning)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Delay Setting</p>
                <p className="text-lg font-semibold">{settings?.delayMinutes || 10} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Channels</p>
                <p className="text-lg font-semibold">{channels?.filter((c: any) => c.isActive).length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <span>Automation Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationControls />
        </CardContent>
      </Card>

      {/* Channel Status */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Processing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channels?.map((channel: any) => (
              <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch checked={channel.isActive} readOnly />
                    <span className="font-medium">{channel.name}</span>
                  </div>
                  <Badge variant={channel.status === "active" ? "default" : "secondary"}>
                    {channel.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    {channel.processedVideos}/{channel.totalVideos} processed
                  </div>
                  <div className="w-24">
                    <Progress 
                      value={channel.totalVideos > 0 ? (channel.processedVideos / channel.totalVideos) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}