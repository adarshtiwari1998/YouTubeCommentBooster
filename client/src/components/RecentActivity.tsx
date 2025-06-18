import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity"],
  });

  const getActivityColor = (type: string) => {
    switch (type) {
      case "comment":
        return "bg-success";
      case "error":
        return "bg-error";
      case "system":
        return "bg-material-blue";
      default:
        return "bg-warning";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-2 h-2 rounded-full mt-2" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
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
        <CardTitle className="text-lg font-medium text-foreground flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No recent activity
            </p>
          ) : (
            activities?.map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {activities?.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4 text-material-blue hover:text-material-blue-dark"
          >
            View full activity log
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
