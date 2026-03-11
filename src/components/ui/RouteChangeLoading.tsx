import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import logoHylux from "../../assets/logo-hylux.png";

type RouteChangeLoadingProps = {
  minDurationMs?: number;
};

export function RouteChangeLoading({ minDurationMs = 600 }: RouteChangeLoadingProps) {
  const location = useLocation();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const apiActive = isFetching + isMutating > 0;

  const [visible, setVisible] = useState(false);
  const minElapsedRef = useRef(false);
  const apiDoneRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  const tryHide = useCallback(() => {
    if (minElapsedRef.current && apiDoneRef.current) {
      setVisible(false);
    }
  }, []);

  // When route changes → show loading, reset flags
  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setVisible(true);
    minElapsedRef.current = false;
    apiDoneRef.current = false;

    timeoutRef.current = window.setTimeout(() => {
      minElapsedRef.current = true;
      timeoutRef.current = null;
      tryHide();
    }, minDurationMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [location.pathname, location.search, location.hash, minDurationMs, tryHide]);

  // Track API state — mark done only when all requests finish
  useEffect(() => {
    if (!visible) return;

    if (!apiActive) {
      apiDoneRef.current = true;
      tryHide();
    } else {
      apiDoneRef.current = false;
    }
  }, [apiActive, visible, tryHide]);

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

          <div className="loading-text">Đang chuyển trang</div>
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
