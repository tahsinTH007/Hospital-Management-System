import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import { API_URL } from "./config";

export const UploadButton = generateUploadButton({
  url: `${API_URL}/uploadthing`,
});
export const UploadDropzone = generateUploadDropzone({
  url: `${API_URL}/uploadthing`,
});
