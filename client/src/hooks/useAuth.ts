import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  return useQuery({
    queryKey: ["/api/auth/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
