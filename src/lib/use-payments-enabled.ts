import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";

/**
 * Global purchase switch. Driven by the `payments_enabled` site setting.
 * While it is off, every purchase control renders a disabled "Yakında" state.
 * Free flows (e.g. 7Q pilot via `sevenq_pilot_open`) are unaffected.
 */
export function usePaymentsEnabled(): boolean {
  const fetchSettings = useServerFn(getPublicSiteSettings);
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 5 * 60 * 1000,
  });
  return (data?.payments_enabled ?? "false") === "true";
}