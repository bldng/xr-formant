import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Header } from "./components/Header";
import {
  ModelDropZone,
  ModelProvider,
} from "./components/ModelLoader";
import { Canvas } from "./components/Stage/Canvas";
import { About } from "./pages/About";
import { Audio } from "./pages/Audio";

const rootRoute = createRootRoute({
  component: () => (
    <ModelProvider>
      <div className="h-[100svh] flex flex-col">
        <Header />
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
      <TanStackRouterDevtools />
    </ModelProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <div className="w-full h-full relative">
      <ModelDropZone />
      <Canvas />
    </div>
  ),
});

const audioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audio",
  component: Audio,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: About,
});

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, audioRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function Router() {
  return <RouterProvider router={router} />;
}
