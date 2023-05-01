// npx tsx
// bsky = await import('@atproto/api')
// BskyAgent = bsky.BskyAgent
// const agent = new BskyAgent({service: 'https://bsky.social',});
// await agent.login({identifier: process.env.BSKY_USERNAME!,password: process.env.BSKY_PASSWORD!,});

import bsky from '@atproto/api';
const { BskyAgent } = bsky;
import * as dotenv from 'dotenv';
import process from 'node:process';
dotenv.config();

const agent = new BskyAgent({
  service: 'https://bsky.social',
});

// 100 is the limit per request
await agent.getAuthorFeed({actor: 'exgenesis.ingroup.social', limit:100})

const getAllPosts = async (actor: string) => {
  const posts: bsky.AppBskyFeedDefs.FeedViewPost[] = [];
  let cursor: string | undefined;
  do {
    const {data: { feed, cursor: nextCursor }} = await agent.getAuthorFeed({ actor, cursor });
    posts.push(...feed);
    cursor = nextCursor;
  } while (cursor);
  return posts;
};


console.log()

// const bleet = 'You can find the code for this bleet >>>here<<<, with a link card, a title and a description!';
// await agent.post({
//   text: bleet,
//   facets: [
//     {
//       index: { byteStart: bleet.indexOf('>>>') + 3, byteEnd: bleet.indexOf('<<<') },
//       features: [
//         {
//           $type: 'app.bsky.richtext.facet#link',
//           uri: 'https://github.com/aliceisjustplaying/atproto-starter-kit',
//         }
//       ]
//     }
//   ],
//   embed: {
//     $type: 'app.bsky.embed.external',
//     external: {
//       uri: 'https://github.com/aliceisjustplaying/atproto-starter-kit',
//       title: "alice's atproto starter kit",
//       description: "i'm just playing around with the api",
//     },
//   },
// });
