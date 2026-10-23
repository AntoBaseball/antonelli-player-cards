/* Antonelli accounts.
   The anon key is meant to be public. Never put the service role key in this file.
   Clear both strings to fall back to the sample roster with accounts turned off. */
const ANTONELLI_CONFIG = {
  SUPABASE_URL: "https://cqmzxrhoxnktjrzqtdsi.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxbXp4cmhveG5rdGpyenF0ZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Njg2NjUsImV4cCI6MjEwODM0NDY2NX0.uhH4pYM2WsqR27vwtiK4dL0Iqzf2cLS397EDS1Aeno0",
};
globalThis.ANTONELLI_CONFIG = ANTONELLI_CONFIG;
