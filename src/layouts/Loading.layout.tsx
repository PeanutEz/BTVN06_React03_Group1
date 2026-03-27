import { useEffect } from "react";
import logoHylux from "../assets/logo-hylux.png";
import { lockDocumentScroll } from "../utils/scrollLock.util";

type LoadingLayoutProps = {
  message?: string;
};

const LoadingLayout = ({ message = "Đang tải" }: LoadingLayoutProps) => {
  useEffect(() => {
    return lockDocumentScroll();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-6">
        <div className="loading-scene">
          <div className="progress-ring" />

          <div className="coffee-particles">
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

        <div className="loading-text">{message}</div>
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </div>
  );
};

export default LoadingLayout;
