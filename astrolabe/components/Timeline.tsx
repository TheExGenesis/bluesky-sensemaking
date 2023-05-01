import LoadingSpinner from "@/components/LoadingSpinner";
import { Header } from "@/components/LoginScreen";
import Post from "@/components/Post";
import {
    LoginResponseDataType
} from "@/helpers/bsky";
import { LanguageType } from "@/helpers/classifyLanguage";
import { useLocalStorageState } from "@/helpers/hooks";
import {
    makeBaseFeed,
    makeEmbeddingsFeed,
    makeLanguageFeed,
    makeMutualsFeed,
    makeOneFromEachFeed, ProduceFeedOutput,
    TimelineDefinitionType
} from "@/helpers/makeFeeds";
import { BskyAgent } from "@atproto/api";
import {
    ReactNode,
    useEffect,
    useMemo, useState
} from "react";

// TIMELINES
type TimelinesType = {
  [id: string]: TimelineDefinitionType;
};
type CustomTimelineType = {
  name: string;
  positivePrompt: string;
  negativePrompt: string;
  sharedBy?: string;
};
export type CustomTimelinesType = {
  [id: string]: CustomTimelineType;
};
type TimelineIdType = string;

// TIMELINE SCREEN
export function TimelineScreen(props: {
  setLoginResponseData: (value: LoginResponseDataType | null) => void;
  egoIdentifier: string;
  agent: BskyAgent;
  customTimelines: CustomTimelinesType;
  setCustomTimelines: (value: CustomTimelinesType) => void;
}) {
  const {
    setLoginResponseData,
    egoIdentifier,
    agent,
    customTimelines,
    setCustomTimelines,
  } = props;

  const [language, setLanguage] = useLocalStorageState<LanguageType>(
    "@language",
    "english"
  );

  const timelines = useMemo(() => {
    const languagesPositivePrompt = {
      english: "thank you",
      portuguese: "obrigado",
      farsi: "با تشکر",
      japanese: "ありがとう",
    };
    const languagePositivePrompt = languagesPositivePrompt[language];
    const languageNegativePrompt = Object.entries(languagesPositivePrompt)
      .filter(([k, _]) => k !== language)
      .map(([_, v]) => v)
      .join(", ");

    const TIMELINES: TimelinesType = {
      following: makeBaseFeed("following"),
      whatsHot: {
        ...makeLanguageFeed("popular", language),
        icon: "trending_up",
        name: `What's Hot (${
          {
            english: "English",
            portuguese: "Português",
            farsi: "فارسی",
            japanese: "日本語",
          }[language]
        })`,
        description:
          "What's Hot feed, filtered to show only your preferred language",
      },
      "one-from-each": makeOneFromEachFeed(),
      mutuals: makeMutualsFeed(),
      wholesome: {
        ...makeEmbeddingsFeed(
          "Wholesome tweet, kindness, love, fun banter",
          "Angry tweets, with politics, people talking about gender & dating, etc."
        ),
        icon: "favorite",
        name: "Wholesome",
        description:
          "AI-feed boosting wholesome tweets, and removing angry / political / culture war tweets",
      },
    };

    return {
      ...TIMELINES,
      ...Object.fromEntries(
        Object.entries(customTimelines).map(([id, config]) => {
          const { name, positivePrompt, negativePrompt, sharedBy } = config;
          return [
            id,
            {
              ...makeEmbeddingsFeed(positivePrompt, negativePrompt),
              name: name,
              // a material icon that symbolizes "custom"
              icon: sharedBy ? "public" : "bolt",
              description:
                (positivePrompt.trim() && negativePrompt.trim()) ||
                (!positivePrompt.trim() && !negativePrompt.trim())
                  ? `Custom timeline, created to show more "${positivePrompt.trim()}" and less "${negativePrompt.trim()}"`
                  : negativePrompt.trim()
                  ? `Custom timeline, created not to show "${negativePrompt.trim()}"`
                  : `Custom timeline, created to show more "${positivePrompt.trim()}"`,
            },
          ] as [string, TimelineDefinitionType];
        })
      ),
    };
  }, [customTimelines, language]);

  const [timelineId_, setTimelineId] = useLocalStorageState<TimelineIdType>(
    "@timelineId",
    "following"
  );
  // fallback if your localStorage stored timelineId doesn't exist any more
  const timelineId = timelines[timelineId_] ? timelineId_ : "following";

  const [createTimelineModal, setCreateTimelineModalOpen] = useState(false);
  const [editingCustomAITimelineId, setEditingCustomAITimelineId] = useState<
    string | null
  >(null);

  return (
    <div className="w-full flex flex-col items-center px-2">
      <Header logout={() => setLoginResponseData(null)} />
      <TimelinePicker
        timelineId={timelineId}
        setTimelineId={setTimelineId}
        egoIdentifier={egoIdentifier}
        timelines={timelines}
        setCreateTimelineModalOpen={setCreateTimelineModalOpen}
        setEditingCustomAITimelineId={setEditingCustomAITimelineId}
        customTimelines={customTimelines}
        setCustomTimelines={setCustomTimelines}
        language={language}
        setLanguage={setLanguage}
      />
      <Timeline
        key={timelineId + "--" + language}
        timelineId={timelineId}
        agent={agent}
        egoIdentifier={egoIdentifier}
        timelines={timelines}
      />
      {(createTimelineModal || editingCustomAITimelineId) && (
        <ConfigureTimelineModal
          customTimelines={customTimelines}
          setCustomTimelines={setCustomTimelines}
          close={() => {
            setCreateTimelineModalOpen(false);
            setEditingCustomAITimelineId(null);
          }}
          editingCustomAITimelineId={editingCustomAITimelineId}
        />
      )}
    </div>
  );
}

