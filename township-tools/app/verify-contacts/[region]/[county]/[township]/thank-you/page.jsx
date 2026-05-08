"use client";

import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, MapPin, Home, Pencil } from "lucide-react";

function titleize(slug) {
  if (!slug) return "";
  return String(slug)
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

const ACTIONS = [
  {
    key: "again",
    title: "Review this list again",
    description: "Reopen this township's contact list to add more changes.",
    icon: Pencil,
    color: "emerald",
    href: (r, c, t) => `/verify-contacts/${r}/${c}/${t}`,
  },
  {
    key: "another",
    title: "Pick another township",
    description: "Verify another township's contacts.",
    icon: MapPin,
    color: "blue",
    href: () => `/verify-contacts`,
  },
  {
    key: "home",
    title: "Go to home",
    description: "Back to Township Tools.",
    icon: Home,
    color: "gray",
    href: () => `/`,
  },
];

const COLOR_CLASSES = {
  emerald: {
    iconBg: "bg-emerald-50 group-hover:bg-emerald-100",
    icon: "text-emerald-600",
    border: "group-hover:border-emerald-300",
    arrow: "group-hover:text-emerald-600",
  },
  blue: {
    iconBg: "bg-blue-50 group-hover:bg-blue-100",
    icon: "text-blue-600",
    border: "group-hover:border-blue-300",
    arrow: "group-hover:text-blue-600",
  },
  gray: {
    iconBg: "bg-gray-100 group-hover:bg-gray-200",
    icon: "text-gray-700",
    border: "group-hover:border-gray-400",
    arrow: "group-hover:text-gray-700",
  },
};

export default function ThankYouPage() {
  const router = useRouter();
  const params = useParams();
  const regionSlug = params.region;
  const countySlug = params.county;
  const townshipSlug = params.township;
  const townshipName = titleize(townshipSlug);
  const countyName = titleize(countySlug);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-gray-50 flex items-center">
      <div className="w-full max-w-2xl mx-auto px-6 py-12 sm:py-16">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Hero */}
          <div className="px-8 sm:px-10 pt-10 sm:pt-12 pb-8 text-center relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 ring-8 ring-emerald-50 mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Thank you!
            </h1>
            <p className="text-base sm:text-lg text-gray-700 mb-1">
              <span className="font-semibold text-gray-900">{townshipName}</span>
              {countyName ? (
                <span className="text-gray-500">, {countyName} County</span>
              ) : null}{" "}
              is now marked complete.
            </p>
            <p className="text-sm sm:text-base text-gray-500">
              Your changes are saved. ITA will use this list to keep our records accurate.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 sm:px-8 pb-8 sm:pb-10">
            <div className="text-xs uppercase tracking-wide font-semibold text-gray-400 text-center mb-3">
              What&apos;s next?
            </div>
            <div className="flex flex-col gap-3">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                const cls = COLOR_CLASSES[a.color];
                return (
                  <button
                    key={a.key}
                    onClick={() => router.push(a.href(regionSlug, countySlug, townshipSlug))}
                    className={`group flex items-center gap-4 w-full p-4 sm:p-5 bg-white border border-gray-200 rounded-xl text-left transition-all hover:shadow-md ${cls.border}`}
                  >
                    <div
                      className={`flex items-center justify-center w-11 h-11 rounded-lg flex-shrink-0 transition-colors ${cls.iconBg}`}
                    >
                      <Icon className={`w-5 h-5 ${cls.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-gray-900">{a.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{a.description}</div>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 text-gray-300 flex-shrink-0 transition-all ${cls.arrow} group-hover:translate-x-1`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          You can safely close this tab.
        </p>
      </div>
    </div>
  );
}
