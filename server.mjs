import express from "express";
import sharp from "sharp";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn, execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "images");
const WATERMARKS_DIR = path.join(__dirname, "watermarks");
const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tiff"]);
const LOGO_EXT = new Set([".png", ".webp", ".svg", ".jpg", ".jpeg"]);
const OUTPUT_FORMATS = {
  jpg: { ext: ".jpg", format: "jpeg" },
  jpeg: { ext: ".jpeg", format: "jpeg" },
  png: { ext: ".png", format: "png" },
  webp: { ext: ".webp", format: "webp" },
  gif: { ext: ".gif", format: "gif" },
  avif: { ext: ".avif", format: "avif" },
  tiff: { ext: ".tiff", format: "tiff" },
};
const WATERMARK_POSITIONS = new Set([
  "northwest",
  "northeast",
  "southwest",
  "southeast",
  "center",
]);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const MAX_UPLOAD_COUNT = 20;
const DATE_FOLDER_RE = /^resize-\d{4}-\d{2}-\d{2}$/;

const SERVER_MSG = {
  bg: {
    unsupportedFormat: "Неподдържан формат: {ext}",
    unsupportedLogo: "Неподдържан формат за лого: {ext}",
    noWatermarkLogo: "Няма качено лого за watermark",
    noDeleteSelection: "Няма избрани файлове за изтриване",
    imagesNotFound: "Снимките не са намерени",
    openFolderFailed: "Неуспешно отваряне на папката",
    invalidFormat: "Невалиден изходен формат",
    invalidSize: "Невалидна ширина или височина",
    noImagesSelected: "Няма избрани снимки",
    noLogoFile: "Няма избран файл за лого",
    invalidFolder: "Невалидна папка",
    folderNotFound: "Папката не е намерена",
    noZipFiles: "Няма валидни файлове за ZIP",
    noUploadFiles: "Няма избрани файлове",
    fileTooLarge: "Файлът е твърде голям (макс. 50 MB)",
    tooManyFiles: "Максимум {count} файла наведнъж",
    invalidPath: "Невалиден път",
    fileNotFound: "Файлът не е намерен",
    unknownExt: "неизвестен",
  },
  en: {
    unsupportedFormat: "Unsupported format: {ext}",
    unsupportedLogo: "Unsupported logo format: {ext}",
    noWatermarkLogo: "No watermark logo uploaded",
    noDeleteSelection: "No files selected for deletion",
    imagesNotFound: "Images not found",
    openFolderFailed: "Failed to open folder",
    invalidFormat: "Invalid output format",
    invalidSize: "Invalid width or height",
    noImagesSelected: "No images selected",
    noLogoFile: "No logo file selected",
    invalidFolder: "Invalid folder",
    folderNotFound: "Folder not found",
    noZipFiles: "No valid files for ZIP",
    noUploadFiles: "No files selected",
    fileTooLarge: "File is too large (max 50 MB)",
    tooManyFiles: "Maximum {count} files at once",
    invalidPath: "Invalid path",
    fileNotFound: "File not found",
    unknownExt: "unknown",
  },
};

function reqLang(req) {
  const header = String(req?.headers?.["accept-language"] || "").toLowerCase();
  if (header.startsWith("en")) return "en";
  return "bg";
}

function msg(req, key, vars = {}) {
  const lang = reqLang(req);
  let text = SERVER_MSG[lang]?.[key] || SERVER_MSG.bg[key] || key;
  return String(text).replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] == null ? "" : String(vars[name])
  );
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(WATERMARKS_DIR)) fs.mkdirSync(WATERMARKS_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

function getDateFolderName(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `resize-${year}-${month}-${day}`;
}

function getOutputDir(date = new Date()) {
  const dir = path.join(DOWNLOADS_DIR, getDateFolderName(date));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function listImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXT.has(path.extname(file).toLowerCase()))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(dir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name))
    .map((file) => file.name);
}

function sanitizeFilename(originalName) {
  return path.basename(originalName).replace(/[^\w.\-()\s]/g, "_");
}

