import Link from "next/link";

export function Nav() {
  return (
    <div className="nav-row">
      <Link href="/" className="brand" style={{ fontSize: "1.4rem" }}>
        StuMe
      </Link>
      <div className="nav-links">
        <Link className="pill-link" href="/">
          What can I make?
        </Link>
        <Link className="pill-link" href="/kitchen">
          My kitchen
        </Link>
      </div>
    </div>
  );
}
