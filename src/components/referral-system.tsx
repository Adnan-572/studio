"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Users, GitBranch, Wallet } from "lucide-react"; // Icons
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Mock data - replace with actual data fetching later
const mockReferralData = {
  referralLink: "https://rupaygrowth.pk/ref/user123abc",
  downlineCount: 15, // Example total downline count
  commissionEarned: 1250.50,
  // Placeholder for downline tree data (complex structure, needs proper API)
  downlineTree: [
    { id: 'userA', name: 'Ali Khan', level: 1, children: [
        { id: 'userB', name: 'Sara Ahmed', level: 2, children: [] },
        { id: 'userC', name: 'Bilal Raja', level: 2, children: [
            { id: 'userD', name: 'Fatima Zia', level: 3, children: [] }
        ]}
    ]},
    { id: 'userE', name: 'Zoya Malik', level: 1, children: [] },
  ],
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function ReferralSystem() {
  // TODO: Fetch actual referral data using state and effects when auth/API is ready
  const [referralData] = React.useState(mockReferralData);
  const { toast } = useToast(); // Initialize toast

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralData.referralLink).then(() => {
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
        variant: "default", // Use 'default' which maps to primary color
      });
    }).catch(err => {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Error",
        description: "Failed to copy referral link.",
        variant: "destructive",
      });
    });
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Rupay Growth!',
        text: 'Join me on Rupay Growth and start earning. Use my referral link:',
        url: referralData.referralLink,
      }).then(() => {
        console.log('Thanks for sharing!');
      }).catch(console.error);
    } else {
        // Fallback for browsers that don't support navigator.share
        copyToClipboard(); // Copy link as a fallback
        alert("Sharing not supported on this browser. Link copied instead.");
    }
   };


  return (
    <div className="space-y-8">
      {/* Referral Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with your friends and earn commissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-2">
          <Input
            type="text"
            value={referralData.referralLink}
            readOnly
            className="flex-grow"
            aria-label="Referral Link"
          />
          <div className="flex gap-2 mt-2 sm:mt-0">
            <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy Link">
              <Copy className="h-4 w-4" />
            </Button>
             <Button variant="default" size="icon" onClick={shareLink} aria-label="Share Link">
               <Share2 className="h-4 w-4" />
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
       <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
               <Users className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{referralData.downlineCount}</div>
               <p className="text-xs text-muted-foreground">Users in your downline</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
               <Wallet className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{formatCurrency(referralData.commissionEarned)}</div>
               <p className="text-xs text-muted-foreground">Total earnings from referrals</p>
             </CardContent>
           </Card>
       </div>


      {/* Downline Tree Visualization (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Your Downline Tree
          </CardTitle>
           <CardDescription>
             View your referral network structure. (Visualization Coming Soon)
           </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground bg-secondary rounded-md">
            <p className="mb-2">Downline tree visualization will be implemented here.</p>
            <p className="text-sm">This will show your direct referrals and their subsequent referrals up to 10 levels.</p>
            {/* Basic List Placeholder */}
            <ul className="mt-4 text-left list-disc list-inside text-sm">
                {referralData.downlineTree.map(level1 => (
                    <li key={level1.id} className="font-semibold">
                        {level1.name} (Level 1)
                        {level1.children.length > 0 && (
                            <ul className="ml-4 list-[circle] list-inside font-normal">
                                {level1.children.map(level2 => (
                                    <li key={level2.id}>
                                        {level2.name} (Level 2)
                                         {level2.children.length > 0 && (
                                            <ul className="ml-4 list-[square] list-inside">
                                                 {level2.children.map(level3 => (
                                                     <li key={level3.id}>{level3.name} (Level 3)</li>
                                                 ))}
                                            </ul>
                                         )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
