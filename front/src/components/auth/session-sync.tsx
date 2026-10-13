"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";

/**
 * Server Components never refresh an expired access cookie (refresh tokens
 * rotate — see docs/ARCHITECTURE.md §2), so a page may be rendered "as a
 * guest" while the browser still holds a valid refresh cookie. The browser's
 * own /auth/me call refreshes the session; when the user it finds differs
 * from the one the server rendered with, re-render the page once.
 */
export function SessionSync({ serverUserId }: { serverUserId: string | null }) {
  const router = useRouter();
  const session = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || session.status !== "ready") return;
    done.current = true;
    if ((session.user?.id ?? null) !== serverUserId) router.refresh();
  }, [session, serverUserId, router]);

  return null;
}
