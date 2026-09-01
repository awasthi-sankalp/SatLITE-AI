import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ClearHash from './ClearHash';

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <main className="relative bg-white font-sans text-black min-h-screen w-full flex flex-col px-4 sm:px-6 overflow-hidden">
      <ClearHash />
      
      {/* Top Right Corner User Button */}
      <div className="absolute top-6 right-4 sm:right-6 z-50">
        <UserButton />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center w-full pt-8">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-center animate-welcome leading-tight max-w-[85vw] md:max-w-none mx-auto">
          Welcome to SatLITE AI
        </h1>
      </div>
    </main>
  );
}
