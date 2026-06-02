
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { BrainCircuit, Chrome, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0E11] p-4">
      <Card className="w-full max-w-md border-border/50 bg-sidebar/50 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">ForexInsight AI</CardTitle>
            <CardDescription>Professional intelligence for modern traders</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-12 text-base font-medium gap-3 border-border/50 hover:bg-muted/50 transition-all"
            onClick={handleGoogleSignIn}
          >
            <Chrome className="h-5 w-5 text-red-500" />
            Sign in with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold tracking-widest">or continue with</span>
            </div>
          </div>

          <Link href="/" className="block">
            <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
