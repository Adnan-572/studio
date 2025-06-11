
"use client";

import * as React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label import
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { AuthError as FirebaseAuthenticationError } from 'firebase/auth'; // Renamed to avoid conflict

interface AuthFormProps {
  mode: 'login' | 'register';
  initialReferralCode?: string;
}

// Separate schemas for login and register
const loginFormSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long")
           .regex(/^\+?[0-9\s-()]*$/, "Invalid phone number format. Use numbers, spaces, hyphens, or parentheses."),
  password: z.string().min(1, "Password is required"), // Min 1 for login as min length is checked by Firebase
});

const registerFormSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long")
           .regex(/^\+?[0-9\s-()]*$/, "Invalid phone number format. Use numbers, spaces, hyphens, or parentheses."),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  referralCode: z.string().optional(), // Added for referral code
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Union type for form data
type AuthFormData = z.infer<typeof loginFormSchema> | z.infer<typeof registerFormSchema>;

export function AuthForm({ mode, initialReferralCode }: AuthFormProps) {
  const { registerUser, loginUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const currentSchema = mode === 'login' ? loginFormSchema : registerFormSchema;

  const form = useForm<AuthFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      phone: '',
      password: '',
      ...(mode === 'register' ? { confirmPassword: '', referralCode: initialReferralCode || '' } : {}),
    },
  });
  
  React.useEffect(() => {
    if (mode === 'register' && initialReferralCode) {
      form.setValue('referralCode', initialReferralCode);
    }
  }, [mode, initialReferralCode, form]);


  const handleAuthResult = (result: any, authMode: 'login' | 'register') => {
    if (result && 'uid' in result) { // Successful Firebase User object
      toast({ 
        title: `${authMode === 'register' ? 'Registration' : 'Login'} Successful!`, 
        description: 'Redirecting to your dashboard...' 
      });
      // Redirection is handled by login/register pages' useEffect
    } else { // AuthError object
      const error = result as FirebaseAuthenticationError;
      let errorMessage = error.message || 'An unknown error occurred.';
      
      if (error.code === 'auth/email-already-in-use' || error.code === 'auth/phone-number-already-exists') {
        errorMessage = 'This phone number is already registered. Try logging in instead.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = 'Invalid phone number or password.';
      } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
      } else if (error.code === 'auth/invalid-phone-number'){
          errorMessage = 'The phone number format is invalid.';
      }
      console.log("Auth result (error):", result); 
      toast({ title: `${authMode === 'register' ? 'Registration' : 'Login'} Failed`, description: errorMessage, variant: 'destructive' });
    }
  };

  const onSubmit: SubmitHandler<AuthFormData> = async (data) => {
    setIsLoading(true);
    try {
      let result;
      if (mode === 'register') {
        const registerData = data as z.infer<typeof registerFormSchema>;
        result = await registerUser(registerData.phone, registerData.password, registerData.referralCode);
      } else {
        const loginData = data as z.infer<typeof loginFormSchema>;
        result = await loginUser(loginData.phone, loginData.password);
      }
      handleAuthResult(result, mode);
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
              <FormLabel>Phone Number (e.g., 03001234567 or +923001234567)</FormLabel>
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
              <div className="relative">
                <FormControl>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    {...field} 
                  />
                </FormControl>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
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
                <FormLabel>Re-enter Password</FormLabel>
                 <div className="relative">
                    <FormControl>
                    <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Re-enter your password" 
                        {...field} 
                    />
                    </FormControl>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                    >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Referral code input - can be hidden or read-only if pre-filled by initialReferralCode */}
        {mode === 'register' && initialReferralCode && (
          <FormField
            control={form.control}
            name="referralCode"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormLabel>Referral Code (Optional)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Enter referral code" {...field} readOnly={!!initialReferralCode} />
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
