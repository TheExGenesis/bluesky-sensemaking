import PostLight from '@/components/PostLight';
import { ExpandedPostView } from '@/helpers/contentTypes';
import * as bsky from '@atproto/api';
import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { MouseEventHandler, useCallback, useEffect, useState } from 'react';
import { Node } from './ForceGraph';

export type FocusedPostState = [string | undefined | null, React.Dispatch<React.SetStateAction<string | null>>];

export function TweetList(props: {
  posts: bsky.AppBskyFeedDefs.FeedViewPost[];
  nodeDict: Record<string, Node>;
  focusedPostState: FocusedPostState;
}) {
  const { posts, nodeDict, focusedPostState } = props;
  const [postViews, setPostViews] = useState<any[]>([]);
  const [focusedPostId, setFocusedPostId] = focusedPostState;
  useEffect(() => {
    setPostViews(
      posts.map((item: bsky.AppBskyFeedDefs.FeedViewPost) => ({
        postView: item.post as ExpandedPostView,
        repostBy:
          item.reason?.$type === 'app.bsky.feed.defs#reasonRepost' ? (item.reason.by as ProfileView) : undefined,
      })),
    );
  }, [posts]);

  const getHandleMouseEnter = useCallback(
    (cid: string) => (event: React.MouseEvent<HTMLDivElement>) => {
      // don't propagate to other elements
      event.stopPropagation();

      //   console.log('mouse enter', cid);
      //   setFocusedPostId(cid);
    },
    [setFocusedPostId],
  );

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.stopPropagation();
      //   console.log('mouse out');
      //   setFocusedPostId(null);
    },
    [setFocusedPostId],
  );

  return (
    <div className="flex-1 h-screen overflow-auto">
      {postViews.map((post, index) => (
        <div
          key={post.postView.cid + 'wrapper-index' + index}
          onMouseEnter={getHandleMouseEnter(post.postView.cid)}
          onMouseLeave={handleMouseLeave}
          className={`border-2 hover:border-black ${post.postView.cid == focusedPostId ? 'border-black' : ''}`}
          data-focused={post.postView.cid === focusedPostId}
        >
          <PostLight key={post.postView.cid + 'index' + index} post={post} isLastPost={index === posts.length - 1} />
        </div>
      ))}
    </div>
  );
}
