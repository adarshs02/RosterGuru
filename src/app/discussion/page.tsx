import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { DiscussionCard, type Discussion } from "@/components/discussion-card";
import CreateDiscussionLauncher from "@/components/create-discussion-launcher";
import DiscussionPlayerFilter from "@/components/discussion-player-filter";
import { createClient } from "../../../supabase/server";

export const metadata = {
  title: "Discussion | RosterGuru",
  description: "Join the community to discuss players, strategies, and projections.",
};

export const revalidate = 0;

export default async function DiscussionPage({
  searchParams,
}: {
  searchParams: { player_ids?: string };
}) {
  const supabase = await createClient();

  // Build query with optional player filter
  let query = supabase
    .from("discussions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Apply player filter if present (supports multiple comma-separated IDs)
  if (searchParams.player_ids) {
    const playerIds = searchParams.player_ids.split(',').map(id => Number(id));
    query = query.eq("subject_type", "player").in("player_id", playerIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load discussions:", error.message);
  }

  // Aggregate votes for the listed discussions
  const ids: string[] = (data || []).map((d: any) => d.id);
  let voteAgg: Record<string, { up: number; down: number }> = {};
  let userVoteMap: Record<string, 1 | -1 | 0> = {};

  if (ids.length > 0) {
    const [{ data: votes }, { data: userResp }] = await Promise.all([
      supabase
        .from("discussion_votes")
        .select("discussion_id,user_id,value")
        .in("discussion_id", ids),
      supabase.auth.getUser(),
    ] as const);

    const currentUserId = userResp?.user?.id || null;
    for (const v of votes || []) {
      const key = v.discussion_id as string;
      if (!voteAgg[key]) voteAgg[key] = { up: 0, down: 0 };
      if (v.value === 1) voteAgg[key].up += 1;
      if (v.value === -1) voteAgg[key].down += 1;
      if (currentUserId && v.user_id === currentUserId) {
        userVoteMap[key] = v.value as 1 | -1;
      }
    }
  }

  // Fetch player data for player discussions to get headshots
  // Collect all player IDs from both player_id and player_ids fields
  const allPlayerIds = new Set<number>();
  (data || []).forEach((d: any) => {
    if (d.subject_type === "player") {
      if (d.player_id) allPlayerIds.add(d.player_id);
      if (d.player_ids && Array.isArray(d.player_ids)) {
        d.player_ids.forEach((id: number) => allPlayerIds.add(id));
      }
    }
  });

  let playerDataMap: Record<number, any> = {};
  if (allPlayerIds.size > 0) {
    const { data: playersData, error: playerError } = await supabase
      .from("current_players")
      .select("nba_player_id, player_name, headshot_url, team_abbreviation, position")
      .in("nba_player_id", Array.from(allPlayerIds));

    if (playerError) {
      console.error('Error fetching player data:', playerError);
    }

    playerDataMap = (playersData || []).reduce((acc: any, player: any) => {
      acc[player.nba_player_id] = player;
      return acc;
    }, {});
  }

  const discussions: Discussion[] = (data || []).map((d: any) => {
    let subject: Discussion["subject"];

    if (d.subject_type === "player") {
      // Handle both single player and multiple players
      if (d.player_ids && Array.isArray(d.player_ids) && d.player_ids.length > 0) {
        // Multiple players - collect all headshots
        const playerImages = d.player_ids
          .map((pid: number) => playerDataMap[pid]?.headshot_url)
          .filter((url: string | undefined) => url !== undefined);

        subject = {
          type: "player",
          name: d.subject_name || "Players",
          images: playerImages.length > 0 ? playerImages : undefined,
          team: playerDataMap[d.player_ids[0]]?.team_abbreviation,
        };
      } else if (d.player_id) {
        // Single player
        const playerData = playerDataMap[d.player_id];
        subject = {
          type: "player",
          name: d.subject_name || playerData?.player_name || "Player",
          image: playerData?.headshot_url,
          team: playerData?.team_abbreviation,
        };
      } else {
        // Fallback if no player data
        subject = {
          type: "player",
          name: d.subject_name || "Player",
          image: undefined,
          team: undefined,
        };
      }
    } else {
      subject = {
        type: "team",
        name: d.subject_name || d.team_abbreviation || "Team",
        logo: undefined,
      };
    }

    return {
      id: d.id,
      title: d.title,
      description: d.content,
      author: d.created_by ? "user" : "anonymous",
      subject,
      tags: d.tags || [],
      engagementTags: d.engagement_tags || [],
      upvotes: voteAgg[d.id]?.up || 0,
      downvotes: voteAgg[d.id]?.down || 0,
      comments: 0,
      createdAt: new Date(d.created_at).toLocaleString(),
      userVote: (userVoteMap[d.id] || 0) as 1 | -1 | 0,
    } as Discussion;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Discussion</h1>
          <p className="text-gray-600 mt-2">
            Community forums are coming soon. Start a conversation about players, teams, and fantasy strategy.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <CreateDiscussionLauncher />
        </div>

        <DiscussionPlayerFilter />

        <div className="grid gap-6">
          {discussions.length === 0 ? (
            <p className="text-muted-foreground">
              {searchParams.player_ids
                ? "No discussions found for the selected player(s). Be the first to create one!"
                : "No discussions yet. Be the first to create one!"}
            </p>
          ) : (
            discussions.map((discussion) => (
              <DiscussionCard key={discussion.id} discussion={discussion} />
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
