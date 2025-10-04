import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../../supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const discussionId = params.id;
    const { value } = await req.json(); // 1 or -1

    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up existing vote
    const { data: existing, error: existingErr } = await supabase
      .from("discussion_votes")
      .select("id, value")
      .eq("discussion_id", discussionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      console.error("Vote lookup failed", existingErr);
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    // Toggle rules
    if (!existing) {
      const { error: insertErr } = await supabase.from("discussion_votes").insert({
        discussion_id: discussionId,
        user_id: user.id,
        value,
      });
      if (insertErr) {
        console.error("Vote insert failed", insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    } else if (existing.value === value) {
      const { error: deleteErr } = await supabase
        .from("discussion_votes")
        .delete()
        .eq("id", existing.id);
      if (deleteErr) {
        console.error("Vote delete failed", deleteErr);
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }
    } else {
      const { error: updateErr } = await supabase
        .from("discussion_votes")
        .update({ value })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("Vote update failed", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    // Fetch updated votes for this discussion and compute counts
    const { data: votes, error: fetchErr } = await supabase
      .from("discussion_votes")
      .select("user_id, value")
      .eq("discussion_id", discussionId);

    if (fetchErr) {
      console.error("Fetching votes failed", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    let upvotes = 0;
    let downvotes = 0;
    let userVote: 1 | -1 | 0 = 0;

    for (const v of votes || []) {
      if (v.value === 1) upvotes += 1;
      if (v.value === -1) downvotes += 1;
      if (v.user_id === user.id) userVote = v.value as 1 | -1;
    }

    const score = upvotes - downvotes;

    return NextResponse.json({ upvotes, downvotes, score, userVote });
  } catch (err: any) {
    console.error("Unhandled vote error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
