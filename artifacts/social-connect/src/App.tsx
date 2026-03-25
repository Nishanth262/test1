import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clearAuth } from "@/lib/auth";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Feed from "@/pages/Feed";
import Explore from "@/pages/Explore";
import Profile from "@/pages/Profile";
import PostDetail from "@/pages/PostDetail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      // Global handling for unauthenticated errors
      if (error?.status === 401 || error?.response?.status === 401 || error?.message?.includes("401")) {
        clearAuth();
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = `${import.meta.env.BASE_URL}login`;
        }
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/" component={Feed} />
      <Route path="/posts" component={Explore} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/post/:postId" component={PostDetail} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
