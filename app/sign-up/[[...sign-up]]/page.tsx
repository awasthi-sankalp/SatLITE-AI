import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex justify-center items-center p-8 bg-white min-h-screen text-black">
      <SignUp 
        signInUrl="/" 
        appearance={{
          layout: {
            socialButtonsPlacement: 'bottom',
            showOptionalFields: true,
          }
        }}
      />
    </div>
  );
}
