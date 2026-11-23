"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CLEAN_SLATE_VERSION = "uninest_clean_slate_v4_20261124";

export default function LiveDataSync() {
  const router = useRouter();

  useEffect(() => {
    // One-time clean slate purge of any legacy cached houses, marketplace items, or placeholders
    try {
      if (localStorage.getItem("uninest_storage_version") !== CLEAN_SLATE_VERSION) {
        const keysToClear = [
          "uninest_posted_marketplace_items",
          "uninest_public_marketplace_items",
          "uninest_pending_verification_submissions",
          "uninest_sold_items",
          "uninest_agent_inquiries",
          "uninest_posted_houses_client",
        ];
        keysToClear.forEach((k) => localStorage.removeItem(k));
        document.cookie = "uninest_posted_houses_meta=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "uninest_sold_houses_archive=; path=/; max-age=0; SameSite=Lax";
        localStorage.setItem("uninest_storage_version", CLEAN_SLATE_VERSION);
      }
    } catch {}

    let lastRefresh = 0;

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh < 1500) return;
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
        event.key &&
        (event.key.startsWith("uninest_posted_") ||
          event.key.startsWith("uninest_sold_") ||
          event.key === "uninest_pending_verification_submissions")
      ) {
        refresh();
      }
    };

    const handleLiveChange = () => refresh();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("uninest:live-change", handleLiveChange);
    window.addEventListener("uninest:item-sold", handleLiveChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("uninest:live-change", handleLiveChange);
      window.removeEventListener("uninest:item-sold", handleLiveChange);
      channel?.close();
    };
  }, [router]);

  return null;
}
