import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { Loader2, ArrowLeft, Heart, MessageCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { 
  useGetPost, 
  useListComments, 
  useAddComment, 
  useLikePost, 
  useUnlikePost,
  useDeleteComment
} from "@workspace/api-client-react";
import { getAuthToken, getAuthUser, authOptions } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPostQueryKey, getListCommentsQueryKey } from "@workspace/api-client-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

export default function PostDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const postId = Number(params.postId);
  const currentUser = getAuthUser();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (!getAuthToken()) setLocation("/login");
  }, [setLocation]);

  const { data: post, isLoading: postLoading } = useGetPost(postId, authOptions());
  const { data: commentsData, isLoading: commentsLoading } = useListComments(postId, { limit: 100 }, authOptions());
  
  const { mutate: like } = useLikePost();
  const { mutate: unlike } = useUnlikePost();
  const { mutate: addComment, isPending: addingComment } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();

  const handleLikeToggle = () => {
    if (!post) return;
    const opts = {
      ...authOptions(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) })
    };
    if (post.is_liked) unlike({ postId }, opts);
    else like({ postId }, opts);
  };

  const handleReplySubmit = () => {
    if (!commentText.trim()) return;
    addComment({ postId, data: { content: commentText } }, {
      ...authOptions(),
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (!confirm("Delete reply?")) return;
    deleteComment({ postId, commentId }, {
      ...authOptions(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    });
  };

  if (!getAuthToken()) return null;

  return (
    <MainLayout>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-6">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">Post</h1>
      </header>

      {postLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : post ? (
        <div>
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/profile/${post.author.id}`}>
                <Avatar className="w-12 h-12 hover:opacity-80 transition-opacity">
                  <AvatarImage src={post.author.avatar_url || undefined} />
                  <AvatarFallback>{post.author.first_name[0]}{post.author.last_name[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link href={`/profile/${post.author.id}`} className="font-bold text-[15px] hover:underline block">
                  {post.author.first_name} {post.author.last_name}
                </Link>
                <span className="text-muted-foreground text-sm">@{post.author.username}</span>
              </div>
            </div>

            <p className="text-[17px] leading-relaxed whitespace-pre-wrap break-words mb-4">
              {post.content}
            </p>

            {post.image_url && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-border">
                <img src={post.image_url} alt="Post attachment" className="w-full h-auto object-cover" />
              </div>
            )}

            <div className="text-muted-foreground text-[15px] mb-4 pb-4 border-b border-border/50">
              {format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}
            </div>

            <div className="flex items-center gap-6 py-1 border-b border-border/50 text-[15px]">
              <div className="flex gap-1"><span className="font-bold text-foreground">{post.like_count}</span> <span className="text-muted-foreground">Likes</span></div>
              <div className="flex gap-1"><span className="font-bold text-foreground">{post.comment_count}</span> <span className="text-muted-foreground">Replies</span></div>
            </div>

            <div className="flex items-center justify-around py-3">
              <button className="flex items-center justify-center p-2 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <MessageCircle className="w-6 h-6" />
              </button>
              <button 
                onClick={handleLikeToggle}
                className={`flex items-center justify-center p-2 rounded-full transition-colors ${post.is_liked ? 'text-destructive' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`}
              >
                <Heart className={`w-6 h-6 ${post.is_liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Reply Input */}
          <div className="p-4 flex gap-4 border-b border-border">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={currentUser?.avatar_url || undefined} />
              <AvatarFallback>{currentUser?.first_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea 
                placeholder="Post your reply" 
                className="resize-none border-0 p-0 text-xl focus-visible:ring-0 shadow-none min-h-[60px] bg-transparent"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button 
                  className="rounded-full px-6 font-bold hover-elevate"
                  disabled={!commentText.trim() || addingComment}
                  onClick={handleReplySubmit}
                >
                  {addingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
                </Button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div>
            {commentsLoading ? (
               <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : commentsData?.comments.map(comment => (
              <div key={comment.id} className="p-4 border-b border-border flex gap-3 hover:bg-muted/20 transition-colors">
                <Link href={`/profile/${comment.author.id}`} className="flex-shrink-0">
                  <Avatar className="w-10 h-10 hover:opacity-80 transition-opacity">
                    <AvatarImage src={comment.author.avatar_url || undefined} />
                    <AvatarFallback>{comment.author.first_name[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[15px]">
                      <Link href={`/profile/${comment.author.id}`} className="font-bold hover:underline">
                        {comment.author.first_name} {comment.author.last_name}
                      </Link>
                      <span className="text-muted-foreground text-sm">@{comment.author.username}</span>
                      <span className="text-muted-foreground text-sm">· {format(new Date(comment.created_at), "MMM d")}</span>
                    </div>
                    {currentUser?.id === comment.author.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive no-default-hover-elevate" onClick={() => handleDeleteComment(comment.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[15px]">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="p-12 text-center text-muted-foreground">Post not found</div>
      )}
    </MainLayout>
  );
}
