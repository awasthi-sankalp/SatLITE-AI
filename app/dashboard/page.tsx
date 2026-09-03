import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ClearHash from './ClearHash';
import DashboardClient from './DashboardClient';

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <main className="relative bg-white font-sans text-black min-h-screen w-full flex flex-col px-4 sm:px-6 overflow-x-hidden">
      <ClearHash />

      {/* Top Left Corner Logo */}
      <div className="absolute top-6 left-4 sm:left-6 z-50 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="SatLITE AI Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="font-bold text-xl tracking-tight hidden sm:inline">SatLITE AI</span>
      </div>

      {/* Top Right Corner User Button */}
      <div className="absolute top-6 right-4 sm:right-6 z-50">
        <UserButton />
      </div>

      {/* Animated Heading */}
      <div className="flex flex-col items-center w-full pt-8 pb-6">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-center animate-welcome leading-tight max-w-[85vw] md:max-w-none mx-auto">
          Welcome to SatLITE AI
        </h1>
        <p className="text-gray-500 text-sm mt-16 text-center max-w-xl">
          Agentic vision-language assistant for remote sensing image analysis
        </p>
      </div>

      {/* SatQuery AI Interface */}
      <DashboardClient />
    </main>
  );
}
