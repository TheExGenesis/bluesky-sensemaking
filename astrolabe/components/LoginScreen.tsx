import {
    LoginResponseDataType
} from "@/helpers/bsky";
import { BskyAgent } from "@atproto/api";
import {
    useEffect, useState
} from "react";


export function Header(props: { logout?: () => void }) {
    const { logout } = props;
    const subheaders = [
      "editing!",
      // "better algorithms make better people",
      // "the skyline is the timeline on bluesky",
    ];
    const [subheader, setSubheader] = useState<string>("");
    useEffect(() => {
      setSubheader(subheaders[Math.floor(Math.random() * subheaders.length)]);
    }, []);
  
    return (
      <>
        <div className="w-full flex flex-row items-center justify-center">
          <div className="sm:flex-1"></div>
          <div className="flex flex-col items-start sm:items-center py-4">
            <div className="text-xl font-light">
              {/* spells skyline.gay in pride flag colors */}
              <span className="text-red-500">s</span>
              <span className="text-orange-500">k</span>
              <span className="text-yellow-500">y</span>
              <span className="text-green-500">l</span>
              <span className="text-blue-500">i</span>
              <span className="text-purple-500">n</span>
              <span className="text-pink-500">e</span>
            </div>
            <div className="text-sm font-light text-slate-900 dark:text-slate-300">
              {subheader}
            </div>
          </div>
          <div className="flex-1 flex flex-row justify-end items-center">
            {logout && (
              <button
                className="text-base border py-2 px-4 rounded-lg flex flex-row items-center ml-4 mr-0 sm:mr-3 text-slate-800 bg-white border-gray-300 dark:text-slate-50 dark:bg-slate-800 dark:border-slate-700"
                onClick={() => logout()}
              >
                <span className="material-icons mr-2">logout</span>
                Logout
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

export function SecurityInfo() {
    return (
        <div className="mt-32 max-w-sm bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-300 dark:border-slate-600 rounded-xl mb-8">
        <div className="flex flex-row pb-2 border-b border-slate-300 dark:border-slate-600 mb-2">
            <span className="material-icons mr-2 cursor-pointer">info</span>
            <div>Is this secure?</div>
        </div>
        <b>Yes!</b> Bluesky unfortunately doesn't have an OAuth login system yet,
        but we've taken the following measures to make sure your data is safe:
        <ul className="list-disc list-inside">
            <li>
            We don't send your password to our own servers. Every request is made
            directly from <i>your</i> browser to Bluesky's servers.
            </li>
            <li>
            We don't store your password anywhere. Not on the backend, not on the
            frontend, not in cookies, nowhere.
            </li>
            <li>
            If you don't trust us, you can always check the source code of{" "}
            <a
                href="https://github.com/louislva/skyline"
                className="text-blue-500"
                target="_blank"
            >
                the service here.
            </a>
            </li>
        </ul>
        </div>
    );
    }

// LOGIN SCREEN
export function LoginScreen(props: {
    setLoginResponseData: (data: LoginResponseDataType | null) => void;
    agent: BskyAgent;
  }) {
    const { setLoginResponseData, agent } = props;
    const login = (username: string, password: string) => {
      setError(null);
      agent
        .login({
          identifier: username,
          password: password,
        })
        .then((response) => {
          if (response.success) {
            setLoginResponseData({
              ...response.data,
              refreshJwt: "", // removing this for security reasons
            });
          } else {
            // Error
            setLoginResponseData(null);
            setError("Error");
          }
        })
        .catch((err) => {
          // Error
          setLoginResponseData(null);
          setError(err.message);
        });
    };
  
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<null | string>(null);
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Header />
        {/* An offset equal to the security info (ish) */}
        <div className="h-32" />
        {/* The title */}
        <h1 className="text-3xl font-bold mb-6">Login to Bluesky</h1>
        {/* The login form */}
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            login(username, password);
          }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-300 dark:border-slate-700 p-2 rounded mb-4 text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 dark:border-slate-700 p-2 rounded mb-4 text-black"
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Login
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {/* Security policy section */}
        <SecurityInfo />
      </div>
    );
  }