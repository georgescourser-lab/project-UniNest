"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveDataSync() {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = 0;

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh < 750) return;
      lastRefresh = now;
      router.refresh();
      window.dispatchEvent(new CustomEvent("uninest:live-refresh"));
    };

    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("uninest-live-sync")
        : null;

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === "uninest-live-change") refresh();
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key.startsWith("uninest_") ||
        event.key.startsWith("uninest-")
      ) {
        refresh();
      }
    };

    const handleLiveChange = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("uninest:live-change", handleLiveChange);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    const pollingInterval = window.setInterval(refresh, 8000);

    return () => {
      window.clearInterval(pollingInterval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("uninest:live-change", handleLiveChange);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel?.close();
    };
  }, [router]);

  return null;
}
