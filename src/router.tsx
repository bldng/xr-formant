import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Header } from "./components/Header";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <div className="h-[100svh] flex flex-col">
        <Header />
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
      <TanStackRouterDevtools />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() =>
    import("./pages/Model").then((m) => ({ default: m.ModelPage }))
  ),
});

const audioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audio",
  component: lazyRouteComponent(() =>
    import("./pages/Audio").then((m) => ({ default: m.AudioPage }))
  ),
});

const arRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ar-lens",
  component: lazyRouteComponent(() => import("./pages/AR")),
});

const audioSpatialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spatial-audio",
  component: lazyRouteComponent(() =>
    import("./pages/AudioSpatial").then((m) => ({
      default: m.AudioSpatialPage,
    }))
  ),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: lazyRouteComponent(() =>
    import("./pages/About").then((m) => ({ default: m.AboutPage }))
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  audioRoute,
  arRoute,
  audioSpatialRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function Router() {
  return <RouterProvider router={router} />;
}
