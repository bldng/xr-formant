import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Header } from "./components/Header";
import { AudioPage } from "./pages/Audio";
import { AudioSpatialPage } from "./pages/AudioSpatial";
import { ModelPage } from "./pages/Model";

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
  component: ModelPage,
});

const audioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audio",
  component: AudioPage,
});

const audioSpatialRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spatial-audio",
  component: AudioSpatialPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: ModelPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  audioRoute,
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
