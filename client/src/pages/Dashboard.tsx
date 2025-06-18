import { useQuery } from "@tanstack/react-query";
import StatsCards from "@/components/StatsCards";
import ChannelsList from "@/components/ChannelsList";
import AutomationControls from "@/components/AutomationControls";
import RecentActivity from "@/components/RecentActivity";
import AISettings from "@/components/AISettings";
import SystemStatus from "@/components/SystemStatus";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const { startAutomation, pauseAutomation } = useAutomation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: automationStatus } = useQuery({
    queryKey: ["/api/automation/status"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const handleStartAutomation = async () => {
    try {
      await startAutomation.mutateAsync();
      toast({
        title: "Automation Started",
        description: "YouTube comment automation has been started successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start automation",
        variant: "destructive",
      });
    }
  };

  const handlePauseAutomation = async () => {
    try {
      await pauseAutomation.mutateAsync();
      toast({
        title: "Automation Paused",
        description: "YouTube comment automation has been paused.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause automation",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-medium text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your YouTube comment automation
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleStartAutomation}
              disabled={startAutomation.isPending || automationStatus?.isRunning}
              className="bg-material-blue hover:bg-material-blue-dark text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              {automationStatus?.isRunning ? "Running" : "Start Automation"}
            </Button>
            <Button
              onClick={handlePauseAutomation}
              disabled={pauseAutomation.isPending || !automationStatus?.isRunning}
              variant="outline"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={statsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Channels List */}
          <div className="lg:col-span-2">
            <ChannelsList />
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <AutomationControls />
            <RecentActivity />
            <AISettings />
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8">
          <SystemStatus />
        </div>
      </main>
    </>
  );
}
