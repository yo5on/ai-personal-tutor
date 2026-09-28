"use client";

import { useSyncExternalStore } from "react";
import { greeting } from "@/lib/format";

const subscribe = () => () => {};

/** Uses the student's local clock; the server renders a neutral greeting. */
export function Greeting({ name }: { name: string | null }) {
  const hello = useSyncExternalStore(subscribe, () => greeting(), () => "Welcome back");
  return (
    <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
      {hello}
      {name ? `, ${name}` : ""}
    </h1>
  );
}
