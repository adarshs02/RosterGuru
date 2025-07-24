import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  MessageSquare,
  Target,
  Database,
  TrendingUp,
  Users2,
  Trophy,
} from "lucide-react";
import { createClient } from "../../supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need for Fantasy Basketball Success
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools and data to dominate your fantasy basketball
              leagues with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Database className="w-6 h-6" />,
                title: "Player Database",
                description:
                  "Sortable table with 10+ years of historical NBA stats and z-score rankings",
                badge: "Core Feature",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Player Profiles",
                description:
                  "Detailed career progression with season-by-season statistical breakdowns",
                badge: "Analytics",
              },
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: "Discussion Forums",
                description:
                  "Threaded conversations organized by players, teams, and strategies",
                badge: "Community",
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: "Projection Sharing",
                description:
                  "Upload and compare player projections with community consensus",
                badge: "Predictions",
              },
            ].map((feature, index) => {
              // Make Player Database card clickable
              const isPlayerDatabase = feature.title === "Player Database";
              
              const cardContent = (
                <Card className={`hover:shadow-lg transition-shadow ${
                  isPlayerDatabase ? 'cursor-pointer hover:border-orange-200' : ''
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-orange-600">{feature.icon}</div>
                      <Badge variant="secondary" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {feature.title}
                      {isPlayerDatabase && (
                        <ArrowUpRight className="w-4 h-4 text-orange-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
              
              return isPlayerDatabase ? (
                <Link key={index} href="/players">
                  {cardContent}
                </Link>
              ) : (
                <div key={index}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Trusted by Fantasy Basketball Enthusiasts
            </h2>
            <p className="text-orange-100 max-w-2xl mx-auto">
              Join a growing community of data-driven fantasy players
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10+</div>
              <div className="text-orange-100">Years of NBA Data</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-orange-100">Active Players</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-orange-100">Player Discussions</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How RosterGuru Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to elevate your fantasy basketball game
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Database className="w-8 h-8" />,
                title: "Explore Player Data",
                description:
                  "Browse our comprehensive database of NBA players with historical stats, z-scores, and advanced metrics.",
              },
              {
                step: "02",
                icon: <Users2 className="w-8 h-8" />,
                title: "Join Discussions",
                description:
                  "Engage with the community in player-specific threads, share insights, and learn from other fantasy experts.",
              },
              {
                step: "03",
                icon: <Trophy className="w-8 h-8" />,
                title: "Make Winning Moves",
                description:
                  "Use data-driven insights and community wisdom to make informed decisions and dominate your leagues.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-full mb-6">
                  {step.icon}
                </div>
                <div className="text-sm font-semibold text-orange-600 mb-2">
                  STEP {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Dominate Your Fantasy League?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of fantasy basketball players who use RosterGuru to
            make smarter, data-driven decisions.
          </p>
          <Link
            href={user ? "/dashboard" : "/sign-up"}
            className="inline-flex items-center px-8 py-4 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors text-lg font-medium"
          >
            {user ? "Go to Dashboard" : "Get Started Free"}
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
