-- Discussions schema linking to players/teams
-- Create enum for subject type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_type') THEN
        CREATE TYPE subject_type AS ENUM ('player', 'team');
    END IF;
END
$$;

-- Create discussions table
CREATE TABLE IF NOT EXISTS public.discussions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type subject_type NOT NULL,
    player_id integer,
    team_abbreviation text,
    subject_name text,
    title text NOT NULL,
    content text NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    engagement_tags text[] NOT NULL DEFAULT '{}',
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- Constraint: ensure subject reference matches subject_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'discussions_subject_ref_check'
    ) THEN
        ALTER TABLE public.discussions
        ADD CONSTRAINT discussions_subject_ref_check
        CHECK (
            (subject_type = 'player' AND player_id IS NOT NULL AND team_abbreviation IS NULL)
            OR (subject_type = 'team' AND team_abbreviation IS NOT NULL AND player_id IS NULL)
        );
    END IF;
END
$$;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS discussions_player_id_idx ON public.discussions (player_id);
CREATE INDEX IF NOT EXISTS discussions_team_abbrev_idx ON public.discussions (team_abbreviation);
CREATE INDEX IF NOT EXISTS discussions_created_at_idx ON public.discussions (created_at DESC);

-- Enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- Policies (development-friendly: open read/insert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'discussions' AND policyname = 'Allow read to all'
    ) THEN
        CREATE POLICY "Allow read to all" ON public.discussions
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'discussions' AND policyname = 'Allow insert to all'
    ) THEN
        CREATE POLICY "Allow insert to all" ON public.discussions
        FOR INSERT WITH CHECK (true);
    END IF;
END
$$;
