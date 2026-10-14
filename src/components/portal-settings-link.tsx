"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalSettingsLink() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account settings">
      <Link
        className="portal-settings-link"
        href="/settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
      >
        <span aria-hidden="true">⚙</span>
        Settings
      </Link>
    </nav>
  );
}
