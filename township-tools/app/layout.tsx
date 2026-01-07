import type { Metadata } from "next";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Township Tools - Professional Reports for Indiana Townships",
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
        <body className="bg-slate-900 text-white">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
