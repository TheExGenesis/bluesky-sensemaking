import { LoginScreen } from "@/components/LoginScreen";
import { TimelineScreen, CustomTimelinesType } from "@/components/Timeline";
import {
  LoginResponseDataType
} from "@/helpers/bsky";
import { useLocalStorageState } from "@/helpers/hooks";
import { BskyAgent } from "@atproto/api";
import * as jwt from "jsonwebtoken";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  useEffect, useRef
} from "react";

export default function Main() {
  // Bluesky API
  const agent = useRef<BskyAgent>(
    new BskyAgent({
      service: "https://bsky.social",
    })
  ).current;

  // Auth stuff
  const [loginResponseData, setLoginResponseData] =
    useLocalStorageState<LoginResponseDataType | null>(
      "@loginResponseData",
      null
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
  const timeUntilLoginExpire = loginExpiration
    ? loginExpiration * 1000 - Date.now()
    : null;
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

  // Styling for body
  useEffect(() => {
    const className = "bg-slate-50 dark:bg-slate-900";
    className.split(" ").forEach((name) => document.body.classList.add(name));

    return () => {
      className
        .split(" ")
        .forEach((name) => document.body.classList.remove(name));
    };
  }, []);

  // Custom Timelines Installed
  const [customTimelines, setCustomTimelines] =
    useLocalStorageState<CustomTimelinesType>("@customAITimelines", {});

  const router = useRouter();
  useEffect(() => {
    if (router.query.tl) {
      fetch(`/api/shared_custom_timeline?key=${router.query.tl}`).then(
        (res) => {
          if (res.ok) {
            res.json().then((json) => {
              router.replace("/", undefined, {
                scroll: false,
                shallow: true,
              });
              setCustomTimelines({
                ...customTimelines,
                [Date.now().toString()]: {
                  ...json.config,
                  sharedBy: json.created_by_handle,
                },
              });
            });
          } else {
            throw Error("Couldn't GET shared_ai_timeline: " + res.statusText);
          }
        }
      );
    }
  }, [router.query.tl]);

  return (
    <>
      <Head>
        <title>Skyline</title>
        <link rel="icon" href="/skyline-16.png" />
      </Head>
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
        {identifier ? (
          <TimelineScreen
            setLoginResponseData={setLoginResponseData}
            egoIdentifier={identifier}
            agent={agent}
            customTimelines={customTimelines}
            setCustomTimelines={setCustomTimelines}
          />
        ) : (
          <LoginScreen
            setLoginResponseData={setLoginResponseData}
            agent={agent}
          />
        )}
      </div>
    </>
  );
}