function uniqueFilename(dir, originalName) {
  const safe = sanitizeFilename(originalName);
  const ext = path.extname(safe).toLowerCase();
  const base = path.basename(safe, path.extname(safe));
  let candidate = safe;
  let i = 1;

  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${i})${ext}`;
    i += 1;
  }

  return candidate;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: IMAGES_DIR,
    filename: (_req, file, cb) => {
      cb(null, uniqueFilename(IMAGES_DIR, file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: MAX_UPLOAD_COUNT,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXT.has(ext)) {
      cb(null, true);
      return;
    }
    cb(
      new Error(
        msg(req, "unsupportedFormat", {
          ext: ext || msg(req, "unknownExt"),
        })
      )
    );
  },
});

const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: WATERMARKS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `logo${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (LOGO_EXT.has(ext)) {
      cb(null, true);
      return;
    }
    cb(
      new Error(
        msg(req, "unsupportedLogo", {
          ext: ext || msg(req, "unknownExt"),
        })
      )
    );
  },
});

function safeImageName(name) {
  const safe = path.basename(String(name ?? ""));
  if (!safe || !IMAGE_EXT.has(path.extname(safe).toLowerCase())) {
    return null;
  }
  return safe;
}

function normalizeOutputFormat(value) {
  if (!value || value === "original") return "original";
  const key = String(value).toLowerCase().replace(/^\./, "");
  return OUTPUT_FORMATS[key] ? key : null;
}

function getOutputExtension(inputName, outputFormat) {
  if (outputFormat === "original") {
    return path.extname(inputName).toLowerCase() || ".jpg";
  }
  return OUTPUT_FORMATS[outputFormat].ext;
}

