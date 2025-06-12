"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';

export default function RegisterFormWrapper() {
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  return (
    <AuthForm mode="register" initialReferralCode={referralCodeFromUrl || undefined} />
  );
}
