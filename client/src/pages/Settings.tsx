import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Youtube, Brain, Shield } from "lucide-react";
import { useState } from "react";
import { useAutomation } from "@/hooks/useAutomation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { updateSettings } = useAutomation();
  const { data: authStatus } = useAuth();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/automation/settings"],
  });

  const [formData, setFormData] = useState({
    delayMinutes: 10,
    maxCommentsPerDay: 100,
    aiPrompt: "",
    isActive: false,
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        delayMinutes: settings.delayMinutes || 10,
        maxCommentsPerDay: settings.maxCommentsPerDay || 100,
        aiPrompt: settings.aiPrompt || "",
        isActive: settings.isActive || false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast({
        title: "Settings Saved",
        description: "Your automation settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleYouTubeAuth = () => {
    window.location.href = "/api/auth/youtube";
  };

  if (isLoading) {
    return (
      <>
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
          <div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-medium text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your YouTube automation preferences
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* YouTube Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Youtube className="h-5 w-5 mr-2 text-red-500" />
                YouTube Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Connection Status</p>
                  <p className="text-sm text-muted-foreground">
                    {authStatus?.authenticated ? "Connected as @adarshtripathi5520" : "Not connected"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    authStatus?.authenticated ? "bg-success" : "bg-error"
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    authStatus?.authenticated ? "text-success" : "text-error"
                  }`}>
                    {authStatus?.authenticated ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
              
              {!authStatus?.authenticated && (
                <Button
                  onClick={handleYouTubeAuth}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Youtube className="h-4 w-4 mr-2" />
                  Connect YouTube Account
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2" />
                Automation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="automation-active">Enable Automation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically comment on new videos
                  </p>
                </div>
                <Switch
                  id="automation-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delay">Comment Delay (minutes)</Label>
                  <Select
                    value={formData.delayMinutes.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, delayMinutes: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max-comments">Max Comments Per Day</Label>
                  <Input
                    id="max-comments"
                    type="number"
                    value={formData.maxCommentsPerDay}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxCommentsPerDay: parseInt(e.target.value) }))}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Comment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-material-blue" />
                AI Comment Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">Comment Generation Prompt</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  This prompt will be used by Gemini AI to generate unique comments for each video
                </p>
                <Textarea
                  id="ai-prompt"
                  value={formData.aiPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, aiPrompt: e.target.value }))}
                  rows={4}
                  placeholder="Enter your AI comment generation prompt..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Data Privacy</h4>
                <p className="text-sm text-blue-800">
                  Your YouTube authentication tokens are stored securely and only used for automated commenting. 
                  We never store your YouTube password or other sensitive information.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Rate Limiting</h4>
                <p className="text-sm text-yellow-800">
                  The system automatically respects YouTube's API rate limits to ensure your account remains in good standing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="bg-material-blue hover:bg-material-blue-dark text-white"
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
