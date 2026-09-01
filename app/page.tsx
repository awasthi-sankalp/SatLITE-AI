import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();

  // If already logged in, skip the login page and go straight to dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="bg-white font-sans text-black min-h-screen w-full">
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
