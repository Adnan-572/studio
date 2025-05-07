
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { registerUser, loginUser, type User } from '@/lib/auth-store';
import { Loader2 } from 'lucide-react';

interface AuthFormProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthForm({ onLoginSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!phoneNumber.trim() || !/^\d{10,15}$/.test(phoneNumber.trim())) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number (10-15 digits).", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const user = await loginUser(phoneNumber, password);
        if (user) {
          toast({ title: "Login Successful", description: `Welcome back, ${user.userName || user.phoneNumber}!` });
          onLoginSuccess(user);
        } else {
          toast({ title: "Login Failed", description: "Invalid phone number or password.", variant: "destructive" });
        }
      } else {
        if (password !== confirmPassword) {
          toast({ title: "Passwords Don't Match", description: "Please ensure passwords match.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const newUser = await registerUser(phoneNumber, password, phoneNumber); // Using phone number as username initially
        if (newUser) {
          toast({ title: "Registration Successful", description: `Welcome, ${newUser.userName || newUser.phoneNumber}! You are now logged in.` });
          onLoginSuccess(newUser);
        } else {
          // registerUser might return null if user already exists and we decide to prevent re-registration this way
           toast({ title: "Registration Failed", description: "This phone number might already be registered.", variant: "destructive" });
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="phone-number">Phone Number</Label>
        <Input
          id="phone-number"
          type="tel"
          placeholder="e.g., 03001234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      {!isLogin && (
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLogin ? 'Login' : 'Register'}
      </Button>
      <Button
        type="button"
        variant="link"
        onClick={() => setIsLogin(!isLogin)}
        className="text-sm"
        disabled={isLoading}
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </Button>
    </form>
  );
}
