import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Youtube, Brain, Shield, Save, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthStatus {
  authenticated: boolean;
  user: {
    id: number;
    username: string;
    youtubeConnected: boolean;
    youtubeChannelId: string | null;
    youtubeAccount?: {
      id: string;
      title: string;
      thumbnailUrl: string;
      subscriberCount: string;
      videoCount: string;
      viewCount: string;
    } | null;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/automation/settings"],
  });

  const { data: authStatus } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const [formData, setFormData] = useState({
    delayMinutes: 10,
    maxCommentsPerDay: 100,
    aiPrompt: "",
    isActive: false,
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setFormData({
        delayMinutes: s.delayMinutes || 10,
        maxCommentsPerDay: s.maxCommentsPerDay || 100,
        aiPrompt: s.aiPrompt || "",
        isActive: s.isActive || false,
      });
    }
  }, [settings]);

  // Handle URL parameters for OAuth callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const auth = urlParams.get('auth');

    if (error === 'access_denied') {
      toast({
        title: "Authentication Cancelled",
        description: "You cancelled the YouTube authentication process. You can try again when ready.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'expired_code') {
      toast({
        title: "Authentication Expired",
        description: "The authentication code expired. Please try connecting your YouTube account again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    } else if (error === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "YouTube authentication failed. Please check your account and try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    } else if (auth === 'success') {
      toast({
        title: "Success",
        description: "YouTube account connected successfully!",
      });
      // Clear the URL parameters and refresh auth status
      window.history.replaceState({}, '', '/settings');
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    }
  }, [toast, queryClient]);

  const updateSettings = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/automation/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your automation settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    updateSettings.mutate(formData);
  };

  const handleYouTubeAuth = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/youtube");
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("No auth URL received");
      }
    } catch (error) {
      console.error("YouTube auth error:", error);
      toast({
        title: "Error",
        description: "Failed to initiate YouTube authentication",
        variant: "destructive",
      });
    }
  };

  const handleYouTubeDisconnect = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/youtube/disconnect");
      
      if (response.ok) {
        // Refresh auth status
        queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
        toast({
          title: "Success",
          description: "YouTube account disconnected successfully",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect YouTube account",
        variant: "destructive",
      });
    }
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
                    {authStatus?.authenticated && authStatus?.user?.youtubeConnected ? "Connected to your YouTube account" : "Not connected"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    authStatus?.authenticated && authStatus?.user?.youtubeConnected ? "bg-green-500" : "bg-red-500"
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    authStatus?.authenticated && authStatus?.user?.youtubeConnected ? "text-green-600" : "text-red-600"
                  }`}>
                    {authStatus?.authenticated && authStatus?.user?.youtubeConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>

              {authStatus?.authenticated && authStatus?.user?.youtubeConnected ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">YouTube account connected successfully</span>
                    </div>
                    
                    {authStatus?.user?.youtubeAccount ? (
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-green-200">
                        {authStatus.user.youtubeAccount.thumbnailUrl && (
                          <img 
                            src={authStatus.user.youtubeAccount.thumbnailUrl} 
                            alt="Channel avatar"
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {authStatus.user.youtubeAccount.title}
                          </h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div className="flex justify-between">
                              <span>Subscribers:</span>
                              <span className="font-medium">
                                {parseInt(authStatus.user.youtubeAccount.subscriberCount || '0').toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Videos:</span>
                              <span className="font-medium">
                                {parseInt(authStatus.user.youtubeAccount.videoCount || '0').toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Views:</span>
                              <span className="font-medium">
                                {parseInt(authStatus.user.youtubeAccount.viewCount || '0').toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">
                        Ready for video processing and automation
                      </p>
                    )}
                    
                    {authStatus?.user?.youtubeChannelId && (
                      <p className="text-xs text-green-600 mt-2">
                        Channel ID: {authStatus.user.youtubeChannelId}
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleYouTubeDisconnect}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Disconnect YouTube Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Connect your YouTube account to enable video processing, commenting, and liking automation.
                    </p>
                  </div>
                  <Button 
                    onClick={handleYouTubeAuth}
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    Connect YouTube Account
                  </Button>
                </div>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
