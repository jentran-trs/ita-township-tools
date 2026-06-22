"use client";

import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const ScoringTool = dynamic(() => import("@/components/ScoringTool"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading Scoring Tool...</p>
      </div>
    </div>
  ),
});

export default function ScoringToolPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
            <div className="border-l border-slate-300 pl-4 flex items-center gap-2.5">
              <img
                src="/ita-logo.png"
                alt="Indiana Township Association"
                className="w-9 h-9"
              />
              <span className="text-slate-900 font-medium">SB 270 Scoring Tool</span>
            </div>
          </div>
          <button
            onClick={() => router.push("/sign-in")}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Admin Login
          </button>
        </div>
      </header>
      <div className="pt-14">
        <ScoringTool />
      </div>
    </div>
  );
}
