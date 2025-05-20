
"use client";

import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { AuthError } from 'firebase/auth';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const formSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long")
           .regex(/^\+?[0-9\s-()]*$/, "Invalid phone number format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword === undefined) return true; // Skip if not present (login mode)
  return data.password === data.confirmPassword;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export function AuthForm({ mode }: AuthFormProps) {
  const { registerUser, loginUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    try {
      let result;
      // Firebase Auth expects an email. We'll use the phone number as the local part.
      // A dummy domain is added by the auth context if not an email already.
      const phoneAsEmailForFirebase = data.phone; 

      if (mode === 'register') {
        result = await registerUser(phoneAsEmailForFirebase, data.password);
      } else {
        result = await loginUser(phoneAsEmailForFirebase, data.password);
      }

      if ('uid' in result) { // Successful Firebase User object
        toast({ title: mode === 'register' ? 'Registration Successful' : 'Login Successful', description: 'Redirecting to dashboard...' });
        router.push('/dashboard');
      } else { // AuthError object
        const error = result as AuthError;
        let errorMessage = error.message || 'An unknown error occurred.';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'This phone number is already registered. Please login or use a different number.';
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid phone number or password.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        console.error(`${mode} error:`, error.code, error.message);
        toast({ title: `${mode === 'register' ? 'Registration' : 'Login'} Failed`, description: errorMessage, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error("Auth submission error:", error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (e.g., +923001234567 or 03001234567)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Enter your phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'register' && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Re-enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'register' ? 'Register' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
