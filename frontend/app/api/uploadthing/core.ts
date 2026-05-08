import { UploadThingError } from "uploadthing/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  modelUploader: f(
    { blob: { maxFileSize: "128MB", maxFileCount: 1 } },
    { awaitServerData: false },
  )
    .middleware(async ({ files }) => {
      const allowed = /\.(glb|gltf)$/i;
      for (const file of files) {
        if (!allowed.test(file.name)) {
          throw new UploadThingError("Yalnızca .glb ve .gltf uzantılı 3D modeller yüklenebilir.");
        }
      }
      return {};
    })
    .onUploadComplete(({ file }) => {
      console.log("[uploadthing] Model yüklendi:", file.name);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof uploadRouter;
