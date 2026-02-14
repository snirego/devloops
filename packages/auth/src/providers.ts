// Social auth providers are configured in the Supabase dashboard.
// No code-level configuration is needed.
// Supported providers: Google, GitHub, Discord, etc.
// Configure them at: https://supabase.com/dashboard/project/<project-id>/auth/providers

export type SocialProvider = "google" | "github" | "discord" | "gitlab" | "bitbucket";

export const socialProviders: SocialProvider[] = [
  "google",
  "github",
  "discord",
];
