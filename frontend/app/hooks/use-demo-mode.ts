import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

/**
 * True when the backend signs every visitor in automatically (DEMO_MODE).
 * Used to hide sign-out, which would only lead straight back in.
 */
export const useDemoMode = () => {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: Infinity,
  });
  return data?.demo === true;
};
