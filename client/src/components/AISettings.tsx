import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain } from "lucide-react";
import { useState } from "react";
import { useAutomation } from "@/hooks/useAutomation";
import { useToast } from "@/hooks/use-toast";

export default function AISettings() {
  const { toast } = useToast();
  const { updateSettings } = useAutomation();
  const [prompt, setPrompt] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/automation/settings"],
    onSuccess: (data) => {
      if (data?.aiPrompt) {
        setPrompt(data.aiPrompt);
      }
    },
  });

  const handleUpdatePrompt = async () => {
    try {
      await updateSettings.mutateAsync({ aiPrompt: prompt });
      toast({
        title: "AI Settings Updated",
        description: "Comment prompt has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI settings",
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-foreground flex items-center">
          <Brain className="h-5 w-5 mr-2 text-material-blue" />
          AI Comment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Comment Prompt
          </label>
          <Textarea
            value={prompt || settings?.aiPrompt || ""}
            onChange={(e) => setPrompt(e.target.value)}
            className="resize-none"
            rows={4}
            placeholder="Enter your AI comment generation prompt..."
          />
        </div>
        <Button
          onClick={handleUpdatePrompt}
          disabled={updateSettings.isPending || !prompt.trim()}
          className="w-full bg-material-blue hover:bg-material-blue-dark text-white"
        >
          {updateSettings.isPending ? "Updating..." : "Update Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
