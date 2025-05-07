
"use client";

import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter font for a clean look
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import { cn } from '@/lib/utils';
import Link from 'next/link'; // Import Link for navigation
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AuthForm from '@/components/auth-form'; // Import AuthForm
import type { User }  from '@/lib/auth-store';
import { getCurrentUser, logoutUser } from '@/lib/auth-store';
import { UserCircle, LogOut, LogIn } from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Metadata cannot be dynamic in a client component root layout,
// so we export it separately or keep it static.
// For dynamic titles based on auth state, alternative approaches would be needed.
export const staticMetadata: Metadata = {
  title: 'Rupay Growth',
  description: 'Invest and grow with Rupay Growth - Your partner in crypto investment in Pakistan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true); // Indicate component has mounted
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Pass currentUser to children; they need to be adapted to receive it
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { currentUser });
    }
    return child;
  });


  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <div className="flex min-h-screen flex-col">
          {/* Header */}
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
                      Invest
                    </Link>
                    {isClient && currentUser?.userType === 'developer' && (
                       <Link href="/developer-dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Developer Dashboard
                      </Link>
                    )}
                  </nav>
              </div>
              
              <div className="flex items-center space-x-2">
                {isClient && currentUser ? (
                  <>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      <UserCircle className="inline h-4 w-4 mr-1"/> {currentUser.phoneNumber}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="mr-1 h-4 w-4" /> Logout
                    </Button>
                  </>
                ) : isClient ? (
                  <Button variant="default" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                     <LogIn className="mr-1 h-4 w-4" /> Login / Register
                  </Button>
                ) : (
                  // Placeholder for SSR or pre-hydration
                  <div className="h-9 w-28 animate-pulse rounded-md bg-muted"></div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">{childrenWithProps}</main>

          {/* Footer */}
          <footer className="py-6 md:px-8 md:py-0">
            <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground">
                © {new Date().getFullYear()} Rupay Growth. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
        
        <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Access Your Account</DialogTitle>
                    <DialogDescription>
                        Login to manage your investments or register to start growing your capital.
                    </DialogDescription>
                </DialogHeader>
                <AuthForm onLoginSuccess={handleLoginSuccess} />
            </DialogContent>
        </Dialog>
      </body>
    </html>
  );
}
