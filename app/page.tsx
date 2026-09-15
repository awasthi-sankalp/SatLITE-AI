import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import BreakLoop from './BreakLoop';
import logoImg from '../Logo/logo.jpg';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="relative bg-white font-sans text-black min-h-screen w-full px-4 sm:px-6">
      <BreakLoop />
      
      <div className="absolute top-6 left-4 sm:left-6 z-50 flex items-center gap-2">
        <img src={logoImg.src} alt="SatLITE AI Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="font-bold text-xl tracking-tight hidden sm:inline">SatLITE AI</span>
      </div>

      <div className="flex items-center justify-center min-h-screen w-full">
        <SignIn 
          routing="hash" 
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}



