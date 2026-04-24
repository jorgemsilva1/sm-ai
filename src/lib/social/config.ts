export const META_API_VERSION = "v25.0";
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * OAuth scopes for each Meta provider.
 * These scopes require Meta App Review for live mode.
 * In development mode, only app admins/testers can connect.
 */
export const META_SCOPES = {
  instagram: [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ],
  facebook: [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_engagement",
  ],
} as const;
