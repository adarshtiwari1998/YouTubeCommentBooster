import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, Video, MessageSquare, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalChannels: number;
    pendingVideos: number;
    commentsToday: number;
    successRate: number;
  };
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Channels",
      value: stats?.totalChannels || 0,
      icon: Tv,
      bgColor: "bg-blue-100",
      iconColor: "text-material-blue",
    },
    {
      title: "Pending Videos",
      value: stats?.pendingVideos || 0,
      icon: Video,
      bgColor: "bg-orange-100",
      iconColor: "text-warning",
      valueColor: "text-warning",
    },
    {
      title: "Comments Today",
      value: stats?.commentsToday || 0,
      icon: MessageSquare,
      bgColor: "bg-green-100",
      iconColor: "text-success",
      valueColor: "text-success",
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-success",
      valueColor: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="bg-card shadow-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className={`text-3xl font-bold mt-2 ${card.valueColor || "text-foreground"}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
