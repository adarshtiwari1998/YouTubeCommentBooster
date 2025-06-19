import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, ThumbsUp, Calendar, ExternalLink, Search } from "lucide-react";

export default function Comments() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activity } = useQuery({
    queryKey: ["/api/activity"],
  });

  const commentActivities = activity?.filter((log: any) => 
    log.type === "comment" || log.description.includes("comment")
  ) || [];

  const filteredActivities = commentActivities.filter((log: any) =>
    log.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionIcon = (description: string) => {
    if (description.includes("comment")) return <MessageCircle className="h-4 w-4 text-blue-500" />;
    if (description.includes("like")) return <ThumbsUp className="h-4 w-4 text-green-500" />;
    return <MessageCircle className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
        <h1 className="text-3xl font-bold text-foreground">Comments & Interactions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your automated YouTube comments and likes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Comments</p>
                <p className="text-2xl font-bold">{commentActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <ThumbsUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Likes Given</p>
                <p className="text-2xl font-bold">
                  {activity?.filter((log: any) => log.description.includes("like")).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">
                  {activity?.filter((log: any) => {
                    const today = new Date().toDateString();
                    return new Date(log.createdAt).toDateString() === today;
                  }).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <ExternalLink className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {activity?.length > 0 ? 
                    Math.round((activity.filter((log: any) => log.type === "success").length / activity.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comments and interactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((log: any) => (
                <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="mt-1">
                    {getActionIcon(log.description)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </Badge>
                      <Badge variant={log.type === "error" ? "destructive" : "default"} className="text-xs">
                        {log.type}
                      </Badge>
                    </div>
                    {log.metadata && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {log.metadata.videoTitle && (
                          <p>Video: {log.metadata.videoTitle}</p>
                        )}
                        {log.metadata.channelName && (
                          <p>Channel: {log.metadata.channelName}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {activity?.length === 0 ? (
                  <div>
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity yet. Start automation to see comments and interactions here.</p>
                  </div>
                ) : (
                  <p>No activities match your search.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}