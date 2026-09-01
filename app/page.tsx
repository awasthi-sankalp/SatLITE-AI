import { SignIn, SignUpButton, Show, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white font-sans text-black min-h-screen">
      <Show when="signed-out">
        <div className="flex flex-col items-center w-full max-w-md">
          <SignIn 
            routing="hash"
            appearance={{
              elements: {
                footer: 'hidden',
              }
            }}
          />
          <div className="mt-4 text-sm text-black">
            Don't have an account?{' '}
            <SignUpButton mode="modal">
              <button className="text-blue-600 hover:underline cursor-pointer">Sign up</button>
            </SignUpButton>
          </div>
        </div>
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
