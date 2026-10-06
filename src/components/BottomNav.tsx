"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Cook", match: (path: string) => path === "/" || path.startsWith("/recipe") },
  { href: "/kitchen", label: "Kitchen", match: (path: string) => path.startsWith("/kitchen") },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? "bottom-nav-link active" : "bottom-nav-link"}
            aria-current={active ? "page" : undefined}
          >
            <span className={`bottom-nav-mark ${tab.label === "Cook" ? "mark-cook" : "mark-kitchen"}`} aria-hidden />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
