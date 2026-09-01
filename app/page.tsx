import { SignIn, Show, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white font-sans text-black min-h-screen">
      <Show when="signed-out">
        <SignIn 
          signUpUrl="/sign-up" 
        />
      </Show>
      <Show when="signed-in">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl">Welcome to SatLITE AI</h1>
          <UserButton />
        </div>
      </Show>
    </div>
  );
}
