"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";

export default function HomeCtaButton() {
  const baseClass =
    "inline-flex items-center px-8 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium";

  return (
    <div>
      <SignedIn>
        <Link href="/dashboard" className={baseClass}>
          Go to Dashboard
          <ArrowUpRight className="ml-2 w-5 h-5" />
        </Link>
      </SignedIn>
      <SignedOut>
        <SignUpButton mode="modal">
          <button className={baseClass}>
            Join for Free
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </button>
        </SignUpButton>
      </SignedOut>
    </div>
  );
}
