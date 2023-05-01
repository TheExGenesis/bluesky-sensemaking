import { RecordType, SkylinePostType } from '@/helpers/contentTypes';
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import moment from 'moment';
import Link from 'next/link';
import { Fragment, useState } from 'react';

export default function PostLight(props: { post: SkylinePostType; hasChildren?: boolean; isLastPost?: boolean }) {
  const { post, hasChildren, isLastPost } = props;
  const author = post.postView.author;
  const embed:
    | {
        $type: 'app.bsky.embed.record#view' | 'app.bsky.embed.images' | string;
        images?:
          | {
              alt: string;
              fullsize: string;
              thumb: string;
            }[]
          | undefined;
        record?: {
          author: PostView['author'];
          value: RecordType;
        };
      }
    | undefined = post.postView.embed as any;
  const record: RecordType = post.postView.record as any;
  const repostBy = post.repostBy;

  const bskyLink = `https://staging.bsky.app/profile/${author.handle}/post/${
    post.postView.uri.split('/').slice(-1)[0]
  }`;

  const replyPosts: SkylinePostType[] = post.replyingTo || [];

  const [isLiked, setIsLiked] = useState<boolean>(!!post.postView.viewer?.like);
  const likeDiff = (isLiked ? 1 : 0) - (post.postView.viewer?.like ? 1 : 0);

  const [isReposted, setIsReposted] = useState<boolean>(!!post.postView.viewer?.repost);
  const repostDiff = (isReposted ? 1 : 0) - (post.postView.viewer?.repost ? 1 : 0);

  return (
    <>
      {replyPosts.slice(0, 1).map((reply) => (
        <PostLight key={reply.postView.cid + 'as child to' + post.postView.cid} post={reply} hasChildren />
      ))}
      {replyPosts.length > 2 && (
        <div className="mt-0 mb-0 px-4 flex flex-row items-center text-sm mb-4 text-slate-700 dark:text-slate-300">
          <div className="text-xl mr-1 -mt-2">...</div>
          {replyPosts.length - 2} more replies <div className="text-xl ml-1 -mt-2">...</div>
        </div>
      )}
      {replyPosts.length > 1 &&
        replyPosts
          .slice(-1)
          .map((reply) => (
            <PostLight key={reply.postView.cid + 'as a later child to' + post.postView.cid} post={reply} hasChildren />
          ))}
      <div
        className={
          'p-4 overflow-hidden ' +
          (hasChildren || isLastPost ? 'border-none ' : 'border-b border-gray-300 dark:border-slate-700 ')
        }
      >
        {/* Reply / repost row */}
        {(record.reply || repostBy) && (
          <div
            className={
              'flex flex-row items-center text-sm pt-2 pb-2 -mt-4 text-slate-700 dark:text-slate-300 ' +
              (record.reply ? 'border-t border-dashed border-slate-300 dark:border-slate-600 ' : '')
            }
          >
            {record.reply && (
              <>
                <div className="material-icons mr-1">reply</div>
                <div>Replied</div>
              </>
            )}
            {record.reply && repostBy && (
              <div className="ml-2 mr-1 border-l h-3 w-0 border-slate-600 dark:border-slate-400"></div>
            )}
            {repostBy && (
              <>
                <div className="material-icons mr-1">repeat</div>
                <div>Reposted by {repostBy.displayName}</div>
              </>
            )}
          </div>
        )}

        {/* Profile row */}
        <div className="flex flex-row">
          {/* Pfp */}
          {author.avatar && (
            <div className="w-12 h-12 mr-3 rounded-full overflow-hidden">
              <img src={author.avatar} alt={author.name + "'s avatar"} />
            </div>
          )}
          {/* Name / handle */}
          <div className="flex flex-col">
            <div className="font-semibold">{author.displayName}</div>
            <div className="text-slate-500 dark:text-slate-400">
              {author.handle === 'deepfates.com.deepfates.com.deepfates.com.deepfates.com.deepfates.com'
                ? "i'm an asshole 💩"
                : '@' + author.handle}
            </div>
          </div>
          {/* timestamp */}
          <Link href={bskyLink} target="_blank">
            <div className="flex-grow text-right text-slate-500 dark:text-slate-400 hover:underline">
              {moment(post.postView.indexedAt).fromNow()}
            </div>
          </Link>
        </div>
        {/* Content row */}
        <div className="mt-2 break-all">
          {record.text.split('\n').map((line, index) => (
            <Fragment key={line + '$' + index}>
              {index !== 0 && <br />}
              {line}
            </Fragment>
          ))}
        </div>
        {/* Images */}
        {embed?.images && (
          <div className="mt-2 flex flex-row h-72 gap-4">
            {embed.images.slice(0, 3).map((image) => (
              <div className="flex-1 rounded-md overflow-hidden" key={image.thumb}>
                <img src={image.thumb} alt={image.alt} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {/* Quote tweets */}
        {embed?.record?.value?.text && (
          <div className="mt-2 border border-slate-300 dark:border-slate-600 rounded-md p-2 py-2 text-sm">
            <div className="flex flex-row items-center h-4 text-slate-700 dark:text-slate-300 bg-green-4000 mb-1">
              <img src={embed.record.author.avatar} className="w-4 h-4 rounded-full mr-1" />
              <span className="font-semibold mr-1 leading-none">{embed.record.author.displayName}</span>
              <span className="text-slate-500 dark:text-slate-400 leading-none"> @{embed.record.author.handle}</span>
            </div>
            <div className="bg-blue-4000 break-all">
              {embed?.record?.value?.text?.split('\n').map((line, index) => (
                <Fragment key={line + '$' + index}>
                  {index !== 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </div>
          </div>
        )}
        {/* Likes, RTs, etc. row */}
        <div className="flex flex-row items-center text-base mt-3 text-slate-700 dark:text-slate-300 leading-none">
          <div className="material-icons mr-1">chat_bubble_outline</div>
          <div className="mr-4">{post.postView.replyCount}</div>
          <div className="rounded-full hover:bg-green-500/20 p-2 -m-2 flex justify-center items-center -mr-1">
            <div
              className={'material-icons ' + (isReposted ? 'text-green-500' : 'text-slate-700 dark:text-slate-300')}
              style={{
                paddingRight: 0.66 / 16 + 'rem',
              }}
            >
              repeat
            </div>
          </div>
          <div className="mr-4">{(post.postView.repostCount || 0) + repostDiff}</div>
          <div className="rounded-full hover:bg-red-500/20 p-2 -m-2 flex justify-center items-center -mr-1">
            <div
              className={'material-icons ' + (isLiked ? 'text-red-500' : 'text-slate-700 dark:text-slate-300')}
              style={{
                paddingRight: 0.66 / 16 + 'rem',
              }}
            >
              {isLiked ? 'favorite' : 'favorite_border'}
            </div>
          </div>
          <div className="mr-4">{(post.postView.likeCount || 0) + likeDiff}</div>
          {post.score && (
            <>
              {/* cog icon / settings icon bec it's a machine */}
              <div className="material-icons ml-auto mr-1 text-gray-400">settings</div>
              <div className="text-gray-400">
                {/* {(post.score * 100).toFixed(2)} */}
                {(Math.pow(Math.abs(post.score), 0.3) * Math.sign(post.score) * 100).toFixed(0)}% match
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
