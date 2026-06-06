import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "./core";

function getUploadthingCallbackUrl() {
  const rawUrl =
    process.env.UPLOADTHING_CALLBACK_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;

  if (!rawUrl) return undefined;

  const url = rawUrl.trim().replace(/\/$/, "");
  return url.endsWith("/api/uploadthing") ? url : `${url}/api/uploadthing`;
}

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
    callbackUrl: getUploadthingCallbackUrl(),
  },
});
