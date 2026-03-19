import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Script from "next/script";
import GlobalChatBubble from "@/components/GlobalChatBubble";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CPNS Platform - Computer Based Test",
  description: "Enterprise-grade CPNS simulation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            {children}
            <GlobalChatBubble />
            <Toaster />
            <Script 
              src={process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' 
                ? 'https://app.midtrans.com/snap/snap.js' 
                : 'https://app.sandbox.midtrans.com/snap/snap.js'} 
              data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
              strategy="beforeInteractive"
            />
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