function resolveEncodeFormat(inputName, outputFormat) {
  if (outputFormat !== "original") {
    return OUTPUT_FORMATS[outputFormat].format;
  }

  const ext = path.extname(inputName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
  if (ext === ".png") return "png";
  if (ext === ".webp") return "webp";
  if (ext === ".gif") return "gif";
  if (ext === ".avif") return "avif";
  if (ext === ".tif" || ext === ".tiff") return "tiff";
  return "jpeg";
}

function normalizeQuality(value) {
  const quality = Number(value);
  if (!Number.isFinite(quality)) return 82;
  return Math.min(100, Math.max(1, Math.round(quality)));
}

function getOutputFileName(inputName, outputFormat) {
  if (outputFormat === "original") return inputName;
  const base = path.basename(inputName, path.extname(inputName));
  return `${base}${OUTPUT_FORMATS[outputFormat].ext}`;
}

function sanitizeRenameBase(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withoutExt = raw.replace(/\.[a-z0-9]{2,5}$/i, "");
  const safe = path
    .basename(withoutExt)
    .replace(/[^\w.\-()\s]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return safe;
}

function getRenamedOutputFileName(baseName, index, inputName, outputFormat) {
  const ext = getOutputExtension(inputName, outputFormat);
  return `${baseName}-${index}${ext}`;
}

function applyOutputFormat(pipeline, inputName, outputFormat, quality) {
  const q = normalizeQuality(quality);
  const format = resolveEncodeFormat(inputName, outputFormat);

  switch (format) {
    case "jpeg":
      return pipeline.jpeg({
        quality: q,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: q >= 90 ? "4:4:4" : "4:2:0",
      });
    case "png": {
      const pngOptions = {
        compressionLevel: q >= 90 ? 6 : q >= 70 ? 8 : 9,
      };
      if (q <= 60) {
        pngOptions.palette = true;
        pngOptions.quality = q;
      }
      return pipeline.png(pngOptions);
    }
    case "webp":
      return pipeline.webp({
        quality: q,
        effort: 4,
        smartSubsample: true,
      });
    case "gif":
      return pipeline.gif();
    case "avif":
      return pipeline.avif({
        quality: Math.max(1, Math.round(q * 0.85)),
        effort: 4,
        chromaSubsampling: q >= 90 ? "4:4:4" : "4:2:0",
      });
    case "tiff":
      return pipeline.tiff({
        quality: q,
        compression: "jpeg",
      });
    default:
      return pipeline;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeWatermark(raw) {
  if (!raw || typeof raw !== "object" || !raw.enabled) return null;

  const type = raw.type === "image" ? "image" : "text";
  const position = WATERMARK_POSITIONS.has(raw.position)
    ? raw.position
    : "southeast";
  const opacity = Math.min(1, Math.max(0.05, Number(raw.opacity) || 0.4));
  const scale = Math.min(0.5, Math.max(0.05, Number(raw.scale) || 0.2));
  const text = String(raw.text ?? "").trim().slice(0, 80);

  if (type === "text" && !text) return null;

  return { type, position, opacity, scale, text };
}

function getCurrentLogoPath() {
  if (!fs.existsSync(WATERMARKS_DIR)) return null;
  const files = fs
    .readdirSync(WATERMARKS_DIR)
    .filter((file) => LOGO_EXT.has(path.extname(file).toLowerCase()))
    .sort();
  if (files.length === 0) return null;
  return path.join(WATERMARKS_DIR, files[0]);
}

async function buildTextWatermark(text, imageWidth, opacity) {
  const fontSize = Math.max(14, Math.round(imageWidth * 0.035));
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.45);
  const width = Math.ceil(text.length * fontSize * 0.62) + padX * 2;
  const height = fontSize + padY * 2;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" rx="${Math.round(fontSize * 0.25)}" fill="rgba(0,0,0,${(
    opacity * 0.35
  ).toFixed(3)})"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    fill="rgba(255,255,255,${opacity.toFixed(3)})"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}px"
    font-weight="600"
  >${escapeXml(text)}</text>
</svg>`;
  return Buffer.from(svg);
}

async function buildImageWatermark(logoPath, imageWidth, opacity, scale) {
  const targetWidth = Math.max(24, Math.round(imageWidth * scale));
  const resized = await sharp(logoPath)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });

  const alpha = Math.round(255 * opacity);
  return sharp(resized.data, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .composite([
      {
        input: Buffer.from([255, 255, 255, alpha]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

async function applyWatermark(pipeline, watermark, imageWidth) {
  if (!watermark) return pipeline;

  let overlay = null;
  if (watermark.type === "text") {
    overlay = await buildTextWatermark(
      watermark.text,
      imageWidth,
      watermark.opacity
    );
  } else {
    const logoPath = getCurrentLogoPath();
    if (!logoPath) {
      throw new Error("NO_WATERMARK_LOGO");
    }
    overlay = await buildImageWatermark(
      logoPath,
      imageWidth,
      watermark.opacity,
      watermark.scale
    );
  }

  return pipeline.composite([
    {
      input: overlay,
      gravity: watermark.position,
      blend: "over",
    },
  ]);
}

function deleteImageFiles(names) {
  const deleted = [];
  const todayOutputDir = getOutputDir();

  for (const rawName of names) {
    const name = safeImageName(rawName);
    if (!name) continue;

    const imagePath = path.join(IMAGES_DIR, name);
    if (!fs.existsSync(imagePath)) continue;

    fs.unlinkSync(imagePath);
    deleted.push(name);

    const resizedPath = path.join(todayOutputDir, name);
    if (fs.existsSync(resizedPath)) {
      fs.unlinkSync(resizedPath);
    }
  }

  return deleted;
}

function getWindowsShortPath(longPath) {
  try {
    const script = [
      `$p = ${JSON.stringify(longPath)}`,
      "$fso = New-Object -ComObject Scripting.FileSystemObject",
      "Write-Output $fso.GetFolder($p).ShortPath",
    ].join("; ");
    const short = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", script],
      { encoding: "utf8", windowsHide: true, timeout: 8000 }
    )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .pop();
    if (short && /^[A-Za-z]:\\/.test(short)) return short;
  } catch (err) {
    console.error("[open-output] short path failed:", err.message);
  }
  return longPath;
}

function openDirectory(dir) {
  const target = path.resolve(dir);

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (process.platform === "win32") {
    // Username may contain NBSP (U+00A0). Prefer 8.3 short path + interactive
    // scheduled task so Explorer opens on the real desktop (not a hidden session).
    const shortTarget = getWindowsShortPath(target);
    console.log("[open-output] opening:", target, "->", shortTarget);

    const taskName = "ResizeOpenFolder";
    try {
      execFileSync(
        "schtasks",
        [
          "/Create",
          "/TN",
          taskName,
          "/TR",
          `explorer.exe ${shortTarget}`,
          "/SC",
          "ONCE",
          "/ST",
          "23:59",
          "/F",
          "/IT",
          "/RL",
          "LIMITED",
        ],
        { windowsHide: true, stdio: "ignore", timeout: 10000 }
      );
      execFileSync("schtasks", ["/Run", "/TN", taskName], {
        windowsHide: true,
        stdio: "ignore",
        timeout: 10000,
      });
      return;
    } catch (err) {
      console.error("[open-output] schtasks failed:", err.message);
    }

    const child = spawn(
      "cmd.exe",
      ["/c", "start", "", "explorer.exe", shortTarget],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }
    );
    child.on("error", (spawnErr) => {
      console.error("[open-output] start failed:", spawnErr.message);
      spawn("explorer.exe", [shortTarget], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      }).unref();
    });
    child.unref();
    return;
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(command, [target], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

app.get("/api/images", async (_req, res) => {
  try {
    const files = listImageFiles(IMAGES_DIR);
    const images = await Promise.all(
      files.map(async (name) => {
        const filePath = path.join(IMAGES_DIR, name);
        const meta = await sharp(filePath).metadata();
        const { size } = fs.statSync(filePath);
        return {
          name,
          width: meta.width,
          height: meta.height,
          format: meta.format,
          bytes: size,
          url: `/images/${encodeURIComponent(name)}`,
        };
      })
    );
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/images", (req, res) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (files.length === 0) {
      return res.status(400).json({ error: msg(req, "noDeleteSelection") });
    }

    const deleted = deleteImageFiles(files);
    if (deleted.length === 0) {
      return res.status(404).json({ error: msg(req, "imagesNotFound") });
    }

    res.json({ ok: true, count: deleted.length, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/open-output", (_req, res) => {
  try {
    const outputDir = getOutputDir();
    openDirectory(outputDir);
    res.json({
      ok: true,
      path: outputDir,
      folder: path.basename(outputDir),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || msg(_req, "openFolderFailed") });
  }
});

app.get("/api/resized", (_req, res) => {
  try {
    const folder = getDateFolderName();
    const outputDir = getOutputDir();
    const files = listImageFiles(outputDir);
    res.json(
      files.map((name) => ({
        name,
        folder,
        url: `/resizeimages/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/resize", async (req, res) => {
  try {
    const {
      files,
      width = 1980,
      height = 1320,
      fit = "cover",
      format = "original",
      rename = "",
      quality = 82,
      watermark: watermarkRaw = null,
      all = false,
    } = req.body ?? {};

    const outputFormat = normalizeOutputFormat(format);
    if (!outputFormat) {
      return res.status(400).json({ error: msg(req, "invalidFormat") });
    }

    const renameBase = sanitizeRenameBase(rename);
    const outputQuality = normalizeQuality(quality);
    const watermark = normalizeWatermark(watermarkRaw);

    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      return res.status(400).json({ error: msg(req, "invalidSize") });
    }

    const available = listImageFiles(IMAGES_DIR);
    const targets = all
      ? available
      : (Array.isArray(files) ? files : []).filter((f) => available.includes(f));

    if (targets.length === 0) {
      return res.status(400).json({ error: msg(req, "noImagesSelected") });
    }

    const folder = getDateFolderName();
    const outputDir = getOutputDir();
    const results = [];

    for (let i = 0; i < targets.length; i += 1) {
      const name = targets[i];
      const input = path.join(IMAGES_DIR, name);
      const desiredName = renameBase
        ? getRenamedOutputFileName(renameBase, i + 1, name, outputFormat)
        : getOutputFileName(name, outputFormat);
      const outputName = uniqueFilename(outputDir, desiredName);
      const output = path.join(outputDir, outputName);

      let pipeline = sharp(input).resize(Math.round(w), Math.round(h), { fit });
      pipeline = await applyWatermark(pipeline, watermark, Math.round(w));
      pipeline = applyOutputFormat(pipeline, name, outputFormat, outputQuality);
      await pipeline.toFile(output);

      const meta = await sharp(output).metadata();
      const { size } = fs.statSync(output);
      const sourceBytes = fs.statSync(input).size;
      const sizeChangePercent =
        sourceBytes > 0
          ? Number((((size - sourceBytes) / sourceBytes) * 100).toFixed(1))
          : null;
      results.push({
        name: outputName,
        sourceName: name,
        folder,
        width: Math.round(w),
        height: Math.round(h),
        format: meta.format,
        bytes: size,
        sourceBytes,
        sizeChangePercent,
        path: output,
        url: `/resizeimages/${encodeURIComponent(folder)}/${encodeURIComponent(outputName)}`,
        sourceUrl: `/images/${encodeURIComponent(name)}`,
      });
    }

    res.json({
      ok: true,
      count: results.length,
      folder,
      outputDir,
      quality: outputQuality,
      results,
    });
  } catch (err) {
    const message =
      err.message === "NO_WATERMARK_LOGO"
        ? msg(req, "noWatermarkLogo")
        : err.message;
    res.status(500).json({ error: message });
  }
});

app.get("/api/watermark-logo", (_req, res) => {
  try {
    const logoPath = getCurrentLogoPath();
    if (!logoPath) {
      return res.json({ ok: true, logo: null });
    }
    const name = path.basename(logoPath);
    res.json({
      ok: true,
      logo: {
        name,
        url: `/watermarks/${encodeURIComponent(name)}?t=${fs.statSync(logoPath).mtimeMs}`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/watermark-logo", uploadLogo.single("logo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: msg(req, "noLogoFile") });
    }

    // Keep only the newly uploaded logo.
    for (const file of fs.readdirSync(WATERMARKS_DIR)) {
      const full = path.join(WATERMARKS_DIR, file);
      if (full !== req.file.path && fs.statSync(full).isFile()) {
        fs.unlinkSync(full);
      }
    }

    res.json({
      ok: true,
      logo: {
        name: req.file.filename,
        url: `/watermarks/${encodeURIComponent(req.file.filename)}?t=${Date.now()}`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/watermark-logo", (_req, res) => {
  try {
    if (fs.existsSync(WATERMARKS_DIR)) {
      for (const file of fs.readdirSync(WATERMARKS_DIR)) {
        fs.unlinkSync(path.join(WATERMARKS_DIR, file));
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/zip", async (req, res) => {
  try {
    const folder = path.basename(String(req.body?.folder ?? ""));
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!DATE_FOLDER_RE.test(folder)) {
      return res.status(400).json({ error: msg(req, "invalidFolder") });
    }

    const outputDir = path.join(DOWNLOADS_DIR, folder);
    if (!fs.existsSync(outputDir)) {
      return res.status(404).json({ error: msg(req, "folderNotFound") });
    }

    const names = files
      .map((name) => safeImageName(name))
      .filter(Boolean)
      .filter((name) => fs.existsSync(path.join(outputDir, name)));

    if (names.length === 0) {
      return res.status(400).json({ error: msg(req, "noZipFiles") });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folder}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("[zip]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    });
    archive.pipe(res);

    for (const name of names) {
      archive.file(path.join(outputDir, name), { name });
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/upload", upload.array("images", MAX_UPLOAD_COUNT), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: msg(req, "noUploadFiles") });
    }

    const uploaded = await Promise.all(
      req.files.map(async (file) => {
        const meta = await sharp(file.path).metadata();
        const { size } = fs.statSync(file.path);
        return {
          name: file.filename,
          width: meta.width,
          height: meta.height,
          format: meta.format,
          bytes: size,
          url: `/images/${encodeURIComponent(file.filename)}`,
        };
      })
    );

    res.json({ ok: true, count: uploaded.length, files: uploaded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: msg(req, "fileTooLarge") });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res
        .status(400)
        .json({ error: msg(req, "tooManyFiles", { count: MAX_UPLOAD_COUNT }) });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
});

app.use("/images", express.static(IMAGES_DIR));
app.use("/watermarks", express.static(WATERMARKS_DIR));

app.get("/resizeimages/:folder/:name", (req, res) => {
  const folder = path.basename(req.params.folder);
  const name = path.basename(req.params.name);

  if (!DATE_FOLDER_RE.test(folder) || !safeImageName(name)) {
    return res.status(400).json({ error: msg(req, "invalidPath") });
  }

  const filePath = path.join(DOWNLOADS_DIR, folder, name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: msg(req, "fileNotFound") });
  }

  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`Output folder: ${getOutputDir()}`);
});
