import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AddChannelDialog() {
  const [open, setOpen] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addChannelMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/channels", { channelUrl: url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setChannelUrl("");
      setOpen(false);
      toast({
        title: "Channel Added",
        description: "YouTube channel has been successfully added to your automation list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Channel",
        description: error.message || "Unable to add the YouTube channel. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl.trim()) return;
    
    addChannelMutation.mutate(channelUrl.trim());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-material-blue hover:bg-material-blue-dark text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add YouTube Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="channelUrl">YouTube Channel URL</Label>
            <Input
              id="channelUrl"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@channelhandle"
              disabled={addChannelMutation.isPending}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter the full YouTube channel URL (e.g., https://www.youtube.com/@FoxxLifeSciences)
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={addChannelMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addChannelMutation.isPending || !channelUrl.trim()}
              className="bg-material-blue hover:bg-material-blue-dark text-white"
            >
              {addChannelMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}