import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useListPosts } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { getAuthToken, authOptions } from "@/lib/auth";

export default function Explore() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!getAuthToken()) {
      setLocation("/login");
    }
  }, [setLocation]);

  const { data, isLoading, error } = useListPosts({ limit: 50 }, authOptions());

  if (!getAuthToken()) return null;

  return (
    <MainLayout>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <h1 className="text-xl font-bold font-display">Explore</h1>
      </header>
      
      <div className="pb-20 xl:pb-0">
        {isLoading && (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="p-8 text-center text-destructive">
            <p>Failed to load posts.</p>
          </div>
        )}
        
        {data?.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        
        {data?.posts.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p>No posts found on the network.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
