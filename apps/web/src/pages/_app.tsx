import "~/styles/globals.css";
import "~/utils/i18n";

import type { NextPage, Viewport } from "next";
import type { AppProps, AppType } from "next/app";
import type { ReactElement, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { env } from "next-runtime-env";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

import { AiActivityProvider } from "~/providers/ai-activity";
import { KeyboardShortcutProvider } from "~/providers/keyboard-shortcuts";
import { LinguiProviderWrapper } from "~/providers/lingui";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";
import { api } from "~/utils/api";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Kan",
  description: "The open source Trello alternative",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const MyApp: AppType = ({ Component, pageProps }: AppPropsWithLayout) => {
  const router = useRouter();
  const isWidgetEmbed = router.pathname === "/widget/embed";
  const posthogKey = env("NEXT_PUBLIC_POSTHOG_KEY");

  useEffect(() => {
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: env("NEXT_PUBLIC_POSTHOG_HOST"),
        person_profiles: "identified_only",
        defaults: "2025-05-24",
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") posthog.debug();
        },
      });
    }
  }, [posthogKey]);

  // Inject the widget chat script manually so data-workspace-id is always
  // accessible via querySelector. next/Script's dynamic injection breaks
  // document.currentScript which the widget relies on.
  useEffect(() => {
    if (isWidgetEmbed) return;
    if (document.getElementById("devloops-chat-script")) return;
    const s = document.createElement("script");
    s.id = "devloops-chat-script";
    s.src = "/widget/devloops-chat.js";
    s.setAttribute("data-workspace-id", "jxwdrfe3f2iu");
    s.async = true;
    document.body.appendChild(s);
  }, [isWidgetEmbed]);

  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${jakarta.style.fontFamily};
        }
        body {
          position: relative;
        }
      `}</style>
      {env("NEXT_PUBLIC_UMAMI_ID") && (
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id={env("NEXT_PUBLIC_UMAMI_ID")}
        />
      )}
      <script src="/__ENV.js" />
      {isWidgetEmbed ? (
        /* Widget embed runs in an iframe — skip all providers to avoid
           auth errors, dark-mode leaks, and unnecessary overhead. */
        <Component {...pageProps} />
      ) : (
        <main className="font-sans">
          <AiActivityProvider>
            <KeyboardShortcutProvider>
              <LinguiProviderWrapper>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                  <ModalProvider>
                    <PopupProvider>
                      {posthogKey ? (
                        <PostHogProvider client={posthog}>
                          {getLayout(<Component {...pageProps} />)}
                        </PostHogProvider>
                      ) : (
                        getLayout(<Component {...pageProps} />)
                      )}
                    </PopupProvider>
                  </ModalProvider>
                </ThemeProvider>
              </LinguiProviderWrapper>
            </KeyboardShortcutProvider>
          </AiActivityProvider>
        </main>
      )}
    </>
  );
};

export default api.withTRPC(MyApp);
