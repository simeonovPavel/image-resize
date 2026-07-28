import {useEffect, useRef, useState} from "react";
import "./App.scss";
import FitPreview from "./FitPreview";
import CompareSlider from "./CompareSlider";
import {ASPECT_RATIO_PRESETS, findActivePreset} from "./presets";
import {
    enrichWithFileSize,
    formatDimensions,
    formatImageInfo,
    formatSelectionSummary,
    getSizeChange,
} from "./format";
import {apiRequest} from "./api";
import {
    loadHistory,
    loadSettings,
    pushHistory,
    saveSettings,
} from "./settingsStorage";

const FORMAT_OPTIONS = [
    {value: "original", label: "Оригинален"},
    {value: "jpg", label: "JPEG (.jpg)"},
    {value: "jpeg", label: "JPEG (.jpeg)"},
    {value: "png", label: "PNG (.png)"},
    {value: "webp", label: "WebP (.webp)"},
    {value: "gif", label: "GIF (.gif)"},
    {value: "avif", label: "AVIF (.avif)"},
    {value: "tiff", label: "TIFF (.tiff)"},
];

const FIT_OPTIONS = [
    {value: "cover", label: "Cover (изрязва)"},
    {value: "contain", label: "Contain (с полета)"},
    {value: "fill", label: "Fill (разтяга)"},
    {value: "inside", label: "Inside (вмества)"},
    {value: "outside", label: "Outside (покрива)"},
];

const COMPRESSION_OPTIONS = [
    {value: "max", quality: 95, label: "Максимум — почти без загуба"},
    {value: "high", quality: 90, label: "Високо — печат / архив"},
    {value: "web", quality: 82, label: "Уеб — баланс (препоръчително)"},
    {value: "small", quality: 70, label: "Малък файл — социални мрежи"},
    {value: "tiny", quality: 55, label: "Минимален — бързо зареждане"},
];

const WATERMARK_POSITIONS = [
    {value: "northwest", label: "Горе ляво"},
    {value: "northeast", label: "Горе дясно"},
    {value: "center", label: "Център"},
    {value: "southwest", label: "Долу ляво"},
    {value: "southeast", label: "Долу дясно"},
];

const THEME_KEY = "resize-theme";
const ACCEPTED_IMAGE_TYPES =
    "image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.avif,.tiff";
const LOGO_ACCEPT = "image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg,.svg";

function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
}

function ActionIcon({children}) {
    return (
        <span className="button-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round">
                {children}
            </svg>
        </span>
    );
}

function positiveNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function App() {
    const saved = loadSettings();
    const [images, setImages] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [width, setWidth] = useState(saved.width);
    const [height, setHeight] = useState(saved.height);
    const [fit, setFit] = useState(saved.fit);
    const [outputFormat, setOutputFormat] = useState(saved.outputFormat);
    const [compression, setCompression] = useState(saved.compression);
    const [renameBase, setRenameBase] = useState(saved.renameBase);
    const [lockAspect, setLockAspect] = useState(Boolean(saved.lockAspect));
    const [aspectRatio, setAspectRatio] = useState(() => {
        const w = positiveNumber(saved.width, 1980);
        const h = positiveNumber(saved.height, 1320);
        return w / h;
    });
    const [watermarkEnabled, setWatermarkEnabled] = useState(Boolean(saved.watermarkEnabled));
    const [watermarkType, setWatermarkType] = useState(saved.watermarkType || "text");
    const [watermarkText, setWatermarkText] = useState(saved.watermarkText || "");
    const [watermarkPosition, setWatermarkPosition] = useState(saved.watermarkPosition || "southeast");
    const [watermarkOpacity, setWatermarkOpacity] = useState(saved.watermarkOpacity ?? 0.4);
    const [watermarkScale, setWatermarkScale] = useState(saved.watermarkScale ?? 0.2);
    const [watermarkLogo, setWatermarkLogo] = useState(null);
    const [history, setHistory] = useState(() => loadHistory());
    const [loading, setLoading] = useState(true);
    const [resizing, setResizing] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [lastResults, setLastResults] = useState([]);
    const [compareIndex, setCompareIndex] = useState(0);
    const [theme, setTheme] = useState(getInitialTheme);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [openingOutput, setOpeningOutput] = useState(false);
    const [zipping, setZipping] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);

    async function loadImages({mergeSelection} = {}) {
        setLoading(true);
        setError("");
        try {
            const {res, data} = await apiRequest("/api/images");
            if (!res.ok) throw new Error("Неуспешно зареждане на снимките");
            const imagesWithSize = await enrichWithFileSize(data);
            setImages(imagesWithSize);
            if (mergeSelection?.length) {
                setSelected((prev) => {
                    const next = new Set(prev);
                    mergeSelection.forEach((name) => next.add(name));
                    return next;
                });
            } else {
                setSelected(new Set(imagesWithSize.map((img) => img.name)));
            }
        } catch (err) {
            setError(err.message || "Грешка при зареждане");
        } finally {
            setLoading(false);
        }
    }

    async function loadWatermarkLogo() {
        try {
            const {res, data} = await apiRequest("/api/watermark-logo");
            if (res.ok) setWatermarkLogo(data.logo ?? null);
        } catch {
            // ignore
        }
    }

    useEffect(() => {
        loadImages();
        loadWatermarkLogo();
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    useEffect(() => {
        saveSettings({
            width,
            height,
            fit,
            outputFormat,
            compression,
            renameBase,
            lockAspect,
            watermarkEnabled,
            watermarkType,
            watermarkText,
            watermarkPosition,
            watermarkOpacity,
            watermarkScale,
        });
    }, [
        width,
        height,
        fit,
        outputFormat,
        compression,
        renameBase,
        lockAspect,
        watermarkEnabled,
        watermarkType,
        watermarkText,
        watermarkPosition,
        watermarkOpacity,
        watermarkScale,
    ]);

    const isLight = theme === "light";

    function toggleTheme() {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    }

    function applyPreset(preset) {
        setWidth(preset.width);
        setHeight(preset.height);
        setAspectRatio(preset.width / preset.height);
    }

    function applyHistoryEntry(entry) {
        const s = entry.settings;
        setWidth(s.width);
        setHeight(s.height);
        setFit(s.fit);
        setOutputFormat(s.outputFormat);
        setCompression(s.compression);
        setRenameBase(s.renameBase || "");
        setLockAspect(Boolean(s.lockAspect));
        setAspectRatio(
            positiveNumber(s.width, 1980) / positiveNumber(s.height, 1320)
        );
        setWatermarkEnabled(Boolean(s.watermarkEnabled));
        setWatermarkType(s.watermarkType || "text");
        setWatermarkText(s.watermarkText || "");
        setWatermarkPosition(s.watermarkPosition || "southeast");
        setWatermarkOpacity(s.watermarkOpacity ?? 0.4);
        setWatermarkScale(s.watermarkScale ?? 0.2);
        setMessage(`Заредени настройки: ${entry.label}`);
    }

    function handleWidthChange(raw) {
        setWidth(raw);
        if (!lockAspect) return;
        const nextWidth = positiveNumber(raw, 0);
        if (!nextWidth) return;
        setHeight(Math.max(1, Math.round(nextWidth / aspectRatio)));
    }

    function handleHeightChange(raw) {
        setHeight(raw);
        if (!lockAspect) return;
        const nextHeight = positiveNumber(raw, 0);
        if (!nextHeight) return;
        setWidth(Math.max(1, Math.round(nextHeight * aspectRatio)));
    }

    function toggleAspectLock() {
        setLockAspect((prev) => {
            const next = !prev;
            if (next) {
                const w = positiveNumber(width, 1980);
                const h = positiveNumber(height, 1320);
                setAspectRatio(w / h);
            }
            return next;
        });
    }

    const activePresetId = findActivePreset(width, height);
    const selectedImages = images.filter((img) => selected.has(img.name));
    const selectionSummary = formatSelectionSummary(selectedImages);
    const compressionOption =
        COMPRESSION_OPTIONS.find((opt) => opt.value === compression) ??
        COMPRESSION_OPTIONS.find((opt) => opt.value === "web");
    const compressionQuality = compressionOption.quality;
    const compareResult =
        lastResults[Math.min(compareIndex, Math.max(0, lastResults.length - 1))] ??
        null;
    const compareSource = compareResult
        ? images.find((img) => img.name === compareResult.sourceName)
        : null;

    function toggle(name) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }

    function toggleAll() {
        if (selected.size === images.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(images.map((img) => img.name)));
        }
    }

    function currentSettingsSnapshot() {
        return {
            width: Number(width),
            height: Number(height),
            fit,
            outputFormat,
            compression,
            renameBase: renameBase.trim(),
            lockAspect,
            watermarkEnabled,
            watermarkType,
            watermarkText: watermarkText.trim(),
            watermarkPosition,
            watermarkOpacity: Number(watermarkOpacity),
            watermarkScale: Number(watermarkScale),
        };
    }

    async function handleResize() {
        setResizing(true);
        setError("");
        setMessage("");
        try {
            const watermark =
                watermarkEnabled
                    ? {
                        enabled: true,
                        type: watermarkType,
                        text: watermarkText.trim(),
                        position: watermarkPosition,
                        opacity: Number(watermarkOpacity),
                        scale: Number(watermarkScale),
                    }
                    : null;

            const {res, data} = await apiRequest("/api/resize", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    files: [...selected],
                    width: Number(width),
                    height: Number(height),
                    fit,
                    format: outputFormat,
                    rename: renameBase.trim(),
                    quality: compressionQuality,
                    watermark,
                }),
            });
            if (!res.ok) throw new Error(data.error || "Resize неуспешен");
            setLastResults(data.results);
            setCompareIndex(0);
            const snapshot = currentSettingsSnapshot();
            saveSettings(snapshot);
            setHistory(pushHistory(snapshot));
            const formatLabel =
                outputFormat === "original"
                    ? ""
                    : ` · ${FORMAT_OPTIONS.find((opt) => opt.value === outputFormat)?.label ?? outputFormat}`;
            const folderLabel = data.folder ? ` → Downloads\\${data.folder}` : "";
            const renameLabel = renameBase.trim()
                ? ` · ${renameBase.trim()}-1…`
                : "";
            const compressionLabel = ` · Q${data.quality ?? compressionQuality}`;
            const watermarkLabel = watermarkEnabled ? " · watermark" : "";
            setMessage(
                `Готово: ${data.count} снимки → ${width}×${height}${formatLabel}${compressionLabel}${watermarkLabel}${renameLabel}${folderLabel}`
            );
        } catch (err) {
            setError(err.message || "Грешка при resize");
        } finally {
            setResizing(false);
        }
    }

    async function handleUpload(event) {
        const files = [...(event.target.files ?? [])];
        event.target.value = "";
        if (files.length === 0) return;

        setUploading(true);
        setError("");
        setMessage("");

        try {
            const formData = new FormData();
            files.forEach((file) => formData.append("images", file));

            const {res, data} = await apiRequest("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error(data.error || "Качването неуспешно");

            await loadImages({
                mergeSelection: data.files.map((file) => file.name),
            });
            setMessage(`Качени ${data.count} снимки в images/`);
        } catch (err) {
            setError(err.message || "Грешка при качване");
        } finally {
            setUploading(false);
        }
    }

    async function handleLogoUpload(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploadingLogo(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("logo", file);
            const {res, data} = await apiRequest("/api/watermark-logo", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error(data.error || "Качването на лого неуспешно");
            setWatermarkLogo(data.logo);
            setWatermarkType("image");
            setWatermarkEnabled(true);
            setMessage("Логото за watermark е качено");
        } catch (err) {
            setError(err.message || "Грешка при качване на лого");
        } finally {
            setUploadingLogo(false);
        }
    }

    async function handleDeleteLogo() {
        try {
            const {res, data} = await apiRequest("/api/watermark-logo", {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(data.error || "Изтриването неуспешно");
            setWatermarkLogo(null);
            if (watermarkType === "image") setWatermarkType("text");
            setMessage("Логото е премахнато");
        } catch (err) {
            setError(err.message || "Грешка при изтриване на лого");
        }
    }

    async function handleDelete(names) {
        const targets = [...new Set(Array.isArray(names) ? names : [names])].filter(Boolean);
        if (targets.length === 0) return;

        if (
            targets.length > 1 &&
            !window.confirm(`Изтрий ${targets.length} избрани снимки?`)
        ) {
            return;
        }

        setDeleting(true);
        setError("");
        setMessage("");

        try {
            const {res, data} = await apiRequest("/api/images", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({files: targets}),
            });
            if (!res.ok) throw new Error(data.error || "Изтриването неуспешно");

            const deleted = new Set(data.deleted);
            setImages((prev) => prev.filter((img) => !deleted.has(img.name)));
            setSelected((prev) => {
                const next = new Set(prev);
                data.deleted.forEach((name) => next.delete(name));
                return next;
            });
            setLastResults((prev) => prev.filter((img) => !deleted.has(img.sourceName) && !deleted.has(img.name)));
            setMessage(
                data.count === 1
                    ? `Изтрита 1 снимка`
                    : `Изтрити ${data.count} снимки`
            );
        } catch (err) {
            setError(err.message || "Грешка при изтриване");
        } finally {
            setDeleting(false);
        }
    }

    async function handleOpenOutputFolder() {
        setOpeningOutput(true);
        setError("");

        try {
            const {res, data} = await apiRequest("/api/open-output", {
                method: "POST",
            });
            if (!res.ok) throw new Error(data.error || "Неуспешно отваряне на папката");
            if (data.path && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(data.path);
                } catch {
                    // Clipboard may be blocked; folder open still attempted.
                }
            }
            setMessage(
                data.path
                    ? `Опит за отваряне. Път (копиран): ${data.path}`
                    : "Папката с резултатите е отворена"
            );
        } catch (err) {
            setError(err.message || "Грешка при отваряне на папката");
        } finally {
            setOpeningOutput(false);
        }
    }

    async function handleDownloadZip() {
        if (lastResults.length === 0) return;
        setZipping(true);
        setError("");
        try {
            const folder = lastResults[0].folder;
            const res = await fetch("/api/zip", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    folder,
                    files: lastResults.map((img) => img.name),
                }),
            });
            if (!res.ok) {
                let messageText = "ZIP изтеглянето неуспешно";
                try {
                    const data = await res.json();
                    messageText = data.error || messageText;
                } catch {
                    // ignore
                }
                throw new Error(messageText);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${folder || "resize"}.zip`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setMessage(`Изтеглен ZIP с ${lastResults.length} снимки`);
        } catch (err) {
            setError(err.message || "Грешка при ZIP");
        } finally {
            setZipping(false);
        }
    }

    return (
        <div className="app">
            <header className="hero">
                <div className="hero-top">
                    <p className="brand">
                        <img
                            className="brand-logo"
                            src="/favicon.svg"
                            alt=""
                            width="36"
                            height="36"
                        />
                        <span>Image Resize</span>
                    </p>
                    <button
                        type="button"
                        className={`theme-toggle ${isLight ? "on" : ""}`}
                        onClick={toggleTheme}
                        aria-pressed={isLight}
                        aria-label={isLight ? "Включи тъмна тема" : "Включи светла тема"}
                    >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb"/>
            </span>
                        <span className="theme-toggle-label">
              {isLight ? "Светла" : "Тъмна"}
            </span>
                    </button>
                </div>
                <h1>Преоразмери снимките от папката</h1>
                <p className="lede">
                    Избери файлове от <code>images/</code>, задай размер и запази в{" "}
                    <code>Downloads/resize-ГГГГ-ММ-ДД/</code>.
                </p>
            </header>

            <section className="gallery">
                <div className="section-heading">
                    <h2>Качени снимки</h2>
                    <p>Избери файловете, които искаш да преоразмериш.</p>
                </div>
                {loading && <p className="empty">Зареждане…</p>}
                {!loading && images.length === 0 && (
                    <p className="empty">
                        Няма снимки в <code>images/</code>. Качи файлове с бутона Качи
                        снимки или добави ги ръчно и натисни Презареди.
                    </p>
                )}
                <div className="grid">
                    {images.map((img) => {
                        const isSelected = selected.has(img.name);
                        return (
                            <div
                                key={img.name}
                                className={`card ${isSelected ? "selected" : ""}`}
                            >
                                <button
                                    type="button"
                                    className="card-select"
                                    onClick={() => toggle(img.name)}
                                >
                                    <img src={img.url} alt={img.name} loading="lazy"/>
                                    <div className="meta">
                                        <span className="name">{img.name}</span>
                                        <span className="size">{formatImageInfo(img)}</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="card-delete"
                                    disabled={deleting}
                                    aria-label={`Изтрий ${img.name}`}
                                    onClick={() => handleDelete(img.name)}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="workspace">
                <div className="workspace-main">
                    <section className="controls">
                        <div className="actions">
                            <div className="file-input-wrapper">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="file-input"
                                    accept={ACCEPTED_IMAGE_TYPES}
                                    multiple
                                    onChange={handleUpload}
                                />
                                <button
                                    type="button"
                                    className="ghost"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ActionIcon>
                                        <path d="M10 13V4"/>
                                        <path d="M6.5 7.5 10 4l3.5 3.5"/>
                                        <path d="M4 14.5v1A1.5 1.5 0 0 0 5.5 17h9A1.5 1.5 0 0 0 16 15.5v-1"/>
                                    </ActionIcon>
                                    {uploading ? "Качва…" : "Качи снимки"}
                                </button>
                            </div>
                            <button type="button" className="ghost" onClick={toggleAll}>
                                <ActionIcon>
                                    <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1"/>
                                    <rect x="11" y="3.5" width="5.5" height="5.5" rx="1"/>
                                    <rect x="3.5" y="11" width="5.5" height="5.5" rx="1"/>
                                    <rect x="11" y="11" width="5.5" height="5.5" rx="1"/>
                                </ActionIcon>
                                {selected.size === images.length
                                    ? "Махни всички"
                                    : "Избери всички"}
                            </button>
                            <button type="button" className="ghost" onClick={loadImages}>
                                <ActionIcon>
                                    <path d="M16 10a6 6 0 1 1-1.6-4.1"/>
                                    <path d="M16 4v4h-4"/>
                                </ActionIcon>
                                Презареди
                            </button>
                            <button
                                type="button"
                                className="ghost danger"
                                disabled={deleting || selected.size === 0}
                                onClick={() => handleDelete([...selected])}
                            >
                                <ActionIcon>
                                    <path d="M4.5 6h11"/>
                                    <path d="M8 3.5h4"/>
                                    <path d="M6.5 6l.7 9.5h5.6L13.5 6"/>
                                </ActionIcon>
                                {deleting ? "Изтрива…" : `Изтрий (${selected.size})`}
                            </button>
                            <button
                                type="button"
                                className="primary"
                                disabled={resizing || selected.size === 0}
                                onClick={handleResize}
                            >
                                <ActionIcon>
                                    <path d="M4 13.5V16h2.5"/>
                                    <path d="M16 6.5V4h-2.5"/>
                                    <path d="m6.5 16 3.5-3.5"/>
                                    <path d="M13.5 4 10 7.5"/>
                                    <path d="M16 13.5V16h-2.5"/>
                                    <path d="M4 6.5V4h2.5"/>
                                    <path d="m13.5 16-3.5-3.5"/>
                                    <path d="M6.5 4 10 7.5"/>
                                </ActionIcon>
                                {resizing ? "Обработва…" : `Resize (${selected.size})`}
                            </button>
                        </div>

                        <div className="dimension-fields">
                            <label>
                                Ширина
                                <input
                                    type="number"
                                    min="1"
                                    value={width}
                                    onChange={(e) => handleWidthChange(e.target.value)}
                                />
                            </label>
                            <button
                                type="button"
                                className={`aspect-lock ${lockAspect ? "on" : ""}`}
                                onClick={toggleAspectLock}
                                aria-pressed={lockAspect}
                                title={lockAspect ? "Отключи пропорцията" : "Заключи пропорцията"}
                            >
                                <ActionIcon>
                                    {lockAspect ? (
                                        <>
                                            <rect x="5" y="9" width="10" height="7" rx="1.5"/>
                                            <path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2"/>
                                        </>
                                    ) : (
                                        <>
                                            <rect x="5" y="9" width="10" height="7" rx="1.5"/>
                                            <path d="M7.5 9V7a2.5 2.5 0 0 1 5 0"/>
                                        </>
                                    )}
                                </ActionIcon>
                                <span className="sr-only">
                  {lockAspect ? "Пропорцията е заключена" : "Заключи пропорцията"}
                </span>
                            </button>
                            <label>
                                Височина
                                <input
                                    type="number"
                                    min="1"
                                    value={height}
                                    onChange={(e) => handleHeightChange(e.target.value)}
                                />
                            </label>
                        </div>

                        <label>
                            Fit
                            <select value={fit} onChange={(e) => setFit(e.target.value)}>
                                {FIT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Формат
                            <select
                                value={outputFormat}
                                onChange={(e) => setOutputFormat(e.target.value)}
                            >
                                {FORMAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Компресия
                            <select
                                value={compression}
                                onChange={(e) => setCompression(e.target.value)}
                            >
                                {COMPRESSION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="rename-field">
                            Ново име
                            <input
                                type="text"
                                value={renameBase}
                                placeholder="напр. cover → cover-1, cover-2…"
                                autoComplete="off"
                                spellCheck="false"
                                onChange={(e) => setRenameBase(e.target.value)}
                            />
                        </label>

                        <div className="watermark-panel">
                            <div className="watermark-panel-heading">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={watermarkEnabled}
                                        onChange={(e) => setWatermarkEnabled(e.target.checked)}
                                    />
                                    Watermark
                                </label>
                                <p>Текст или лого върху готовите снимки.</p>
                            </div>
                            {watermarkEnabled && (
                                <div className="watermark-grid">
                                    <label>
                                        Тип
                                        <select
                                            value={watermarkType}
                                            onChange={(e) => setWatermarkType(e.target.value)}
                                        >
                                            <option value="text">Текст</option>
                                            <option value="image">Лого</option>
                                        </select>
                                    </label>
                                    <label>
                                        Позиция
                                        <select
                                            value={watermarkPosition}
                                            onChange={(e) => setWatermarkPosition(e.target.value)}
                                        >
                                            {WATERMARK_POSITIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Прозрачност
                                        <input
                                            type="number"
                                            min="0.05"
                                            max="1"
                                            step="0.05"
                                            value={watermarkOpacity}
                                            onChange={(e) => setWatermarkOpacity(e.target.value)}
                                        />
                                    </label>
                                    {watermarkType === "text" ? (
                                        <label className="watermark-span-2">
                                            Текст
                                            <input
                                                type="text"
                                                value={watermarkText}
                                                placeholder="напр. © Resize"
                                                maxLength={80}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                            />
                                        </label>
                                    ) : (
                                        <>
                                            <label>
                                                Мащаб
                                                <input
                                                    type="number"
                                                    min="0.05"
                                                    max="0.5"
                                                    step="0.05"
                                                    value={watermarkScale}
                                                    onChange={(e) => setWatermarkScale(e.target.value)}
                                                />
                                            </label>
                                            <div className="watermark-logo-actions">
                                                <input
                                                    ref={logoInputRef}
                                                    type="file"
                                                    className="file-input"
                                                    accept={LOGO_ACCEPT}
                                                    onChange={handleLogoUpload}
                                                />
                                                <button
                                                    type="button"
                                                    className="ghost"
                                                    disabled={uploadingLogo}
                                                    onClick={() => logoInputRef.current?.click()}
                                                >
                                                    {uploadingLogo ? "Качва…" : "Качи лого"}
                                                </button>
                                                {watermarkLogo && (
                                                    <button
                                                        type="button"
                                                        className="ghost danger"
                                                        onClick={handleDeleteLogo}
                                                    >
                                                        Премахни
                                                    </button>
                                                )}
                                            </div>
                                            {watermarkLogo && (
                                                <div className="watermark-logo-preview">
                                                    <img src={watermarkLogo.url} alt={watermarkLogo.name}/>
                                                    <span>{watermarkLogo.name}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="size-summary">
                            <p>
                                <span className="size-summary-label">Целеви размер: </span>
                                <span>
                  <strong>
                    {formatDimensions(Number(width), Number(height))}
                  </strong>
                                    {lockAspect ? " · заключена пропорция" : ""}
                </span>
                            </p>
                            {selectionSummary && (
                                <p>
                                    <span className="size-summary-label">Оригинал: </span>
                                    <span>
                    <strong>{selectionSummary}</strong>
                  </span>
                                </p>
                            )}
                        </div>
                    </section>

                    {error && <p className="status error">{error}</p>}
                    {message && <p className="status ok">{message}</p>}

                    <FitPreview
                        images={selectedImages}
                        targetWidth={Number(width)}
                        targetHeight={Number(height)}
                        activeFit={fit}
                        onSelectFit={setFit}
                    />

                    {lastResults.length > 0 && (
                        <section className="results">
                            <div className="section-heading">
                                <div>
                                    <h2>Генерирани снимки</h2>
                                    <p>Записват се в Downloads с папка по днешна дата.</p>
                                </div>
                                <div className="results-actions">
                                    <button
                                        type="button"
                                        className="ghost"
                                        disabled={zipping}
                                        onClick={handleDownloadZip}
                                    >
                                        <ActionIcon>
                                            <path d="M6 3.5h8v4H6z"/>
                                            <path d="M4.5 7.5h11v9h-11z"/>
                                            <path d="M10 10.5v4"/>
                                            <path d="m8 13 2 1.5L12 13"/>
                                        </ActionIcon>
                                        {zipping ? "Подготвя…" : "Изтегли ZIP"}
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost"
                                        disabled={openingOutput}
                                        onClick={handleOpenOutputFolder}
                                    >
                                        <ActionIcon>
                                            <path d="M3.5 15.5v-11h4l1.4 2H16.5v9z"/>
                                            <path d="M10.5 10h4"/>
                                        </ActionIcon>
                                        {openingOutput ? "Отваря…" : "Отвори папката"}
                                    </button>
                                </div>
                            </div>

                            {compareResult && (
                                <div className="compare-block">
                                    <div className="compare-block-heading">
                                        <h3>Преди / след</h3>
                                        {lastResults.length > 1 && (
                                            <label>
                                                Снимка
                                                <select
                                                    value={compareIndex}
                                                    onChange={(e) => setCompareIndex(Number(e.target.value))}
                                                >
                                                    {lastResults.map((img, index) => (
                                                        <option key={img.name} value={index}>
                                                            {img.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        )}
                                    </div>
                                    <CompareSlider
                                        beforeSrc={
                                            compareSource?.url ||
                                            compareResult.sourceUrl ||
                                            compareResult.url
                                        }
                                        afterSrc={`${compareResult.url}?t=${compareResult.bytes}`}
                                        beforeLabel="Оригинал"
                                        afterLabel="Резултат"
                                        alt={compareResult.name}
                                    />
                                </div>
                            )}

                            <div className="grid">
                                {lastResults.map((img) => {
                                    const sizeChange = getSizeChange(img);
                                    return (
                                    <a
                                        key={img.name}
                                        className="card result"
                                        href={img.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <img src={`${img.url}?t=${img.bytes}`} alt={img.name}/>
                                        <div className="meta">
                                            <span className="name">{img.name}</span>
                                            <span className="size">{formatImageInfo(img)}</span>
                                            {sizeChange && (
                                                <span
                                                    className={`size-change ${sizeChange.direction}`}
                                                    title={
                                                        sizeChange.direction === "smaller"
                                                            ? "По-малък от оригинала"
                                                            : sizeChange.direction === "larger"
                                                              ? "По-голям от оригинала"
                                                              : "Същият размер"
                                                    }
                                                >
                                                    {sizeChange.label} спрямо оригинала
                                                </span>
                                            )}
                                        </div>
                                    </a>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="workspace-sidebar">
                    {history.length > 0 && (
                        <section className="history">
                            <div className="presets-header">
                                <h2>Последни настройки</h2>
                                <p>Кликни, за да заредиш размер, формат и компресия.</p>
                            </div>
                            <div className="history-list">
                                {history.map((entry) => (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        className="history-chip"
                                        onClick={() => applyHistoryEntry(entry)}
                                    >
                                        {entry.label}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="presets">
                        <div className="presets-header">
                            <h2>Готови размери</h2>
                            <p>Избери aspect ratio и размер с един клик.</p>
                        </div>
                        {ASPECT_RATIO_PRESETS.map((group, index) => (
                            <details
                                key={group.group}
                                className="preset-group"
                                open={index === 0}
                            >
                                <summary className="preset-group-summary">
                                    <span>{group.group}</span>
                                    <span className="preset-chevron" aria-hidden="true"/>
                                </summary>
                                <div className="preset-grid">
                                    {group.items.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            className={`preset-chip ${
                                                activePresetId === preset.id ? "active" : ""
                                            }`}
                                            onClick={() => applyPreset(preset)}
                                        >
                                            <span className="preset-ratio">{preset.ratio}</span>
                                            <span className="preset-label">{preset.label}</span>
                                            <span className="preset-size">
                                                {formatDimensions(preset.width, preset.height)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </section>
                </aside>
            </div>
        </div>
    );
}
