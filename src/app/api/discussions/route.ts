import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

// POST /api/discussions - create a new discussion
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      subjectType,
      playerId,
      playerIds,
      teamAbbreviation,
      subjectName,
      title,
      content,
      tags = [],
      engagementTags = [],
    } = await req.json();

    // Basic validation
    if (!subjectType || !["player", "team"].includes(subjectType)) {
      return NextResponse.json({ error: "Invalid subjectType" }, { status: 400 });
    }
    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }
    if (subjectType === "player" && !playerId && (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0)) {
      return NextResponse.json({ error: "Missing playerId or playerIds for player subject" }, { status: 400 });
    }
    if (subjectType === "team" && (!teamAbbreviation || typeof teamAbbreviation !== "string")) {
      return NextResponse.json({ error: "Missing teamAbbreviation for team subject" }, { status: 400 });
    }

    // Get user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertPayload: any = {
      subject_type: subjectType,
      player_id: subjectType === "player" && playerId ? playerId : null,
      player_ids: subjectType === "player" && playerIds ? playerIds : null,
      team_abbreviation: subjectType === "team" ? teamAbbreviation : null,
      subject_name: subjectName || null,
      title,
      content,
      tags,
      engagement_tags: engagementTags,
      created_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from("discussions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create discussion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discussion: data }, { status: 201 });
  } catch (err: any) {
    console.error("Unhandled error creating discussion:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/discussions?subject_type=player&player_id=123
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const subjectType = searchParams.get("subject_type");
    const playerId = searchParams.get("player_id");
    const teamAbbreviation = searchParams.get("team_abbreviation");
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);

    let query = supabase.from("discussions").select("*");

    if (subjectType === "player" && playerId) {
      query = query.eq("subject_type", "player").eq("player_id", Number(playerId));
    } else if (subjectType === "team" && teamAbbreviation) {
      query = query.eq("subject_type", "team").eq("team_abbreviation", teamAbbreviation);
    }

    // Order and paginate
    query = query.order("created_at", { ascending: false }).range(
      (page - 1) * limit,
      (page - 1) * limit + (limit - 1)
    );

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch discussions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discussions: data || [] });
  } catch (err: any) {
    console.error("Unhandled error fetching discussions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
