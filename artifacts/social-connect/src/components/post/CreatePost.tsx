import { useState, useRef } from "react";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useCreatePost } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authOptions, getAuthUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getListPostsQueryKey, getGetFeedQueryKey, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = getAuthUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: create, isPending } = useCreatePost();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image must be under 2MB", variant: "destructive" });
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!content.trim() && !image) return;
    
    create(
      { data: { content, image: image || undefined } },
      {
        ...authOptions(),
        onSuccess: () => {
          setContent("");
          clearImage();
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          if (user) {
            queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(user.id) });
          }
          toast({ title: "Post created!" });
        },
        onError: (err) => {
          toast({ title: "Failed to post", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  if (!user) return null;

  return (
    <div className="p-4 border-b border-border flex gap-4">
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <Textarea
          placeholder="What is happening?!"
          className="resize-none border-0 p-0 text-xl focus-visible:ring-0 shadow-none min-h-[60px] bg-transparent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={280}
        />
        
        {imagePreview && (
          <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-border">
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-2 right-2 rounded-full h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0 no-default-hover-elevate"
              onClick={clearImage}
            >
              <X className="w-4 h-4" />
            </Button>
            <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-[400px] object-cover" />
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center">
            <input 
              type="file" 
              accept="image/jpeg,image/png" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-primary rounded-full hover:bg-primary/10 no-default-hover-elevate"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
          </div>
          
          <Button 
            className="rounded-full px-6 font-bold hover-elevate" 
            onClick={handleSubmit}
            disabled={(!content.trim() && !image) || isPending}
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
