import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { refreshMetaTokens, refreshTikTokTokens } from "@/inngest/functions/refresh-tokens";
import { publishDuePosts, publishScheduledPost } from "@/inngest/functions/publish-post";
import { fetchPostAnalytics } from "@/inngest/functions/fetch-analytics";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    refreshMetaTokens,
    refreshTikTokTokens,
    publishDuePosts,
    publishScheduledPost,
    fetchPostAnalytics,
  ],
});
