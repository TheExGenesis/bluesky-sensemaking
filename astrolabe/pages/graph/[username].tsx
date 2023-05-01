import { ForceGraphUI, Link, Node } from '@/components/ForceGraph'; // assuming the component is exported from './ForceGraph'
import { LoginScreen } from '@/components/LoginScreen';
import { TweetList } from '@/components/TweetList';
import { LoginResponseDataType } from '@/helpers/bsky';
import { useLocalStorageState } from '@/helpers/hooks';
import * as bsky from '@atproto/api';
import { AppBskyFeedDefs, BskyAgent } from '@atproto/api';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import * as jwt from 'jsonwebtoken';
import { useEffect, useRef, useState } from 'react';

export interface GraphData {
  nodes: Node[];
  links: Link[];
  adjList: { [key: string]: string[] };
  reverseAdjList: { [key: string]: string[] };
}

export const getAllPosts = async (
  agent: bsky.BskyAgent,
  actorName: string,
): Promise<bsky.AppBskyFeedDefs.FeedViewPost[]> => {
  const posts: bsky.AppBskyFeedDefs.FeedViewPost[] = [];
  let cursor: string | undefined;
  do {
    let response;
    try {
      // TODO: fix authentication error that gets thrown but then the request succeeds
      response = await agent.getAuthorFeed({ actor: actorName, cursor });
    } catch (e) {
      console.error(e);
      return [];
      // throw e;
    }
    if (!response.success) {
      throw new Error('Failed to get timeline');
    }
    const {
      data: { feed, cursor: nextCursor },
    } = response;

    posts.push(...feed);
    cursor = nextCursor;
  } while (cursor);
  console.log({ posts });
  return posts;
};

const feedPostsToGraph = (feedPosts: bsky.AppBskyFeedDefs.FeedViewPost[]): GraphData => {
  const nodes: Node[] = [];
  const links: Link[] = [];
  const postMap: { [key: string]: bsky.AppBskyFeedDefs.FeedViewPost } = {};
  const adjList: { [key: string]: string[] } = {};
  const reverseAdjList: { [key: string]: string[] } = {};
  // add nodes
  feedPosts.forEach((feedPost) => {
    postMap[feedPost.post.cid] = feedPost;
    nodes.push({ id: feedPost.post.cid, group: feedPost.post.author.did, post: feedPost.post });
  });
  // add links
  feedPosts.forEach((feedPost) => {
    if (feedPost.reply) {
      if (!postMap[feedPost.reply.parent.cid]) {
        const feedPostView = { post: feedPost.reply.parent, root: feedPost.reply.root };
        postMap[feedPost.reply.parent.cid] = feedPostView;
        nodes.push({ id: feedPost.reply.parent.cid, group: feedPost.reply.parent.author.did, post: feedPostView.post });
      }
      links.push({ source: feedPost.post.cid, target: feedPost.reply.parent.cid });
      adjList[feedPost.post.cid] = adjList[feedPost.post.cid] || [];
      adjList[feedPost.post.cid].push(feedPost.reply.parent.cid);
      reverseAdjList[feedPost.reply.parent.cid] = reverseAdjList[feedPost.reply.parent.cid] || [];
      reverseAdjList[feedPost.reply.parent.cid].push(feedPost.post.cid);
    }
    // if (post.post.embed) {
    //     links.push({source: post.post.cid, target: post.post.embed.cid});
    // }
  });
  return { nodes, links, adjList, reverseAdjList };
};

const getPostThead = async (agent: BskyAgent, uri: string, depth: number = 100) => {
  const response = await agent.getPostThread({ uri, depth });
  if (!response.success) {
    throw new Error('Failed to get timeline');
  }
  if (response.data.thread.notFound) {
    throw new Error('Post not found');
  }
  return response.data.thread as AppBskyFeedDefs.ThreadViewPost;
};

const threadToPostList = (thread: AppBskyFeedDefs.ThreadViewPost): AppBskyFeedDefs.ThreadViewPost[] => {
  const posts: AppBskyFeedDefs.ThreadViewPost[] = [];
  const addPost = (threadPost: AppBskyFeedDefs.ThreadViewPost) => {
    const parent = threadPost.parent;
    if (parent && !parent.notFound) {
      addPost(parent as AppBskyFeedDefs.ThreadViewPost);
    }
    posts.push(threadPost);
    const replies = threadPost.replies?.filter((reply) => !reply.notFound) as AppBskyFeedDefs.ThreadViewPost[];
    replies.forEach((reply) => {
      addPost(reply);
    });
  };
  addPost(thread);
  return posts;
};

