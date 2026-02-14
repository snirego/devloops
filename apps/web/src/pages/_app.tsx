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
      {/* Inline blocking script: apply cached brand color BEFORE React paints.
          This eliminates the flash of default indigo when a custom color is set. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var c=localStorage.getItem("brandColor");if(!c||!/^#[0-9a-fA-F]{6}$/.test(c))return;function h2r(h){var x=h.replace("#","");return[parseInt(x.substring(0,2),16),parseInt(x.substring(2,4),16),parseInt(x.substring(4,6),16)];}function mix(r,g,b,a){return[Math.round(255+(r-255)*a),Math.round(255+(g-255)*a),Math.round(255+(b-255)*a)];}function r2h(r,g,b){var max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,l=(max+min)/2,s=0,h=0;if(max!==min){var d=max-min;s=l>.5?d/(2-max-min):d/(max+min);var rv=r/255,gv=g/255,bv=b/255;if(max===rv)h=((gv-bv)/d+(gv<bv?6:0))/6;else if(max===gv)h=((bv-rv)/d+2)/6;else h=((rv-gv)/d+4)/6;}return[h*360,s*100,l*100];}function hsl2rgb(h,s,l){var sn=s/100,ln=l/100,a=sn*Math.min(ln,1-ln);function f(n){var k=(n+h/30)%12;return Math.round(255*Math.max(0,Math.min(1,ln-a*Math.max(Math.min(k-3,9-k,1),-1))));}return[f(0),f(8),f(4)];}var rgb=h2r(c),R=rgb[0],G=rgb[1],B=rgb[2],hsl=r2h(R,G,B),H=hsl[0],S=hsl[1],L=hsl[2];var p={};var m=[[50,.05],[100,.1],[200,.2],[300,.4],[400,.7]];for(var i=0;i<m.length;i++){var w=m[i],v=mix(R,G,B,w[1]);p[w[0]]=v[0]+" "+v[1]+" "+v[2];}p[500]=R+" "+G+" "+B;var dk=[[600,5,8],[700,8,16],[800,10,24],[900,10,32],[950,10,40]];for(var j=0;j<dk.length;j++){var d=dk[j],ns=Math.min(100,S+d[1]),nl=Math.max(5,L-d[2]),v2=hsl2rgb(H,ns,nl);p[d[0]]=v2[0]+" "+v2[1]+" "+v2[2];}var root=document.documentElement;for(var k in p)root.style.setProperty("--brand-"+k,p[k]);root.style.setProperty("--brand",R+" "+G+" "+B);}catch(e){}})()`
        }}
      />
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
