'use server';
/**
 * @fileOverview An AI-powered personalized content feed recommendation engine.
 *
 * - aiPoweredDiscoveryFeed - A function that recommends videos and photos based on user interactions.
 * - AIPoweredDiscoveryFeedInput - The input type for the aiPoweredDiscoveryFeed function.
 * - AIPoweredDiscoveryFeedOutput - The return type for the aiPoweredDiscoveryFeed function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIPoweredDiscoveryFeedInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting the feed.'),
  userLikedPosts: z.array(z.string()).describe('A list of IDs of posts the user has liked.'),
  userCommentedPosts: z.array(z.string()).describe('A list of IDs of posts the user has commented on.'),
  userWatchedVideos: z.array(z.string()).describe('A list of IDs of videos the user has watched.'),
  userFollowedAccounts: z.array(z.string()).describe('A list of IDs of users the current user follows.'),
  currentTimestamp: z
    .string()
    .datetime()
    .describe('The current timestamp to ensure freshness of recommendations, formatted as an ISO 8601 string.'),
  limit: z
    .number()
    .int()
    .positive()
    .default(20)
    .describe('The maximum number of recommended posts to return.'),
});
export type AIPoweredDiscoveryFeedInput = z.infer<typeof AIPoweredDiscoveryFeedInputSchema>;

const AIPoweredDiscoveryFeedOutputSchema = z.object({
  recommendedPostIds: z.array(z.string()).describe('An array of IDs of recommended posts.'),
});
export type AIPoweredDiscoveryFeedOutput = z.infer<typeof AIPoweredDiscoveryFeedOutputSchema>;

const aiPoweredDiscoveryFeedPrompt = ai.definePrompt({
  name: 'aiPoweredDiscoveryFeedPrompt',
  input: {schema: AIPoweredDiscoveryFeedInputSchema},
  output: {schema: AIPoweredDiscoveryFeedOutputSchema},
  prompt: `You are an AI-powered content recommendation engine for a social media platform called Phriendzy. Your task is to analyze user activity and preferences to suggest new and engaging videos and photos.

Here is the user's interaction data:
- User ID: {{{userId}}}
- Liked Posts: {{{userLikedPosts}}}
- Commented Posts: {{{userCommentedPosts}}}
- Watched Videos: {{{userWatchedVideos}}}
- Followed Accounts: {{{userFollowedAccounts}}}
- Current Time: {{{currentTimestamp}}}

Based on this information, identify patterns in the user's interests, preferred content types (videos vs. photos), and the creators they follow. Your goal is to generate a diverse list of exactly {{{limit}}} unique post IDs that the user would likely find highly engaging and relevant to their interests.

Ensure that the recommended post IDs are new and have not been previously interacted with by the user (i.e., not in 'userLikedPosts', 'userCommentedPosts', or 'userWatchedVideos'). Invent plausible, unique string IDs for these recommendations that could represent actual posts within the system. Prioritize content from creators similar to those the user follows and topics related to their past engagement. The recommendations should be a mix of content types if the user's history shows diverse interests.

Return only the list of recommended post IDs in the specified JSON format.`,
});

export async function aiPoweredDiscoveryFeed(input: AIPoweredDiscoveryFeedInput): Promise<AIPoweredDiscoveryFeedOutput> {
  return aiPoweredDiscoveryFeedFlow(input);
}

const aiPoweredDiscoveryFeedFlow = ai.defineFlow(
  {
    name: 'aiPoweredDiscoveryFeedFlow',
    inputSchema: AIPoweredDiscoveryFeedInputSchema,
    outputSchema: AIPoweredDiscoveryFeedOutputSchema,
  },
  async input => {
    const {output} = await aiPoweredDiscoveryFeedPrompt(input);
    return output!;
  }
);
