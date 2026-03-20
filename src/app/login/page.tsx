'use client';

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { signInWithEmail, signInWithGoogle } from "@/firebase/auth/auth";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const { email, password } = values;
    const { error } = await signInWithEmail(email, password);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/home');
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
       toast({
        title: "Google Sign-In Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
       toast({
        title: "Signed in with Google",
      });
      router.push('/home');
    }
    setIsGoogleLoading(false);
  };
  
  const handleAppleSignIn = () => {
    toast({ title: "Coming soon!", description: "Sign in with Apple is not yet available." });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Logo className="h-8 mb-2" />
          <CardTitle className="font-headline text-2xl">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
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
                     <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                          Forgot your password?
                        </Link>
                      </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" loading={isLoading}>
                Login
              </Button>
            </form>
          </Form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} loading={isGoogleLoading}>
                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.58 2.03-4.82 2.03-5.45 0-9.88-4.45-9.88-9.88s4.43-9.88 9.88-9.88c3.13 0 5.25 1.18 6.48 2.31l-2.67 2.67c-.97-.97-2.23-1.63-3.8-1.63-3.97 0-7.2-3.22-7.2-7.2s3.23-7.2 7.2-7.2c2.62 0 4.5 1.13 5.44 2.11 1.1 1.1 1.56 2.62 1.63 4.39H12.48z"></path></svg>
                Google
            </Button>
            <Button variant="outline" className="w-full" onClick={handleAppleSignIn} loading={isAppleLoading}>
                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-current"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.536 9.159 1.541 12.28 1.013 1.526 2.228 3.021 3.852 3.002 1.554-.035 2.073-1.023 3.91-1.023 1.792 0 2.334 1.023 3.91 1.004 1.638-.019 2.683-1.482 3.675-2.983 1.184-1.785 1.63-3.417 1.66-3.518-.048-.019-3.226-1.247-3.226-4.953 0-3.153 2.53-4.617 2.65-4.713-1.343-2.078-3.3-2.288-4.018-2.324-1.74-.04-3.322.956-4.225.956zM14.89 4.646c.89-.994 1.482-2.415 1.343-3.932-1.343.048-2.731.912-3.648 1.894-1.023.956-1.761 2.368-1.594 3.82.167 1.459 1.459 2.219 2.759 2.123 1.352-.069 2.567-.932 3.14-1.894z"></path></svg>
                Apple
            </Button>
           </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
