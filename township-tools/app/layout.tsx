import type { Metadata } from "next";
import Script from "next/script";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: "Township Tools - Professional Apps for Townships",
  description: "Create stunning annual reports, manage township data, and streamline your workflow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Apply saved dark/light preference BEFORE React hydrates so the
              correct theme paints on first frame (avoids a flash of light
              for users who prefer dark, or vice versa). */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('tt_theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
            }}
          />
        </head>
        <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          {children}
          <ThemeToggle />
          {GA_MEASUREMENT_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}');
                `}
              </Script>
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
