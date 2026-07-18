import multer from "multer";
import { isSupported } from "../extractors/extractorFactory.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (isSupported(file.mimetype, ext)) {
      cb(null, true);
    } else {
      cb(new Error(`UNSUPPORTED_FILE: ${file.mimetype} (${ext}) is not supported. Supported: PDF, DOCX, XLSX, PPTX`));
    }
  }
});
