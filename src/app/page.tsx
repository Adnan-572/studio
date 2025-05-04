import { InvestmentPlans } from '@/components/investment-plans';
// import { Dashboard } from '@/components/dashboard'; // Commented out for now
// import { ReferralSystem } from '@/components/referral-system'; // Commented out for now
// import { Separator } from '@/components/ui/separator'; // Commented out for now

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-center text-primary">
        Welcome to Rupay Growth
      </h1>
      <p className="mb-12 text-center text-muted-foreground">
        Choose an investment plan below to get started.
      </p>

      {/* Investment Plans Section */}
      <section id="investment-plans">
         {/* Removed title from here as it's implied by the main heading and description */}
        <InvestmentPlans />
      </section>

      {/*
      Commented out Dashboard and Referral sections for now.
      These can be added back later, potentially on a separate dashboard page
      accessible after login.

      <Separator className="my-8" />

      <section id="dashboard" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-center">
          Your Dashboard
        </h2>
        <Dashboard />
      </section>

      <Separator className="my-8" />

      <section id="referral-system" className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-center">
          Referral System
        </h2>
        <ReferralSystem />
      </section>
      */}
    </div>
  );
}
