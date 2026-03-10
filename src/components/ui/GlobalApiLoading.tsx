import { useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import logoHylux from "../../assets/logo-hylux.png";

type GlobalApiLoadingProps = {
  minDurationMs?: number;
};

export function GlobalApiLoading({ minDurationMs = 5000 }: GlobalApiLoadingProps) {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isActive = isFetching + isMutating > 0;

  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isActive) {
      if (!visible) setVisible(true);
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      return;
    }

    if (!visible) {
      startedAtRef.current = null;
      return;
    }

    const startedAt = startedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minDurationMs - elapsed);

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      startedAtRef.current = null;
      timeoutRef.current = null;
    }, remaining);
  }, [isActive, minDurationMs, visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-lg">
      <div className="flex flex-col items-center gap-6">
        {/* Coffee cup scene */}
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

          {/* Pour stream */}
          <div className="pour-stream" />

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

        <div className="loading-text">Đang tải dữ liệu</div>
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </div>
  );
}
