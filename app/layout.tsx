import PrivyProvider from "@/components/PrivyProvider";
import { Toaster } from "@/components/ui/toaster";
import { SignupProvider } from "@/contexts/CreatorSignupContext";
import { TwitterAuthProvider } from "@/contexts/TwitterAuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { HeaderProvider } from "@/contexts/HeaderContext";
import AppLayout from "@/components/AppLayout";
import NewHeader from "@/components/NewHeader";
import MiniKitProviderWrapper from "@/components/MiniKitProviderWrapper";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import type React from "react";
import Footer from "./components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Generate metadata with dynamic OG image URL based on referral code
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const domain = process.env.NEXT_PUBLIC_APP_URL || "https://dopamyn.fun";
  const ogImageUrl = headersList.get("x-og-image") || `${domain}/api/og`;

  return {
    title: {
      default: "Dopamyn",
      template: "%s | Dopamyn",
    },
    description:
      "Slow Growth Ain't DOPE!",
    keywords:
      "Dopamyn, Dope, Web3, KOL, Influencer Marketing, Crypto, Blockchain, Decentralized, AI, Campaign Management, Mindshare",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: domain,
      title: "Dopamyn",
      description:
        "Slow Growth Ain't DOPE!",
      siteName: "Dopamyn",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Dopamyn",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Dopamyn",
      description:
        "Slow Growth Ain't DOPE!",
      creator: "@dopamyn_fun",
      site: "@dopamyn_fun",
      images: [ogImageUrl],
    },
    generator: "Next.js",
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/favicon-dope.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-dope.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon-dope.svg" />

        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-396XS5TT96"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-396XS5TT96');
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} bg-dark-primary text-white`}
        suppressHydrationWarning
      >
        <PrivyProvider>
          <MiniKitProviderWrapper>
          <TwitterAuthProvider>
            <UserProvider>
              <SignupProvider>
                <HeaderProvider>
                  <NewHeader />
                  <AppLayout>{children}</AppLayout>
                  <Footer />
                  <Toaster />
                </HeaderProvider>
              </SignupProvider>
            </UserProvider>
          </TwitterAuthProvider>
          </MiniKitProviderWrapper>
        </PrivyProvider>
      </body>
    </html>
  );
}
