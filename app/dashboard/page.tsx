import { UserButton } from '@clerk/nextjs';

export default function Dashboard() {
  return (
    <main className="bg-white font-sans text-black min-h-screen w-full">
      <div className="relative flex flex-col items-center min-h-screen w-full pt-8 overflow-hidden">
        {/* Top Right Corner User Button */}
        <div className="absolute top-6 right-6 z-10">
          <UserButton />
        </div>
        
        {/* Heading with custom scroll & shrink animation */}
        <h1 className="text-4xl md:text-5xl font-bold text-center animate-welcome">
          Welcome to SatLITE AI
        </h1>
      </div>
    </main>
  );
}