function TimelinePicker(props: {
  timelineId: TimelineIdType;
  setTimelineId: (timelineId: TimelineIdType) => void;
  customTimelines: CustomTimelinesType;
  setCustomTimelines: (value: CustomTimelinesType) => void;
  egoIdentifier: string;
  timelines: TimelinesType;
  language: LanguageType;
  setLanguage: (language: LanguageType) => void;
  setCreateTimelineModalOpen: (open: boolean) => void;
  setEditingCustomAITimelineId: (id: string | null) => void;
}) {
  const {
    timelineId,
    setTimelineId,
    customTimelines,
    setCustomTimelines,
    egoIdentifier,
    timelines,
    setCreateTimelineModalOpen,
    setEditingCustomAITimelineId,
    language,
    setLanguage,
  } = props;
  const [hoveredTimelineId, setHoveredTimelineId] =
    useState<TimelineIdType | null>(null);

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="flex flex-col lg:flex-row items-center">
        <div className="flex flex-col lg:flex-row justify-start rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 overflow-hidden">
          {Object.keys(timelines).map((id, index) => {
            const isSelected = id === timelineId;

            return (
              <button
                key={id}
                className={`p-2 h-10 flex flex-row items-center border-slate-300 dark:border-slate-600 ${
                  id === timelineId
                    ? "bg-blue-500 dark:bg-slate-600 text-slate-50 "
                    : ""
                } ${index !== 0 ? "lg:border-l " : ""}`}
                onClick={() => {
                  setTimelineId(id as TimelineIdType);
                  setHoveredTimelineId(null);
                }}
                onMouseEnter={() => {
                  setHoveredTimelineId(id as TimelineIdType);
                }}
                onMouseMove={() => {
                  setHoveredTimelineId(id as TimelineIdType);
                }}
                onMouseLeave={() => {
                  setHoveredTimelineId(null);
                }}
              >
                <span className="material-icons mr-2">
                  {timelines[id].icon}
                </span>
                <span>{timelines[id].name}</span>
              </button>
            );
          })}
        </div>
        <button
          className="p-2 flex flex-row items-center justify-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md ml-0 lg:ml-2 mt-2 lg:mt-0 lg:w-8 h-8 px-2 lg:px-0"
          onClick={() => {
            setCreateTimelineModalOpen(true);
          }}
        >
          <span className="material-icons mr">add</span>
          <span className="inline lg:hidden pl-1">Custom Timeline</span>
        </button>
      </div>

      <div className="max-w-xl text-sm text-slate-800 dark:text-slate-400 mt-2 text-center">
        <b>{timelines[hoveredTimelineId || timelineId].name}:</b>{" "}
        {timelines[hoveredTimelineId || timelineId].description}
      </div>
      {(!hoveredTimelineId || hoveredTimelineId === timelineId) && (
        <div className="flex flex-row justify-center items-center text-sm mt-2 gap-2">
          {timelineId === "whatsHot" && (
            <div className="max-w-xl text-sm text-slate-800 dark:text-slate-400 mt-0 text-center pr-2">
              {["english", "portuguese", "japanese", "farsi"].map(
                (lang, index) => (
                  <div
                    className={
                      "pl-2 ml-2 leading-none border-slate-300 dark:border-slate-600 inline-block " +
                      (lang.toLowerCase() === language
                        ? "font-bold dark:font-normal dark:text-slate-50 underline"
                        : "") +
                      (index === 0 ? "" : " border-l")
                    }
                    key={index}
                    onClick={() => setLanguage(lang as LanguageType)}
                  >
                    {lang}
                  </div>
                )
              )}
            </div>
          )}
          {Object.keys(customTimelines).includes(timelineId) && (
            <>
              <ShareTimelineButton
                key={timelineId}
                timelineConfig={customTimelines[timelineId]}
                egoIdentifier={egoIdentifier}
              />
              <button
                className="h-6 px-1 border rounded flex flex-row items-center justify-center dark:bg-yellow-700 dark:border-yellow-600 dark:text-yellow-100 bg-yellow-300 border-yellow-400"
                onClick={() => {
                  setEditingCustomAITimelineId(timelineId);
                }}
              >
                <span className="material-icons mr-1">edit</span>
                Edit
              </button>
              <button
                className="h-6 px-1 border rounded flex flex-row items-center justify-center dark:bg-red-700 dark:border-red-600 dark:text-red-100 bg-red-300 border-red-400"
                onClick={() => {
                  // are you sure alert?
                  if (
                    confirm(
                      `Are you sure you want to delete "${customTimelines[timelineId].name}"?`
                    )
                  ) {
                    const newCustomTimelines = {
                      ...customTimelines,
                    };
                    delete newCustomTimelines[timelineId];
                    setCustomTimelines(newCustomTimelines);
                    setTimelineId("following");
                  }
                }}
              >
                <span className="material-icons mr-1">delete</span>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
function ShareTimelineButton(props: {
  timelineConfig: CustomTimelineType;
  egoIdentifier: string;
}) {
  const { timelineConfig, egoIdentifier } = props;
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copied]);

  return (
    <button
      className={
        "h-6 px-1 border rounded flex flex-row items-center justify-center dark:bg-green-700 dark:border-green-600 dark:text-green-100 bg-green-300 border-green-400 " +
        (loading ? "opacity-60 cursor-default" : "")
      }
      onClick={async () => {
        if (loading) return;
        setLoading(true);
        const response = await fetch("/api/shared_custom_timeline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: timelineConfig,
            created_by_handle: egoIdentifier,
          }),
        })
          .then((res) => {
            if (res.ok) {
              res.json().then((data) => {
                // copy link to clipboard
                navigator.clipboard.writeText(
                  `${window.location.origin}/?tl=${data.key}`
                );

                setLoading(false);
                setCopied(true);
              });
            } else {
              throw new Error(
                "Couldn't POST shared_custom_timeline: " + res.status
              );
            }
          })
          .catch((error) => {
            setLoading(false);
            throw error;
          });
      }}
    >
      {copied ? (
        <>
          <span className="material-icons mr-1">content_copy</span>
          Copied link!
        </>
      ) : (
        <>
          <span className="material-icons mr-1">share</span>
          Share timeline prompt
        </>
      )}
    </button>
  );
}

