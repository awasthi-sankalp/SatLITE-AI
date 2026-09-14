import { auth } from '@clerk/nextjs/server';
import LandingPage from './LandingPage';
import BreakLoop from './BreakLoop';

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="relative bg-black font-sans text-white min-h-screen w-full">
      <BreakLoop />
      <LandingPage userId={userId} />
    </main>
  );
}



