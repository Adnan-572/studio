
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Share2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Since there's no logged-in user, referral link generation needs to be rethought
// or display a generic message.
// For now, we'll show a generic message and a non-functional input.

export function ReferralSystem() {
    const { toast } = useToast();
    const placeholderReferralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=YOUR_CODE` : '';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(placeholderReferralLink).then(() => {
            toast({
                title: "Info",
                description: "Referral system details would be here. This is a placeholder link.",
                variant: "default",
                duration: 3000,
            });
        }).catch(err => {
            console.error("Failed to copy placeholder link: ", err);
        });
    };
    
    const shareLink = async () => {
         toast({ title: "Info", description: "Referral sharing would be implemented here." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Gift className="h-5 w-5 text-primary" /> Referral Bonus Program
                </CardTitle>
                <CardDescription>
                    Share our platform! For every friend who invests, you could earn an extra daily profit bonus added to your active investment plan if a referral program is active. (Functionality currently simplified).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="referral-link-placeholder" className="text-sm font-medium">Example Referral Link:</Label>
                    <div className="flex items-center space-x-2 mt-1">
                        <Input
                            id="referral-link-placeholder"
                            type="text"
                            value={placeholderReferralLink}
                            readOnly
                            className="flex-grow bg-muted"
                        />
                        <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy Example Link">
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy Example Referral Link</span>
                        </Button>
                         {typeof navigator !== 'undefined' && navigator.share && (
                            <Button variant="default" size="icon" onClick={shareLink} title="Share Example Link">
                                <Share2 className="h-4 w-4" />
                                 <span className="sr-only">Share Example Referral Link</span>
                            </Button>
                         )}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Referral bonuses typically apply per referred active investment and are added to your daily profit rate. Specific terms apply. Contact support for more details on active referral programs.
                </p>
            </CardContent>
        </Card>
    );
}
