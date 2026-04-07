import { useEffect, useState, useCallback } from "react";

/**
 * Global data refresh system.
 * When any page mutates data, it calls `triggerDataRefresh("profiles")` (or "crops", "scans", etc.)
 * Other pages/components listening via `useDataRefresh("profiles")` will get notified and can refetch.
 */

const DATA_REFRESH_EVENT = "data-refresh";

export type RefreshTarget = "profiles" | "crops" | "scans" | "alerts" | "evidence" | "settings" | "activity" | "all";

/** Dispatch a refresh event so all listening hooks refetch */
export function triggerDataRefresh(...targets: RefreshTarget[]) {
  const effectiveTargets = targets.length === 0 ? ["all" as RefreshTarget] : targets;
  effectiveTargets.forEach(target => {
    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail: target }));
  });
}

/** Hook that returns an incrementing version number whenever the specified targets are refreshed */
export function useDataRefresh(...targets: RefreshTarget[]) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const refreshedTarget = (e as CustomEvent).detail as RefreshTarget;
      if (refreshedTarget === "all" || targets.length === 0 || targets.includes(refreshedTarget)) {
        setVersion(v => v + 1);
      }
    };
    window.addEventListener(DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(DATA_REFRESH_EVENT, handler);
  }, [targets.join(",")]);

  return version;
}

/** Hook that re-runs a callback whenever targeted data is refreshed or on route visibility */
export function useAutoRefresh(callback: () => void, targets: RefreshTarget[]) {
  const version = useDataRefresh(...targets);

  useEffect(() => {
    if (version > 0) {
      callback();
    }
  }, [version]);

  // Also refetch when page becomes visible again (tab switch)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [callback]);
}
