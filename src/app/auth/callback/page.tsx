'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        console.error('Supabase not configured');
        router.push('/');
        return;
      }

      try {
        // Exchange the auth code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.search.substring(1)
        );

        if (error) {
          console.error('Error during auth callback:', error);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
      } finally {
        // Redirect to home page regardless of success/failure
        router.push('/');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
