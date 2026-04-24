export type PublishResult = {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

export type PostInsights = {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  clicks: number;
};

export type SocialAccountRow = {
  id: string;
  client_id: string;
  owner_id: string;
  provider: string;
  provider_account_id: string | null;
  username: string | null;
  display_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
  page_access_token: string | null;
  page_id: string | null;
  token_status: string | null;
  scopes: string[] | null;
};

export type ScheduleItemForPublish = {
  id: string;
  platform: string;
  format: string;
  title: string;
  caption: string;
  assets: Array<{ url: string; type: string; aspect_ratio?: string }> | null;
  scheduled_at: string;
};

export type PlatformPublisher = {
  publish(post: ScheduleItemForPublish, account: SocialAccountRow): Promise<PublishResult>;
  getInsights(externalId: string, account: SocialAccountRow): Promise<PostInsights>;
};
