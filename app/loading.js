import React from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Loading() {
  return <LoadingScreen message="Loading workspace & enterprise modules..." subtext="Connecting services" />;
}
