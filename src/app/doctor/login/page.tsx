"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Calendar } from "lucide-react";

// ✅ Supabase client ko component se BAHAR nikaal diya taake ye har render par naya na bane
const supabase = createClient();

export default function DoctorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // ✅ 1. Email ko trim kiya aur destructure karke seedha data nikala
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) { 
        setError(authError.message); 
        return; 
      }

      // ✅ 2. Doosra getUser() call karne ki zaroorat nahi, data.user pehle se maujood hai
      const user = data?.user;
      
      if (user) {
        const { data: doctorData, error: dbError } = await supabase
          .from("doctors")
          .select("id, is_onboarded")
          .eq("user_id", user.id)
          .single();
          
        if (dbError || !doctorData) { 
          setError("Account not found. Please sign up first."); 
          await supabase.auth.signOut(); 
          return; 
        }
        
        router.push(doctorData.is_onboarded ? "/doctor/dashboard" : "/doctor/onboarding");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-1">Sign in to your doctor account</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="doctor@example.com" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link href="/doctor/forgot-password" className="text-primary-600 hover:underline font-medium">Forgot password?</Link>
            <p className="text-gray-600">
              Don&apos;t have an account? <Link href="/doctor/signup" className="text-primary-600 hover:underline font-medium">Sign up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
