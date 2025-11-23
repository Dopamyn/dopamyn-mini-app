"use client";

import ReferralHandler from "@/app/components/ReferralHandler";
// import TelegramBotJoin from "@/components/TelegramBotJoin";
// import { Metadata } from "next";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoFullIcon from "@/public/icons/LogoFullIcon";
import TypewriterEffect from "@/components/TypewriterEffect";


export default function LandingPage() {
  return (
    <div className="relative">
      {/* Background Image */}
      <div className="pointer-events-none select-none fixed inset-0 -z-10 bg-[url('/landingPageBg.png')] bg-[length:100%_100%] bg-center opacity-25" />

      <Suspense fallback={null}>
        <ReferralHandler />
      </Suspense>

      {/* Hero Section */}
      <section className="relative flex items-center px-4 sm:px-6 lg:px-8 sm:min-h-[calc(100vh-86px)] min-h-[calc(100vh-125px)]">
        <div className="max-w-4xl mx-auto text-center">
          {/* Centered Logo */}
          <Link
            href="/"
            className="flex items-center justify-center mb-6 select-none "
          >
            <span className="block md:hidden">
              <LogoFullIcon width="170" height="62" />
            </span>
            <span className="hidden md:block">
              <LogoFullIcon width="350" height="120" />
            </span>
          </Link>

          {/* Main Heading */}
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@900&display=swap"
            rel="stylesheet"
          />
          <h1
            className="md:text-[66px] text-[30px] font-bold text-light-primary leading-tight mb-6 whitespace-nowrap"
            style={{
              fontFamily: "'Roboto Slab', Arial, sans-serif",
              fontWeight: 900,
            }}
          >
            <TypewriterEffect
              text="Slow Growth ain't Dope!"
              speed={85}
              showCursor={true}
            />
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 justify-center items-center">
            {/* <Link
              href="/kols"
              className="btn-secondarynew inline-flex items-center justify-center"
            >
              Find top KOLs
            </Link> */}
            <Link
              href="/campaigns"
              className="btn-primarynew inline-flex items-center justify-center "
            >
              Start Earning
            </Link>
          </div>

          {/* Telegram Bot Join Section */}
          {/* <div className="mt-12 max-w-md mx-auto">
            <TelegramBotJoin />
          </div> */}
        </div>
      </section>
    </div>
  );
}
// export default function HomePage() {
//   const router = useRouter();

//   // useEffect(() => {
//   //   // Small delay to ensure ReferralHandler has time to capture the referral code
//   //   const timer = setTimeout(() => {
//   //     router.push("/campaigns");
//   //   }, 100);

//   //   return () => clearTimeout(timer);
//   // }, [router]);

//   return (
//     <div>
//       <Suspense fallback={null}>
//         <ReferralHandler />
//       </Suspense>
//     </div>
//   );
// }
