import { generateUploadDropzone } from "@uploadthing/react";
import type { AppFileRouter } from "@/app/api/uploadthing/core";

export const UploadDropzone = generateUploadDropzone<AppFileRouter>();
