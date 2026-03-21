import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import logoHylux from "../../assets/logo-hylux.png";
import { useLoadingStore } from "../../store/loading.store";

const MAX_MS = 8000;
const SKIP_PATHS = ["/", "/login", "/register", "/reset-password"];

type RouteChangeLoadingProps = {
  minDurationMs?: number;
};

export function RouteChangeLoading({ minDurationMs = 600 }: RouteChangeLoadingProps) {
  const location = useLocation();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const manualLoading = useLoadingStore((s) => s.isLoading);
  const manualMessage = useLoadingStore((s) => s.message);
  const hideManual = useLoadingStore((s) => s.hide);

  // routeVisible handles route-change loading separately
  // The overlay shows if EITHER is true — manualLoading is derived directly so it
  // appears in the same render frame (no useEffect delay)
  const [routeVisible, setRouteVisible] = useState(false);
  const visible = routeVisible || manualLoading;

  const minElapsedRef = useRef(false);
  const apiDoneRef = useRef(true);
  const minTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const trackApiRef = useRef(false);

  const isSkipPath = SKIP_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  const forceHide = useCallback(() => {
    setRouteVisible(false);
    trackApiRef.current = false;
    if (minTimerRef.current) { window.clearTimeout(minTimerRef.current); minTimerRef.current = null; }
    if (maxTimerRef.current) { window.clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }, []);

  const tryHide = useCallback(() => {
    if (minElapsedRef.current && apiDoneRef.current) forceHide();
  }, [forceHide]);

  const startRouteLoading = useCallback(() => {
    if (minTimerRef.current) { window.clearTimeout(minTimerRef.current); minTimerRef.current = null; }
    if (maxTimerRef.current) { window.clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    setRouteVisible(true);
    minElapsedRef.current = false;
    apiDoneRef.current = true;
    minTimerRef.current = window.setTimeout(() => {
      minElapsedRef.current = true;
      minTimerRef.current = null;
      tryHide();
    }, minDurationMs);
    maxTimerRef.current = window.setTimeout(() => {
      maxTimerRef.current = null;
      forceHide();
    }, MAX_MS);
  }, [tryHide, forceHide]);

  // Route change → show loading (skip auth/landing pages)
  useEffect(() => {
    if (isSkipPath) { forceHide(); return; }
    // If manual loading was active (e.g. login), just clear it — no route-change loading needed
    if (manualLoading) {
      hideManual();
      forceHide();
      return;
    }
    trackApiRef.current = true;
    startRouteLoading();
    return () => {
      if (minTimerRef.current) { window.clearTimeout(minTimerRef.current); minTimerRef.current = null; }
      if (maxTimerRef.current) { window.clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  // Max safety timeout for manual loading (prevents stuck overlay)
  useEffect(() => {
    if (!manualLoading) return;
    const t = window.setTimeout(() => hideManual(), MAX_MS);
    return () => window.clearTimeout(t);
  }, [manualLoading, hideManual]);

  // Track API calls fired right after a route change
  useEffect(() => {
    if (!routeVisible || !trackApiRef.current) return;
    const apiActive = isFetching + isMutating > 0;
    if (apiActive) {
      apiDoneRef.current = false;
    } else {
      apiDoneRef.current = true;
      tryHide();
    }
  }, [isFetching, isMutating, routeVisible, tryHide]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Golden progress bar at top */}
      <div className="route-progress-bar" />

      {/* Centered loading scene */}
      <div className="flex h-full items-center justify-center bg-slate-950/55 backdrop-blur-md">
        <div className="flex flex-col items-center gap-6">
          <div className="loading-scene">
            {/* Progress ring */}
            <div className="progress-ring" />

            {/* Orbiting beans */}
            <div className="orbit-ring">
              <div className="coffee-bean" />
              <div className="coffee-bean" />
              <div className="coffee-bean" />
              <div className="coffee-bean" />
            </div>

            {/* Floating particles */}
            <div className="coffee-particles">
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
            </div>

            {/* Steam */}
            <div className="steam-group">
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
              <div className="steam-wisp" />
            </div>

            {/* Cup structure */}
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

          <div className="loading-text">{manualLoading ? manualMessage : "Đang chuyển trang"}</div>
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
