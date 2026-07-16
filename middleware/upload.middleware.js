import multer from "multer";
import { isSupported } from "../extractors/extractorFactory.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (isSupported(file.mimetype, ext)) {
      cb(null, true);
    } else {
      cb(new Error(`UNSUPPORTED_FILE: ${file.mimetype} (${ext}) is not supported. Supported: PDF, DOCX, XLSX, PPTX`));
    }
  }
});