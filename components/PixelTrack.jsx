"use client";

import { useEffect } from "react";
import { track } from "@/lib/fbpixel";

// মাউন্ট হলে একটি Pixel ইভেন্ট ফায়ার করে (যেমন ViewContent)
export default function PixelTrack({ event, data }) {
  useEffect(() => {
    track(event, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
