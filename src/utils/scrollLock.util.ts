let activeLockCount = 0;
const SCROLL_LOCK_CLASS = "app-scroll-locked";
let previousStyles:
  | {
      htmlOverflow: string;
      htmlOverscrollBehavior: string;
      bodyOverflow: string;
      bodyOverscrollBehavior: string;
      bodyTouchAction: string;
      htmlHadLockClass: boolean;
      bodyHadLockClass: boolean;
    }
  | null = null;

export function lockDocumentScroll() {
  if (typeof document === "undefined") {
    return () => {};
  }

  const html = document.documentElement;
  const body = document.body;

  if (activeLockCount === 0) {
    previousStyles = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
      htmlHadLockClass: html.classList.contains(SCROLL_LOCK_CLASS),
      bodyHadLockClass: body.classList.contains(SCROLL_LOCK_CLASS),
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    html.classList.add(SCROLL_LOCK_CLASS);
    body.classList.add(SCROLL_LOCK_CLASS);
  }

  activeLockCount += 1;

  return () => {
    activeLockCount = Math.max(0, activeLockCount - 1);

    if (activeLockCount !== 0 || !previousStyles) return;

    html.style.overflow = previousStyles.htmlOverflow;
    html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
    body.style.overflow = previousStyles.bodyOverflow;
    body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
    body.style.touchAction = previousStyles.bodyTouchAction;

    if (!previousStyles.htmlHadLockClass) {
      html.classList.remove(SCROLL_LOCK_CLASS);
    }

    if (!previousStyles.bodyHadLockClass) {
      body.classList.remove(SCROLL_LOCK_CLASS);
    }

    previousStyles = null;
  };
}
