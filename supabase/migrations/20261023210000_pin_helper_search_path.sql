-- Pin search_path on the three helpers added in 20261023200000_document_allowlist.
-- Their bodies use only built-ins (pg_catalog is always searched), so an empty path is safe.
alter function public.jsonb_is_blank(jsonb) set search_path = '';
alter function public.player_road_keys() set search_path = '';
alter function public.player_document_keys() set search_path = '';
