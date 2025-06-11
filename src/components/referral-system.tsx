
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Share2, Gift, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import Link from 'next/link'; // For the "Login to see your link" button

export function ReferralSystem() {
    const { toast } = useToast();
    const { currentUser, loading } = useAuth(); // Get current user and loading state
    const [referralLink, setReferralLink] = React.useState('');

    React.useEffect(() => {
        if (currentUser && typeof window !== 'undefined') {
            // The referral code is the user's UID
            setReferralLink(`${window.location.origin}/register?ref=${currentUser.uid}`);
        } else if (!currentUser && typeof window !== 'undefined') {
            setReferralLink(''); // Clear link if user logs out or isn't logged in
        }
    }, [currentUser]);

    const copyToClipboard = () => {
        if (!referralLink) {
            toast({ title: "Login Required", description: "Please login to get your referral link.", variant: "default" });
            return;
        }
        navigator.clipboard.writeText(referralLink).then(() => {
            toast({
                title: "Copied!",
                description: "Referral link copied to clipboard.",
                variant: "default",
                duration: 3000,
            });
        }).catch(err => {
            console.error("Failed to copy referral link: ", err);
            toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
        });
    };
    
    const shareLink = async () => {
        if (!referralLink) {
            toast({ title: "Login Required", description: "Please login to share your referral link.", variant: "default" });
            return;
        }
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Rupay Growth!',
                    text: 'Invest and grow your capital with Rupay Growth. Use my link to sign up:',
                    url: referralLink,
                });
                toast({ title: "Shared!", description: "Referral link shared.", variant: "default" });
            } catch (error) {
                console.error('Error sharing:', error);
                toast({ title: "Share Failed", description: "Could not share the link.", variant: "destructive" });
            }
        } else {
            // Fallback for browsers that don't support navigator.share
            copyToClipboard();
            toast({ title: "Link Copied", description: "Share this link with your friends!", duration: 4000});
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Gift className="h-5 w-5 text-primary" /> Referral Bonus Program
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading referral information...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Gift className="h-5 w-5 text-primary" /> Referral Bonus Program
                </CardTitle>
                <CardDescription>
                    Invite friends to Rupay Growth! If they sign up using your link and their first investment gets activated, you&apos;ll receive an extra <strong>+1% daily profit bonus</strong> on your currently active investment plan.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentUser ? (
                    <div>
                        <Label htmlFor="referral-link" className="text-sm font-medium">Your Unique Referral Link:</Label>
                        <div className="flex items-center space-x-2 mt-1">
                            <Input
                                id="referral-link"
                                type="text"
                                value={referralLink}
                                readOnly
                                className="flex-grow bg-muted"
                            />
                            <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy Referral Link" disabled={!referralLink}>
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Copy Referral Link</span>
                            </Button>
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <Button variant="default" size="icon" onClick={shareLink} title="Share Referral Link" disabled={!referralLink}>
                                    <Share2 className="h-4 w-4" />
                                    <span className="sr-only">Share Referral Link</span>
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-4 border border-dashed rounded-md">
                        <p className="text-muted-foreground mb-3">Login to get your unique referral link and start earning bonuses!</p>
                        <Button asChild>
                            <Link href="/login">
                                <ExternalLink className="mr-2 h-4 w-4" /> Login to View Link
                            </Link>
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    The +1% bonus applies to your daily profit rate for one of your active plans per successful referral activation. Terms and conditions may apply.
                </p>
            </CardContent>
        </Card>
    );
}
