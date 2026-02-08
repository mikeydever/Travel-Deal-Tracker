"use client";

import { useSyncExternalStore } from "react";

export const useClientReady = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
