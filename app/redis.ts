import { createClient } from "@redis/client";

const Redis = createClient().on("error", (err) =>
  console.log("Redis Client Error", err)
);

export { Redis };
