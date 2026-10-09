"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const loadingFavicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#d9dced" stroke-width="4"/><path d="M16 5a11 11 0 0 1 10.7 8.5" fill="none" stroke="#35408F" stroke-linecap="round" stroke-width="4"/><circle cx="16" cy="16" r="2" fill="#F0D234"/></svg>')}`;

function NavigationLoadingObserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRoute = useRef(routeKey);
  const navigationPending = useRef(false);
  const routeLoading = useRef(false);
  const originalFavicon = useRef<string | null>(null);
  const faviconLink = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.href = "/favicon.ico";
      document.head.append(icon);
    }
    faviconLink.current = icon;
    originalFavicon.current = icon.href;

    const showLoadingFavicon = () => {
      if (faviconLink.current) faviconLink.current.href = loadingFavicon;
    };
    const restoreFavicon = () => {
      if (faviconLink.current && originalFavicon.current) {
        faviconLink.current.href = originalFavicon.current;
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;
      const destinationRoute = `${destination.pathname}?${destination.searchParams.toString()}`;
      if (destinationRoute === `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`) return;
      navigationPending.current = true;
      showLoadingFavicon();
    };
    const handlePopState = () => {
      navigationPending.current = true;
      showLoadingFavicon();
    };
    const handleRouteLoading = (event: Event) => {
      routeLoading.current = Boolean((event as CustomEvent<boolean>).detail);
      if (routeLoading.current) {
        showLoadingFavicon();
      } else if (!navigationPending.current) {
        restoreFavicon();
      }
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("nu-docs:route-loading", handleRouteLoading);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("nu-docs:route-loading", handleRouteLoading);
      restoreFavicon();
    };
  }, []);

  useEffect(() => {
    if (previousRoute.current === routeKey) return;
    previousRoute.current = routeKey;
    navigationPending.current = false;
    if (!routeLoading.current && faviconLink.current && originalFavicon.current) {
      faviconLink.current.href = originalFavicon.current;
    }
  }, [routeKey]);

  return null;
}

export function NavigationLoadingIndicator({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return <Suspense fallback={null}><NavigationLoadingObserver /></Suspense>;
}
