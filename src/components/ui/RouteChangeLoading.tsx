import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import logoHylux from "../../assets/logo-hylux.png";
import { useLoadingStore } from "../../store/loading.store";
import { lockDocumentScroll } from "../../utils/scrollLock.util";

const MAX_MS = 8000;
const CUP_FILL_CYCLE_MS = 3500;
const SKIP_PATHS = [
  "/",
  "/login",
  "/register",
  "/reset-password",
];

type RouteChangeLoadingProps = {
  minDurationMs?: number;
};

export function RouteChangeLoading({ minDurationMs = 600 }: RouteChangeLoadingProps) {
  const location = useLocation();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const manualLoading = useLoadingStore((s) => s.isLoading);
  const manualMessage = useLoadingStore((s) => s.message);
  const persistOnNextRoute = useLoadingStore((s) => s.persistOnNextRoute);
  const hideManual = useLoadingStore((s) => s.hide);
  const clearRoutePersistence = useLoadingStore((s) => s.clearRoutePersistence);

  // routeVisible handles route-change loading separately.
  // The overlay shows if EITHER source is active so a manual transition loader can appear
  // immediately on submit, then hand off to route/API tracking after navigation.
  const [routeVisible, setRouteVisible] = useState(false);
  const [displayVisible, setDisplayVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState("Đang chuyển trang");
  const visible = routeVisible || manualLoading;

  const minElapsedRef = useRef(false);
  const apiDoneRef = useRef(true);
  const minTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const displayHideTimerRef = useRef<number | null>(null);
  const displayStartedAtRef = useRef<number | null>(null);
  const trackApiRef = useRef(false);
  const requireApiCycleRef = useRef(false);
  const sawApiActivityRef = useRef(false);

  const isSkipPath = SKIP_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
  );

  const clearDisplayHideTimer = useCallback(() => {
    if (displayHideTimerRef.current) {
      window.clearTimeout(displayHideTimerRef.current);
      displayHideTimerRef.current = null;
    }
  }, []);

  const forceHide = useCallback(() => {
    setRouteVisible(false);
    trackApiRef.current = false;
    requireApiCycleRef.current = false;
    sawApiActivityRef.current = false;

    if (minTimerRef.current) {
      window.clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    clearDisplayHideTimer();
  }, [clearDisplayHideTimer]);

  const tryHide = useCallback(() => {
    if (minElapsedRef.current && apiDoneRef.current) forceHide();
  }, [forceHide]);

  const startRouteLoading = useCallback(
    (options?: { requireApiCycle?: boolean; maxDurationMs?: number }) => {
      if (minTimerRef.current) {
        window.clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
      if (maxTimerRef.current) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }

      setRouteVisible(true);
      minElapsedRef.current = false;
      requireApiCycleRef.current = !!options?.requireApiCycle;
      sawApiActivityRef.current = false;
      apiDoneRef.current = !options?.requireApiCycle;

      minTimerRef.current = window.setTimeout(() => {
        minElapsedRef.current = true;
        minTimerRef.current = null;
        tryHide();
      }, minDurationMs);

      const maxDurationMs = options?.maxDurationMs ?? MAX_MS;
      if (maxDurationMs > 0) {
        maxTimerRef.current = window.setTimeout(() => {
          maxTimerRef.current = null;
          forceHide();
        }, maxDurationMs);
      }
    },
    [forceHide, minDurationMs, tryHide],
  );

  // Route change -> show loading (skip auth/landing pages).
  useEffect(() => {
    if (isSkipPath) {
      forceHide();
      return;
    }

    if (manualLoading) {
      if (persistOnNextRoute) {
        clearRoutePersistence();
        trackApiRef.current = true;
        startRouteLoading({ requireApiCycle: true, maxDurationMs: MAX_MS * 2 });
        hideManual();
      } else {
        hideManual();
        forceHide();
      }
      return;
    }

    trackApiRef.current = true;
    startRouteLoading();
    return () => {
      if (minTimerRef.current) {
        window.clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
      if (maxTimerRef.current) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  // Max safety timeout for generic manual loading.
  useEffect(() => {
    if (!manualLoading || persistOnNextRoute) return;
    const t = window.setTimeout(() => hideManual(), MAX_MS);
    return () => window.clearTimeout(t);
  }, [manualLoading, persistOnNextRoute, hideManual]);

  useEffect(() => {
    clearDisplayHideTimer();

    if (visible) {
      setDisplayVisible(true);
      setDisplayMessage(manualLoading ? manualMessage : "Đang chuyển trang");
      if (displayStartedAtRef.current === null) {
        displayStartedAtRef.current = Date.now();
      }
      return;
    }

    if (!displayVisible) {
      displayStartedAtRef.current = null;
      return;
    }

    const startedAt = displayStartedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const cycleProgress = elapsed % CUP_FILL_CYCLE_MS;
    const remaining = cycleProgress === 0 ? 0 : CUP_FILL_CYCLE_MS - cycleProgress;

    displayHideTimerRef.current = window.setTimeout(() => {
      setDisplayVisible(false);
      displayStartedAtRef.current = null;
      displayHideTimerRef.current = null;
    }, remaining);
  }, [clearDisplayHideTimer, displayVisible, manualLoading, manualMessage, visible]);

  // Track API calls fired right after a route change.
  useEffect(() => {
    if (!routeVisible || !trackApiRef.current) return;

    const apiActive = isFetching + isMutating > 0;
    if (apiActive) {
      sawApiActivityRef.current = true;
      apiDoneRef.current = false;
      return;
    }

    if (requireApiCycleRef.current && !sawApiActivityRef.current) return;

    apiDoneRef.current = true;
    tryHide();
  }, [isFetching, isMutating, routeVisible, tryHide]);

  useEffect(() => {
    if (!displayVisible) return;
    return lockDocumentScroll();
  }, [displayVisible]);

  useEffect(() => {
    return () => {
      clearDisplayHideTimer();
    };
  }, [clearDisplayHideTimer]);

  if (!displayVisible) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="route-progress-bar" />

      <div className="flex h-full items-center justify-center bg-slate-950/55 backdrop-blur-md">
        <div className="flex flex-col items-center gap-6">
          <div className="loading-scene">
            <div className="progress-ring" />

            <div className="orbit-ring">
              <div className="coffee-bean" />
              <div className="coffee-bean" />
              <div className="coffee-bean" />
              <div className="coffee-bean" />
            </div>

            <div className="coffee-particles">
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
            </div>

            <div className="steam-group">
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
            </div>

            <div className="cup-rim" />
            <div className="cup-body">
              <div className="cup-liquid" />
            </div>
            <div className="cup-inner" />
            <div className="cup-band" />
            <div className="cup-logo"><img src={logoHylux} alt="Logo" /></div>
            <div className="cup-handle" />
            <div className="cup-saucer" />
          </div>

          <div className="loading-text">{displayMessage}</div>
          <div className="loading-dots">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
