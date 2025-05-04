import { InvestmentPlans } from '@/components/investment-plans';
import { Dashboard } from '@/components/dashboard';
import { ReferralSystem } from '@/components/referral-system';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Welcome to Rupay Growth
      </h1>

      {/* Investment Plans Section */}
      <section id="investment-plans" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-center">
          Investment Plans
        </h2>
        <InvestmentPlans />
      </section>

      <Separator className="my-8" />

      {/* User Dashboard Section */}
      <section id="dashboard" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-center">
          Your Dashboard
        </h2>
        <Dashboard />
      </section>

      <Separator className="my-8" />

      {/* Referral System Section */}
      <section id="referral-system" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-center">
          Referral System
        </h2>
        <ReferralSystem />
      </section>
    </div>
  );
}
