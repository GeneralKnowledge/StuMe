import type { Metadata, Viewport } from "next";
import { Figtree, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StuMe — what can I eat?",
  description:
    "Tell StuMe what’s in your kitchen. Get meals you can cook now — cheap, quick, student kit.",
  appleWebApp: {
    capable: true,
    title: "StuMe",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e6e0d4",
};

const themeBoot = `(function(){try{var t=localStorage.getItem('stume-theme');if(t!=='night'&&t!=='linen'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'night':'linen';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='linen';}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${syne.variable} ${figtree.variable} h-full`} data-theme="linen">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
