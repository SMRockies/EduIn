import multer from "multer";
import { isSupported } from "../extractors/extractorFactory.js";

const MB = 1024 * 1024;
const isVercelDeployment = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || (isVercelDeployment ? 4 : 0));
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB > 0 ? MAX_UPLOAD_MB * MB : undefined;

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (isSupported(file.mimetype, ext)) {
      cb(null, true);
    } else {
      cb(new Error(`UNSUPPORTED_FILE: ${file.mimetype} (${ext}) is not supported. Supported: PDF, DOCX, XLSX, PPTX, PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF`));
    }
  }
};

export const upload = multer({
  ...multerOptions,
  ...(MAX_UPLOAD_BYTES ? { limits: { fileSize: MAX_UPLOAD_BYTES } } : {})
});

export { MAX_UPLOAD_MB };
