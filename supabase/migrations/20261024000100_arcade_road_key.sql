-- Add the arcade road key so a signed-in player can save road.arcade (Quick Eyes Arcade progress).
-- Same list as 20261023200000_document_allowlist plus arcade. Keep in sync with AntonelliAuth.roadKeys in auth.js.
-- search_path stays pinned to '' (20261023210000_pin_helper_search_path). Safe to run more than once.
create or replace function public.player_road_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'xp', 'streaks', 'dates', 'missions', 'missionDay', 'dailyBonus',
    'trainingLog', 'miniDay', 'miniXp', 'streakPaid', 'hotUntil',
    'prs', 'challenges', 'trophies', 'rivalry', 'videos', 'vision',
    'skin', 'celebration', 'signature', 'autograph', 'autographTier',
    'arcade'
  ];
$$;

revoke all on function public.player_road_keys() from public, anon, authenticated;
