import { SignIn, Show, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="bg-white font-sans text-black min-h-screen w-full">
      <Show when="signed-out">
        <div className="flex items-center justify-center min-h-screen w-full">
          <SignIn routing="hash" />
        </div>
      </Show>
      <Show when="signed-in">
        <div className="relative flex flex-col items-center justify-center min-h-screen w-full">
          {/* Top Right Corner User Button */}
          <div className="absolute top-6 right-6">
            <UserButton />
          </div>
          
          {/* Centered Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-center">
            Welcome to SatLITE AI
          </h1>
        </div>
      </Show>
    </main>
  );
}
