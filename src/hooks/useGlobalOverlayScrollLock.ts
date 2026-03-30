import { useEffect, useRef } from "react";
import { lockDocumentScroll } from "../utils/scrollLock.util";

const MIN_BLOCKING_Z_INDEX = 40;
const BLOCKING_OVERLAY_SELECTOR =
  '[role="dialog"][aria-modal="true"], [class*="fixed"][class*="inset-0"]';
const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.pointerEvents === "none") return false;
  if (Number(style.opacity || "1") <= 0) return false;
  if (style.position !== "fixed") return false;

  const zIndex = Number.parseInt(style.zIndex || "0", 10);
  if (!Number.isFinite(zIndex) || zIndex < MIN_BLOCKING_Z_INDEX) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getClosestBlockingOverlay(target: HTMLElement) {
  let current: HTMLElement | null = target;
  while (current) {
    if (current.matches(BLOCKING_OVERLAY_SELECTOR) && isVisible(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function hasScrollableOverflow(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  const canScrollY =
    SCROLLABLE_OVERFLOW_VALUES.has(style.overflowY) &&
    element.scrollHeight > element.clientHeight + 1;
  const canScrollX =
    SCROLLABLE_OVERFLOW_VALUES.has(style.overflowX) &&
    element.scrollWidth > element.clientWidth + 1;

  return canScrollY || canScrollX;
}

function hasBlockingOverlay() {
  if (typeof document === "undefined") return false;

  const roleDialog = document.querySelector<HTMLElement>(
    '[role="dialog"][aria-modal="true"]',
  );
  if (roleDialog && isVisible(roleDialog)) {
    return true;
  }

  const candidates = document.querySelectorAll<HTMLElement>(
    '[class*="fixed"][class*="inset-0"]',
  );

  for (const element of candidates) {
    if (isVisible(element)) {
      return true;
    }
  }

  return false;
}

function shouldAllowOverlayScroll(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const overlay = getClosestBlockingOverlay(target);
  if (!overlay) {
    return false;
  }

  let current: HTMLElement | null = target;

  while (current) {
    if (current.dataset.allowOverlayScroll === "true") {
      return true;
    }

    if (hasScrollableOverflow(current)) {
      return true;
    }

    if (current === overlay) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    !!target.closest('[contenteditable="true"]')
  );
}

export function useGlobalOverlayScrollLock() {
  const unlockRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncLockState = () => {
      const shouldLock = hasBlockingOverlay();

      if (shouldLock && !unlockRef.current) {
        unlockRef.current = lockDocumentScroll();
        return;
      }

      if (!shouldLock && unlockRef.current) {
        unlockRef.current();
        unlockRef.current = null;
      }
    };

    const scheduleSync = () => {
      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncLockState();
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-hidden", "hidden"],
    });

    const preventWheelAndTouch = (event: WheelEvent | TouchEvent) => {
      if (!hasBlockingOverlay()) {
        return;
      }

      if (shouldAllowOverlayScroll(event.target)) {
        return;
      }

      event.preventDefault();
    };

    const preventScrollKeys = (event: KeyboardEvent) => {
      if (!hasBlockingOverlay()) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (shouldAllowOverlayScroll(event.target)) {
        return;
      }

      const blockedKeys = ["PageUp", "PageDown", "Home", "End", " ", "ArrowUp", "ArrowDown"];
      if (blockedKeys.includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("resize", scheduleSync);
    document.addEventListener("wheel", preventWheelAndTouch, { passive: false });
    document.addEventListener("touchmove", preventWheelAndTouch, {
      passive: false,
    });
    document.addEventListener("keydown", preventScrollKeys, { passive: false });
    scheduleSync();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleSync);
      document.removeEventListener("wheel", preventWheelAndTouch);
      document.removeEventListener("touchmove", preventWheelAndTouch);
      document.removeEventListener("keydown", preventScrollKeys);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (unlockRef.current) {
        unlockRef.current();
        unlockRef.current = null;
      }
    };
  }, []);
}
