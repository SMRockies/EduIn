import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { isSupported } from "../extractors/extractorFactory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    if (isSupported(file.mimetype, ext)) {
      cb(null, true);
    } else {
      cb(new Error(`UNSUPPORTED_FILE: ${file.mimetype} (${ext}) is not supported. Supported: PDF, DOCX, XLSX`));
    }
  }
});

export { uploadDir };