import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for the English surfaces. Chrome lives in __root; this only
// mounts the English children so /en itself resolves to the index route.
export const Route = createFileRoute("/en")({
  component: () => <Outlet />,
});