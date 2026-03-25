import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, MapPin, Link as LinkIcon, Calendar, Camera } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { 
  useGetUserProfile, 
  useFollowUser, 
  useUnfollowUser, 
  useListPosts,
  useUpdateMyProfile,
  useUploadAvatar
} from "@workspace/api-client-react";
import { getAuthToken, getAuthUser, setAuthUser, authOptions } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetUserProfileQueryKey } from "@workspace/api-client-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const editProfileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  bio: z.string().max(160).optional().nullable(),
  location: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
});

export default function Profile() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const currentUser = getAuthUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isMeRoute = params.userId === "me";
  const targetId = isMeRoute ? currentUser?.id : Number(params.userId);
  const isMe = currentUser?.id === targetId;

  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAuthToken()) setLocation("/login");
  }, [setLocation]);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile(targetId as number, authOptions());
  const { data: postsData, isLoading: postsLoading } = useListPosts({ limit: 100 }, authOptions());
  
  // Filter posts for this user (since API doesn't have a direct endpoint for user posts)
  const userPosts = postsData?.posts.filter(p => p.author.id === targetId) || [];

  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();
  const { mutate: updateProfile, isPending: updating } = useUpdateMyProfile();
  const { mutate: uploadAvatar, isPending: uploading } = useUploadAvatar();

  const form = useForm<z.infer<typeof editProfileSchema>>({
    resolver: zodResolver(editProfileSchema),
    values: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      website: profile?.website || "",
    }
  });

  const handleFollowToggle = () => {
    if (!profile) return;
    const opts = {
      ...authOptions(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(profile.id) })
    };
    if (profile.is_following) unfollow({ userId: profile.id }, opts);
    else follow({ userId: profile.id }, opts);
  };

  const handleEditSubmit = (data: z.infer<typeof editProfileSchema>) => {
    updateProfile({ data }, {
      ...authOptions(),
      onSuccess: (updatedUser) => {
        setAuthUser(updatedUser);
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(updatedUser.id) });
        setEditOpen(false);
        toast({ title: "Profile updated" });
      }
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      uploadAvatar({ data: { avatar: file } }, {
        ...authOptions(),
        onSuccess: (res) => {
          setAuthUser({ ...currentUser, avatar_url: res.avatar_url });
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(currentUser.id) });
          toast({ title: "Avatar updated" });
        }
      });
    }
  };

  if (!getAuthToken()) return null;

  return (
    <MainLayout>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-6">
        <div>
          <h1 className="text-xl font-bold font-display">{profile?.first_name} {profile?.last_name}</h1>
          <p className="text-xs text-muted-foreground">{profile?.posts_count || 0} posts</p>
        </div>
      </header>

      {profileLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : profile ? (
        <div>
          {/* Banner */}
          <div className="h-48 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
          
          <div className="px-4 pb-4">
            <div className="flex justify-between items-start -mt-16 mb-4">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-background bg-background">
                  <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl">{profile.first_name[0]}{profile.last_name[0]}</AvatarFallback>
                </Avatar>
                {isMe && (
                  <div 
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-8 h-8 text-white" />
                    {uploading && <Loader2 className="absolute w-8 h-8 text-white animate-spin" />}
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
              
              <div className="pt-4">
                {isMe ? (
                  <Button variant="outline" className="rounded-full font-bold" onClick={() => setEditOpen(true)}>Edit profile</Button>
                ) : (
                  <Button 
                    variant={profile.is_following ? "outline" : "default"} 
                    className="rounded-full font-bold px-6"
                    onClick={handleFollowToggle}
                  >
                    {profile.is_following ? "Following" : "Follow"}
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold font-display">{profile.first_name} {profile.last_name}</h2>
              <p className="text-muted-foreground text-[15px]">@{profile.username}</p>
            </div>

            {profile.bio && <p className="text-[15px] mb-4 whitespace-pre-wrap">{profile.bio}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground text-sm mb-4">
              {profile.location && (
                <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{profile.location}</div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1"><LinkIcon className="w-4 h-4" /><a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{profile.website.replace(/^https?:\/\//, '')}</a></div>
              )}
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />Joined {format(new Date(profile.created_at), "MMMM yyyy")}</div>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{profile.following_count}</span> <span className="text-muted-foreground">Following</span></div>
              <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{profile.followers_count}</span> <span className="text-muted-foreground">Followers</span></div>
            </div>
          </div>

          <div className="border-b border-border flex">
            <div className="flex-1 py-4 text-center font-bold relative cursor-pointer hover:bg-muted/30 transition-colors">
              Posts
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            </div>
            <div className="flex-1 py-4 text-center font-bold text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
              Replies
            </div>
          </div>

          <div>
            {postsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : userPosts.length > 0 ? (
              userPosts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p>No posts yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center">User not found</div>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl font-display">Edit profile</DialogTitle>
            </div>
            <Button onClick={form.handleSubmit(handleEditSubmit)} disabled={updating} className="rounded-full px-6 font-bold">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogHeader>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea className="resize-none" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
