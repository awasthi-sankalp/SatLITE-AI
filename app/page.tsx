import { SignIn, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white font-sans text-black min-h-screen">
      <SignedOut>
        <SignIn 
          signUpUrl="/sign-up" 
          appearance={{
            layout: {
              socialButtonsPlacement: 'bottom',
              showOptionalFields: true,
            }
          }}
        />
      </SignedOut>
      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl">Welcome to SatLITE AI</h1>
          <UserButton />
        </div>
      </SignedIn>
    </div>
  );
}
