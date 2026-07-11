"use client";

import { useEffect } from "react";

/** Registers the offline service worker once on the client. */
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // offline support is a bonus, never an error
      });
    }
  }, []);
  return null;
}
