import { Link, useLocation } from "wouter";
import { Home, Compass, User, LogOut, Sparkles, Search } from "lucide-react";
import { clearAuth, getAuthUser } from "@/lib/auth";
import { useLogoutUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const user = getAuthUser();
  const { mutate: logout } = useLogoutUser();

  const handleLogout = () => {
    logout(undefined, {
      onSettled: () => {
        clearAuth();
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Compass, label: "Explore", href: "/posts" },
    { icon: User, label: "Profile", href: "/profile/me" },
  ];

  return (
    <div className="mx-auto max-w-7xl flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <aside className="w-20 xl:w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen overflow-y-auto flex flex-col justify-between py-6 px-2 xl:px-4 no-scrollbar">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-3 px-4 py-2 text-primary hover:opacity-80 transition-opacity">
            <Sparkles className="w-8 h-8 flex-shrink-0" />
            <span className="hidden xl:block font-display font-bold text-2xl tracking-tight">SocialConnect</span>
          </Link>
          
          <nav className="flex flex-col gap-2 mt-4">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link 
                  key={item.label} 
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer ${isActive ? 'font-bold' : 'font-medium'}`}
                >
                  <item.icon className={`w-7 h-7 flex-shrink-0 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="hidden xl:block text-xl">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            size="lg" 
            className="w-full rounded-full hidden xl:flex font-bold text-lg hover-elevate"
          >
            Post
          </Button>
          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full mx-auto xl:hidden hover-elevate"
          >
            <Sparkles className="w-6 h-6" />
          </Button>

          <div className="mt-4 pt-4 border-t border-sidebar-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center xl:justify-start gap-3 px-4 py-3 rounded-full hover:bg-destructive/10 hover:text-destructive text-sidebar-foreground transition-colors"
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              <span className="hidden xl:block font-medium text-lg">Log out</span>
            </button>
            
            {user && (
              <Link href="/profile/me" className="mt-2 w-full flex items-center gap-3 p-3 rounded-full hover:bg-sidebar-accent transition-colors">
                <Avatar className="w-10 h-10 border border-sidebar-border">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col items-start overflow-hidden">
                  <span className="font-bold text-sm truncate w-full">{user.first_name} {user.last_name}</span>
                  <span className="text-sidebar-foreground/60 text-sm truncate w-full">@{user.username}</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl border-r border-border min-h-screen">
        {children}
      </main>

      {/* Right Sidebar */}
      <aside className="hidden lg:block w-80 p-6 sticky top-0 h-screen overflow-y-auto no-scrollbar space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search Connect" 
            className="w-full bg-muted/50 border border-transparent focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary rounded-full py-3 pl-12 pr-4 outline-none transition-all"
          />
        </div>

        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <h2 className="font-bold text-xl mb-4 font-display">Trends for you</h2>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3 cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors">
              <p className="text-xs text-muted-foreground">Trending in Tech</p>
              <p className="font-bold">#ReplitAgent</p>
              <p className="text-xs text-muted-foreground">{10 * i}K posts</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
