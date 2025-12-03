import type { Puter } from "@heyputer/puter.js";

let puterInstance: Puter;

export const getPuter = async () => {
  if (!puterInstance && typeof window !== "undefined") {
    const { puter } = await import("@heyputer/puter.js");
    puterInstance = puter;
  }

  return puterInstance;
};
