import { generateReactHelpers, generateUploadDropzone } from "@uploadthing/react";
import type { AppFileRouter } from "@/app/api/uploadthing/core";

export const UploadDropzone = generateUploadDropzone<AppFileRouter>();
export const { uploadFiles } = generateReactHelpers<AppFileRouter>();
