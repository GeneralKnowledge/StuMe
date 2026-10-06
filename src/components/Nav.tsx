import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Nav({ compact = false }: { compact?: boolean }) {
  return (
    <header className={compact ? "nav-row nav-row-compact" : "nav-row"}>
      <Link href="/" className="brand brand-nav">
        StuMe
      </Link>
      <div className="nav-end">
        <ThemeToggle />
        <div className="nav-links nav-links-desktop">
          <Link className="pill-link" href="/">
            Cook
          </Link>
          <Link className="pill-link" href="/kitchen">
            Kitchen
          </Link>
        </div>
      </div>
    </header>
  );
}
