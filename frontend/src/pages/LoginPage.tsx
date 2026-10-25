import React from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand logo */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Mail className="w-7 h-7" />
          </div>
        </div>

        <h2 className="mt-5 text-center text-3xl font-extrabold text-white tracking-tight">
          Reach<span className="text-blue-400">Inbox</span>
        </h2>
        <p className="mt-2 text-center text-sm text-blue-200">
          Smart Email Scheduling &amp; Rate-Limited Dispatch Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Sign in to your account</h3>
              <p className="text-xs text-gray-500 mt-1">
                Authenticate with your corporate or personal Google account
              </p>
            </div>

            {/* Google OAuth Login Button */}
            <div className="flex justify-center pt-2">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    login(credentialResponse.credential);
                  } else {
                    toast.error('No credential received from Google');
                  }
                }}
                onError={() => {
                  toast.error('Google Sign In was cancelled or failed');
                }}
                useOneTap={false}
                shape="pill"
                size="large"
                theme="outline"
                text="signin_with"
                width="320"
              />
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                Built-in Features
              </p>
              <ul className="space-y-2.5 text-xs text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Configurable delays &amp; hourly rate limits</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Slack Webhook alerts for queued campaigns</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Recipient CSV parser with email deduplication</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>BullMQ persistent queue &amp; Ethereal test inbox</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-blue-200/70">
          By signing in you agree to our Terms of Service &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
