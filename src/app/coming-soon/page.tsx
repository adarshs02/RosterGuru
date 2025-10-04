import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";
import { Rocket, Hourglass } from "lucide-react";

export const metadata = {
  title: "Coming Soon | RosterGuru",
  description: "This feature is under active development and will be available soon.",
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Hourglass className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Coming Soon</h1>
          <p className="mt-3 text-gray-600">
            We're putting the final touches on this feature. Check back soon or follow updates on the homepage.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 transition-colors"
            >
              <Rocket className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/discussion"
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Join the Discussion
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
