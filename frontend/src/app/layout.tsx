import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./donations.css";
import "katex/dist/katex.min.css";

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { themeBootstrap } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOCPNS — Ruang latihan CPNS",
  description:
    "Simulasi CAT, hasil latihan yang jelas, dan pembahasan untuk langkah belajar berikutnya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <GoogleOAuthProvider clientId={googleClientId}>
            <AuthProvider>
              {children}

              <Toaster
                toastOptions={{
                  style: {
                    background: "var(--surface)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow)",
                  },
                }}
              />
            </AuthProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
