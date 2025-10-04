"use client";

import { SignUpButton } from "@clerk/nextjs";
import { ArrowUpRight } from "lucide-react";

export default function JoinForFreeButton() {
  return (
    <SignUpButton mode="modal">
      <button className="inline-flex items-center px-8 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium">
        Join for Free
        <ArrowUpRight className="ml-2 w-5 h-5" />
      </button>
    </SignUpButton>
  );
}