export function Timeline(props: {
  agent: BskyAgent;
  egoIdentifier: string;
  timelineId: TimelineIdType;
  timelines: TimelinesType;
}) {
  const { agent, egoIdentifier, timelineId, timelines } = props;

  const [loadedSegments, setLoadedSegments] = useState<
    (ProduceFeedOutput & {
      loadTimestamp: number;
    })[]
  >([]);
  // const [posts, setPosts] = useState<SkylinePostType[]>([]);
  const posts = useMemo(
    () => loadedSegments.flatMap((segment) => segment.posts),
    [loadedSegments]
  );
  const cursor = loadedSegments.slice(-1)?.[0]?.cursor;
  const [loading, setLoading] = useState<boolean>(false);

  const loadSegment = async (direction: "down" | "up" = "down") => {
    timelines[timelineId]
      .produceFeed({
        agent,
        egoIdentifier,
        cursor: direction === "down" ? cursor : undefined,
      })
      .then(async (result) => {
        const loadTimestamp = Date.now();
        if (direction === "up") {
          setLoadedSegments((oldLoadedSegments) => [
            {
              loadTimestamp,
              posts: [],
              cursor: result.cursor,
            },
            ...oldLoadedSegments,
          ]);
        } else {
          setLoadedSegments((oldLoadedSegments) => [
            ...oldLoadedSegments,
            {
              loadTimestamp,
              posts: [],
              cursor: result.cursor,
            },
          ]);
        }

        const postsSliced = result.posts;
        timelines[timelineId].postProcessFeed(
          {
            agent,
            egoIdentifier,
            posts: postsSliced,
          },
          (postsMerged) => {
            setLoadedSegments((oldLoadedSegments) => {
              const olderPostCids = oldLoadedSegments
                .filter(
                  (oldLoadedSegment) =>
                    oldLoadedSegment.loadTimestamp !== loadTimestamp
                )
                .flatMap((oldLoadedSegment) =>
                  oldLoadedSegment.posts.map((post) => post.postView.cid)
                );

              const postsMergedAndDeduplicated = postsMerged.filter(
                (post) => !olderPostCids.includes(post.postView.cid)
              );

              return oldLoadedSegments.map((oldLoadedSegment, index) =>
                oldLoadedSegment.loadTimestamp === loadTimestamp
                  ? {
                      ...oldLoadedSegment,
                      posts: postsMergedAndDeduplicated,
                    }
                  : oldLoadedSegment
              );
            });
            setLoading(false);
          }
        );
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoadedSegments([]);
    setLoading(true);

    loadSegment();
  }, [timelineId]);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000 * 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-2 w-full sm:w-136 border-gray-300 bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl mb-8 overflow-hidden">
      {posts.length > 0 ? (
        <>
          {now - loadedSegments?.[0]?.loadTimestamp > 60000 ? (
            <button
              className={
                "w-full h-12 bg-slate-700 text-base flex flex-row items-center justify-center unselectable " +
                (loading ? "text-slate-300" : "text-slate-50")
              }
              onClick={() => {
                if (!loading) {
                  setLoading(true);
                  loadSegment("up");
                }
              }}
            >
              {loading ? (
                <LoadingSpinner
                  containerClassName="w-6 h-6 mr-2"
                  dotClassName="bg-slate-800 dark:bg-slate-400"
                />
              ) : (
                <span className="material-icons text-2xl mr-2">
                  arrow_upward
                </span>
              )}
              Refresh feed
            </button>
          ) : null}
          {posts.map((post, index) => (
            <Post
              agent={agent}
              key={post.postView.cid + "index" + index}
              post={post}
              isLastPost={index === posts.length - 1}
            />
          ))}
          <button
            className={
              "w-full h-16 bg-slate-700 text-base flex flex-row items-center justify-center unselectable " +
              (loading ? "text-slate-300" : "text-slate-50")
            }
            onClick={() => {
              if (!loading) {
                setLoading(true);
                loadSegment();
              }
            }}
          >
            {loading ? (
              <LoadingSpinner
                containerClassName="w-6 h-6 mr-2"
                dotClassName="bg-slate-800 dark:bg-slate-400"
              />
            ) : (
              <span className="material-icons text-2xl mr-2">add</span>
            )}
            Load more
          </button>
        </>
      ) : loading ? (
        <div className="flex flex-row justify-center items-center text-3xl py-32">
          <LoadingSpinner
            containerClassName="w-12 h-12 mr-4"
            dotClassName="bg-slate-800 dark:bg-slate-400"
          />
          <div className="text-slate-800 dark:text-slate-400">Loading...</div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center py-32 text-slate-800 dark:text-slate-400">
          <div className="material-icons text-4xl mb-2">
            sentiment_dissatisfied
          </div>
          <div className="text-2xl">No posts in your timeline</div>
          <div className="text-lg mt-2 text-center">
            Try following some more accounts! We wholeheartedly recommend:{" "}
            <a
              href="https://staging.bsky.app/profile/louis02x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 dark:text-blue-400"
            >
              @louis02x.com
            </a>{" "}
            (it's me lol)
          </div>
        </div>
      )}
    </div>
  );
}

export function Modal(props: { children: ReactNode; close: () => void }) {
  const { children, close } = props;
  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen bg-black/50 backdrop-blur-md	flex justify-center items-center"
      onClick={() => close()}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg p-4 w-128 dark:border-2 dark:border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </div>
    </div>
  );
}
export function ConfigureTimelineModal(props: {
  customTimelines: CustomTimelinesType;
  setCustomTimelines: (timelines: CustomTimelinesType) => void;
  close: () => void;
  editingCustomAITimelineId: string | null;
}) {
  const {
    customTimelines,
    setCustomTimelines,
    close,
    editingCustomAITimelineId,
  } = props;
  const editingCustomAITimeline = editingCustomAITimelineId
    ? customTimelines[editingCustomAITimelineId]
    : null;
  const [name, setName] = useState(editingCustomAITimeline?.name || "");
  const [positivePrompt, setPositivePrompt] = useState(
    editingCustomAITimeline?.positivePrompt || ""
  );
  const [negativePrompt, setNegativePrompt] = useState(
    editingCustomAITimeline?.negativePrompt || ""
  );

  return (
    <Modal close={close}>
      <div className="text-xl font-bold mb-4">
        {editingCustomAITimeline
          ? `Edit "${editingCustomAITimeline.name}" timeline`
          : "Create a timeline"}
      </div>
      <div className="flex flex-col gap-2">
        <label>Title</label>
        <input
          type="text"
          placeholder="Wholesome TL"
          className="border border-gray-300 dark:border-slate-700 rounded-md p-2 w-1/2 text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex flex-row items-center">
          I want to see more of...
          <span className="material-icons text-green-600 ml-1">thumb_up</span>
        </label>
        <input
          type="text"
          placeholder="Wholesome tweets, kindness, love, fun banter"
          className="border border-gray-300 dark:border-slate-700 rounded-md p-2 text-black"
          value={positivePrompt}
          onChange={(e) => setPositivePrompt(e.target.value)}
        />
        <label className="flex flex-row items-center">
          I want to see less of...
          <span className="material-icons text-red-600 ml-1">thumb_down</span>
        </label>
        <input
          type="text"
          placeholder="Angry tweets, like tweets with politics, dating discourse, dunks"
          className="border border-gray-300 dark:border-slate-700 rounded-md p-2 text-black"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white rounded-md p-2 w-1/3 mt-4 ml-auto"
          onClick={() => {
            setCustomTimelines({
              ...customTimelines,
              [editingCustomAITimelineId || Date.now().toString()]: {
                name: name.trim(),
                positivePrompt: positivePrompt.trim(),
                negativePrompt: negativePrompt.trim(),
              },
            });
            close();
          }}
        >
          {editingCustomAITimeline ? "Save" : "Create"}
        </button>
      </div>
    </Modal>
  );
}