const threadToSubgraph = (thread: AppBskyFeedDefs.ThreadViewPost) => {
  // travel the reply tree and build a graph
  const nodes: Node[] = [];
  const links: Link[] = [];
  const postMap: { [key: string]: bsky.AppBskyFeedDefs.FeedViewPost } = {};
  const adjList: { [key: string]: string[] } = {};
  const reverseAdjList: { [key: string]: string[] } = {};

  const addPost = (threadPost: AppBskyFeedDefs.ThreadViewPost) => {
    if (!postMap[threadPost.post.cid]) {
      postMap[threadPost.post.cid] = threadPost;
      nodes.push({ id: threadPost.post.cid, group: threadPost.post.author.did, post: threadPost.post });
    }
    const replies = threadPost.replies?.filter((reply) => !reply.notFound) as AppBskyFeedDefs.ThreadViewPost[];
    replies.forEach((reply) => {
      // if (!postMap[reply.post.cid]) {
      //   postMap[reply.post.cid] = reply;
      //   nodes.push({ id: reply.post.cid, group: reply.post.author.did, post: reply.post });
      // }
      links.push({ source: threadPost.post.cid, target: reply.post.cid });
      adjList[threadPost.post.cid] = adjList[threadPost.post.cid] || [];
      adjList[threadPost.post.cid].push(reply.post.cid);
      reverseAdjList[reply.post.cid] = reverseAdjList[reply.post.cid] || [];
      reverseAdjList[reply.post.cid].push(threadPost.post.cid);
      addPost(reply);
    });
    const parent = threadPost.parent as AppBskyFeedDefs.ThreadViewPost;
    if (parent && !parent.notFound) {
      // if (!postMap[parent.post.cid]) {
      //   postMap[parent.post.cid] = parent;
      //   nodes.push({ id: parent.post.cid, group: parent.post.author.did, post: parent.post });
      // }
      links.push({ source: parent.post.cid, target: threadPost.post.cid });
      adjList[parent.post.cid] = adjList[parent.post.cid] || [];
      adjList[parent.post.cid].push(threadPost.post.cid);
      reverseAdjList[threadPost.post.cid] = reverseAdjList[threadPost.post.cid] || [];
      reverseAdjList[threadPost.post.cid].push(parent.post.cid);
      addPost(parent);
    }
  };
  addPost(thread);
  return { nodes, links, adjList, reverseAdjList };

  // agent = temp1
  // agent.getPostThread({ uri:'at://did:plc:zwvvhna4ucqumdxvwqasu5lf/app.bsky.feed.post/3ju4yzuzr5q2p', depth:100});
};

export default function Main() {
  // Bluesky API
  const agent = useRef<BskyAgent>(
    new BskyAgent({
      service: 'https://bsky.social',
    }),
  ).current;

  // Auth stuff
  const [loginResponseData, setLoginResponseData] = useLocalStorageState<LoginResponseDataType | null>(
    '@loginResponseData',
    null,
  );
  const identifier = loginResponseData?.handle;
  const accessJwt = !!loginResponseData?.accessJwt
    ? (jwt.decode(loginResponseData.accessJwt) as {
        exp: number;
        iat: number;
        scope: string;
        sub: string;
      })
    : null;
  const loginExpiration = accessJwt?.exp;
  const timeUntilLoginExpire = loginExpiration ? loginExpiration * 1000 - Date.now() : null;
  useEffect(() => {
    if (timeUntilLoginExpire) {
      const timeout = setTimeout(() => {
        setLoginResponseData(null);
      }, Math.max(timeUntilLoginExpire, 0));

      return () => clearTimeout(timeout);
    }
  }, [timeUntilLoginExpire]);
  useEffect(() => {
    if (loginResponseData && !agent.session) {
      agent.resumeSession(loginResponseData);
    }
  }, [loginResponseData]);

  const focusedPostIdState = useState<string | null>(null);
  const [focusedPostId, setFocusedIdPost] = focusedPostIdState;
  const [allFeedPosts, setAllFeedPosts] = useState<bsky.AppBskyFeedDefs.FeedViewPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<bsky.AppBskyFeedDefs.FeedViewPost[] | null>(null);
  const [personalGraph, setPersonalGraph] = useState<GraphData>({
    nodes: [],
    links: [],
    adjList: {},
    reverseAdjList: {},
  });
  const [displayGraph, setDisplayGraph] = useState<GraphData | null>(null);
  const [nodeDict, setNodeDict] = useState<Record<string, Node>>({});
  const [postDict, setPostDict] = useState<Record<string, PostView>>({});

  useEffect(() => {
    // keep a dictionary of cid: nodes for quick lookup
    const nodeDict: Record<string, Node> = {};
    personalGraph.nodes.forEach((node) => {
      if (node.post) {
        nodeDict[node.post.cid] = node;
      }
    });
    setNodeDict(nodeDict);
  }, [personalGraph]);

  useEffect(() => {
    console.log({ agent });
    getAllPosts(agent, identifier ?? '').then((feedPosts) => {
      setAllFeedPosts(feedPosts);
    });
  }, [agent, identifier]);

  useEffect(() => {
    setPersonalGraph(feedPostsToGraph(allFeedPosts));

    const newPostDict: Record<string, PostView> = {};
    allFeedPosts.forEach((feedPost) => {
      newPostDict[feedPost.post.cid] = feedPost.post;
    });
    setPostDict(newPostDict);
    console.log({ graph: personalGraph, newPostDict });
  }, [allFeedPosts]);

  useEffect(() => {
    if (focusedPostId && nodeDict[focusedPostId]?.post?.uri) {
      const uri = nodeDict[focusedPostId].post?.uri as string;

      getPostThead(agent, uri).then((thread) => {
        const subgraph = threadToSubgraph(thread);
        setDisplayGraph(subgraph);
        const postList = threadToPostList(thread);
        setDisplayPosts(postList);
        console.log({ thread, subgraph, postList });
      });
    } else if (!focusedPostId) {
      setDisplayGraph(null);
      setDisplayPosts(null);
    }
  }, [focusedPostId]);
  return (
    <>
      {/* <Head>
          <title>Skyline</title>
          <link rel="icon" href="/skyline-16.png" />
        </Head> */}
      <div className="w-full h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
        {identifier ? (
          // side by side
          <div className="flex flex-row h-full">
            {focusedPostId && (
              <button
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800"
                onClick={() => setFocusedIdPost(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-slate-900 dark:text-slate-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <ForceGraphUI
              agent={agent}
              graph={displayGraph ?? personalGraph}
              nodeDict={nodeDict}
              focusedPostState={focusedPostIdState}
              identifier={identifier}
            />

            <TweetList posts={displayPosts ?? allFeedPosts} nodeDict={nodeDict} focusedPostState={focusedPostIdState} />
          </div>
        ) : (
          <LoginScreen setLoginResponseData={setLoginResponseData} agent={agent} />
        )}
      </div>
    </>
  );
}
