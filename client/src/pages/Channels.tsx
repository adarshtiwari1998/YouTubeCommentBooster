import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, Plus } from "lucide-react";
import ChannelsList from "@/components/ChannelsList";
import AddChannelDialog from "@/components/AddChannelDialog";

export default function Channels() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Channels</h1>
          <p className="text-muted-foreground mt-1">
            Manage your YouTube channels and video synchronization
          </p>
        </div>
        <AddChannelDialog />
      </div>
      
      <ChannelsList />
    </div>
  );
}
