
"use client";

import * as React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCircle, LogIn, LogOut, Settings, DollarSign, LayoutDashboard, UserPlus, BarChart } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/auth-context'; // Import AuthProvider and useAuth
import { useRouter } from 'next/navigation'; // For logout redirect

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Removed static metadata as it's usually handled by Next.js per page or here if truly static.
// If needed, individual pages can export metadata objects.

function AppHeader() {
  const { currentUser, logoutUser, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login'); // Ensure redirect to login after logout
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            <span className="hidden font-bold sm:inline-block">
              Rupay Growth
            </span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <DollarSign className="mr-1 inline-block h-4 w-4" /> Invest
            </Link>
            {currentUser && (
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                <BarChart className="mr-1 inline-block h-4 w-4" /> My Dashboard
              </Link>
            )}
            <Link href="/developer-dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <LayoutDashboard className="mr-1 inline-block h-4 w-4" /> Developer Dashboard
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          {loading ? (
            <UserCircle className="h-5 w-5 animate-pulse text-muted-foreground" />
          ) : currentUser ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {currentUser.email?.split('@')[0]} {/* Display part of phone/email */}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-1 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="mr-1 h-4 w-4" /> Register
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <main className="flex-1">{children}</main>
            <footer className="py-6 md:px-8 md:py-0">
              <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground">
                  © {new Date().getFullYear()} Rupay Growth. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
