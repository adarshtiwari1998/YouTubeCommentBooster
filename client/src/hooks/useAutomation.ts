import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAutomation() {
  const queryClient = useQueryClient();

  const startAutomation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/automation/start"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const stopAutomation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/automation/stop"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const pauseAutomation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/automation/pause"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const updateSettings = useMutation({
    mutationFn: (settings: any) => apiRequest("PUT", "/api/automation/settings", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings"] });
    },
  });

  return {
    startAutomation,
    stopAutomation,
    pauseAutomation,
    updateSettings,
  };
}
