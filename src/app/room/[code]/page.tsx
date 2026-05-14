"use client";

import { use } from "react";
import RoomApp from "@/components/RoomApp";

export default function RoomCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <RoomApp code={code.toUpperCase()} />;
}
