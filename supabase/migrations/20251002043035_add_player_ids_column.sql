-- Add support for multiple players in a single discussion
ALTER TABLE public.discussions
ADD COLUMN IF NOT EXISTS player_ids integer[];

-- Create index on player_ids for efficient lookups
CREATE INDEX IF NOT EXISTS discussions_player_ids_idx ON public.discussions USING GIN (player_ids);

-- Update the constraint
ALTER TABLE public.discussions
DROP CONSTRAINT IF EXISTS discussions_subject_ref_check;

ALTER TABLE public.discussions
ADD CONSTRAINT discussions_subject_ref_check
CHECK (
    (subject_type = 'player' AND (player_id IS NOT NULL OR player_ids IS NOT NULL) AND team_abbreviation IS NULL)
    OR (subject_type = 'team' AND team_abbreviation IS NOT NULL AND player_id IS NULL AND player_ids IS NULL)
);
