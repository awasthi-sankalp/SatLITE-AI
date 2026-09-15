import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'SatLITE AI',
  description: 'AI Application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen m-0 p-0 font-sans">
        <ClerkProvider
          appearance={{
            elements: {
              rootBox: 'w-full max-w-md mx-auto',
              cardBox: 'shadow-none border-none bg-black p-0',
              card: 'shadow-none border-none bg-black rounded-none p-0',
              headerTitle: 'text-3xl font-bold text-white text-left mb-4',
              headerSubtitle: 'hidden',
              formFieldRow: 'mb-4',
              formFieldLabel: 'block text-white font-medium mb-1',
              formFieldInput: 'w-full border border-gray-600 p-2 text-white bg-black focus:outline-none focus:border-white rounded-none',
              formButtonPrimary: 'w-full bg-white text-black p-2 mt-2 hover:bg-gray-200 rounded-none font-bold',
              dividerRow: 'my-6',
              dividerLine: 'bg-gray-700',
              dividerText: 'text-gray-400 bg-black px-2',
              socialButtonsBlockButton: 'w-full border border-gray-600 p-2 text-white flex justify-center items-center hover:bg-gray-800 rounded-none',
              socialButtonsBlockButtonText: 'font-medium',
              footer: 'bg-black mt-6',
              footerAction: 'flex flex-col gap-2 items-start text-sm',
              footerActionText: 'text-white',
              footerActionLink: 'text-blue-400 underline',
              form: 'm-0 p-0',
              header: 'p-0 mb-4',
              main: 'p-0 flex flex-col gap-4',
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}



