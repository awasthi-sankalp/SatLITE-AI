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
      <body className="bg-white text-black min-h-screen m-0 p-0 font-sans">
        <ClerkProvider
          appearance={{
            elements: {
              rootBox: 'w-full max-w-md mx-auto',
              cardBox: 'shadow-none border-none bg-white p-0',
              card: 'shadow-none border-none bg-white rounded-none p-0',
              headerTitle: 'text-3xl font-bold text-black text-left mb-4',
              headerSubtitle: 'hidden',
              formFieldRow: 'mb-4',
              formFieldLabel: 'block text-black font-medium mb-1',
              formFieldInput: 'w-full border border-gray-400 p-2 text-black bg-white focus:outline-none focus:border-black rounded-none',
              formButtonPrimary: 'w-full bg-black text-white p-2 mt-2 hover:bg-gray-800 rounded-none font-bold',
              dividerRow: 'my-6',
              dividerLine: 'bg-gray-300',
              dividerText: 'text-gray-500 bg-white px-2',
              socialButtonsBlockButton: 'w-full border border-gray-400 p-2 text-black flex justify-center items-center hover:bg-gray-100 rounded-none',
              socialButtonsBlockButtonText: 'font-medium',
              footer: 'bg-white mt-6',
              footerAction: 'flex flex-col gap-2 items-start text-sm',
              footerActionText: 'text-black',
              footerActionLink: 'text-blue-600 underline',
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
