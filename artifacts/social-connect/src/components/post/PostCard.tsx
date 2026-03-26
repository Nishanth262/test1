import { formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Post, useLikePost, useUnlikePost, useDeletePost } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authOptions, getAuthUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey, getGetFeedQueryKey, getGetUserProfileQueryKey } from "@workspace/api-client-react";

export function PostCard({ post }: { post: Post }) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const currentUser = getAuthUser();
  const isMine = currentUser?.id === post.author.id;

  const { mutate: like } = useLikePost({ request: authOptions().request });
  const { mutate: unlike } = useUnlikePost({ request: authOptions().request });
  const { mutate: deletePost } = useDeletePost({ request: authOptions().request });

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      }
    };

    if (post.is_liked) {
      unlike({ postId: post.id }, options);
    } else {
      like({ postId: post.id }, options);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    
    deletePost({ postId: post.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        if (currentUser) {
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(currentUser.id) });
        }
      }
    });
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => setLocation(`/post/${post.id}`)}
      onKeyDown={(e) => e.key === "Enter" && setLocation(`/post/${post.id}`)}
      className="block border-b border-border p-4 hover:bg-muted/20 transition-colors cursor-pointer group"
    >
      <div className="flex gap-4">
        <Link href={`/profile/${post.author.id}`} onClick={e => e.stopPropagation()} className="flex-shrink-0 relative z-10">
          <Avatar className="w-12 h-12 hover:opacity-80 transition-opacity">
            <AvatarImage src={post.author.avatar_url || undefined} />
            <AvatarFallback>{post.author.first_name[0]}{post.author.last_name[0]}</AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm truncate">
              <Link href={`/profile/${post.author.id}`} onClick={(e) => { e.stopPropagation(); }} className="font-bold hover:underline relative z-10 truncate">
                {post.author.first_name} {post.author.last_name}
              </Link>
              <span className="text-muted-foreground truncate">@{post.author.username}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: false }).replace('about ', '')}
              </span>
            </div>
            
            {isMine && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDelete}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 relative z-10 no-default-hover-elevate"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
            {post.content}
          </p>
          
          {post.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
              <img src={post.image_url} alt="Post attachment" className="w-full h-auto object-cover max-h-[500px]" />
            </div>
          )}
          
          <div className="mt-3 flex items-center gap-8 relative z-10">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-primary group/btn transition-colors">
              <div className="p-2 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm">{post.comment_count > 0 ? post.comment_count : ''}</span>
            </button>
            
            <button 
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 transition-colors group/btn ${post.is_liked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
            >
              <div className={`p-2 rounded-full transition-colors ${post.is_liked ? 'bg-destructive/10' : 'group-hover/btn:bg-destructive/10'}`}>
                <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-sm">{post.like_count > 0 ? post.like_count : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
