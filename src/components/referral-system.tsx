
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label'; // Import Label
import { Copy, Share2, Gift } from 'lucide-react'; // Added Gift icon
import { useToast } from '@/hooks/use-toast';

interface ReferralSystemProps {
    userId: string; // The current user's ID
}

// Placeholder: In a real app, generate a unique referral code/link server-side
const generateReferralLink = (userId: string): string => {
    // Basic example: Use base URL + user ID. Ensure URL is properly constructed.
    // It's better to use a unique referral code instead of the raw user ID in production.
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/register?ref=${userId}`;
};

export function ReferralSystem({ userId }: ReferralSystemProps) {
    const { toast } = useToast();
    const referralLink = React.useMemo(() => generateReferralLink(userId), [userId]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            toast({
                title: "Copied!",
                description: "Referral link copied to clipboard.",
                variant: "default",
                duration: 2000,
            });
        }).catch(err => {
            console.error("Failed to copy referral link: ", err);
            toast({
                title: "Error",
                description: "Failed to copy referral link.",
                variant: "destructive",
            });
        });
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Rupay Growth!',
                    text: `Invest and grow with Rupay Growth using my referral link:`,
                    url: referralLink,
                });
                toast({ title: "Link Shared", description: "Referral link shared successfully." });
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback to copy if share fails or is cancelled
                 copyToClipboard();
                 toast({ title: "Sharing Failed", description: "Link copied to clipboard instead.", variant: "default" });
            }
        } else {
            // Fallback for browsers that don't support navigator.share
            copyToClipboard();
             toast({ title: "Sharing Not Supported", description: "Referral link copied to clipboard.", variant: "default" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Gift className="h-5 w-5 text-primary" /> Referral Bonus Program
                </CardTitle>
                <CardDescription>
                    Share your referral link! For every friend who invests using your link, you'll earn an extra <strong>1% daily profit bonus</strong> added to your active investment plan.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy Link">
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy Referral Link</span>
                        </Button>
                         {typeof navigator !== 'undefined' && navigator.share && (
                            <Button variant="default" size="icon" onClick={shareLink} title="Share Link">
                                <Share2 className="h-4 w-4" />
                                 <span className="sr-only">Share Referral Link</span>
                            </Button>
                         )}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    The 1% bonus applies per referred active investment and is added to your *current* daily profit rate for the duration of your plan. Bonuses are calculated and applied when your investment is approved. Maximum bonus potential may apply.
                </p>
            </CardContent>
        </Card>
    );
}

