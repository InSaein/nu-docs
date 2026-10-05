"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function usePortalDrawer() {
  const isOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) {
      if (isOpenRef.current) {
        menuButtonRef.current?.focus();
      }
      isOpenRef.current = false;
      return;
    }

    isOpenRef.current = true;
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "Tab" && drawerRef.current) {
        const focusableItems = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)");
        const firstItem = focusableItems.item(0);
        const lastItem = focusableItems.item(focusableItems.length - 1);

        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem?.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return {
    isOpen,
    setIsOpen,
    menuButtonRef,
    drawerRef,
  };
}

export function PortalMenuButton({
  isOpen,
  onClick,
  buttonRef,
  controls,
}: {
  isOpen: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  controls: string;
}) {
  return (
    <button
      ref={buttonRef}
      className="portal-menu-button"
      type="button"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onClick}
    >
      {isOpen ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
}
