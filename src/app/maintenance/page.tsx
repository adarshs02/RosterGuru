import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { Wrench, RefreshCcw } from "lucide-react";

export const metadata = {
  title: "Maintenance | RosterGuru",
  description: "RosterGuru is temporarily unavailable while we perform maintenance.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Scheduled Maintenance</h1>
          <p className="mt-3 text-gray-600">
            RosterGuru is temporarily unavailable while we perform maintenance and upgrades.
            We'll be back shortly. Thank you for your patience.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-white hover:bg-amber-700 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
