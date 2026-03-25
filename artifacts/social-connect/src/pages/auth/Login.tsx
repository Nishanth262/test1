import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useLoginUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { setAuthToken, setAuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  login: z.string().min(1, "Email or username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  const { mutate: login, isPending } = useLoginUser();

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login({ data }, {
      onSuccess: (res) => {
        setAuthToken(res.access_token);
        setAuthUser(res.user);
        toast({ title: "Welcome back!" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ 
          title: "Login failed", 
          description: err.message || "Invalid credentials", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Decorative Background Sidebar */}
      <div className="hidden lg:flex flex-1 relative bg-sidebar border-r border-border items-center justify-center overflow-hidden">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract pattern" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="relative z-10 text-sidebar-foreground flex flex-col items-center">
          <Sparkles className="w-32 h-32 mb-8 text-primary" />
          <h1 className="font-display text-5xl font-bold tracking-tight">Join the conversation.</h1>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <Sparkles className="w-12 h-12 text-primary lg:hidden mx-auto mb-6" />
            <h2 className="text-4xl font-display font-bold text-foreground tracking-tight">Happening now</h2>
            <p className="text-xl text-muted-foreground mt-2">Sign in to SocialConnect.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email or username" className="h-12 text-base px-4 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 text-base px-4 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl hover-elevate mt-6" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
