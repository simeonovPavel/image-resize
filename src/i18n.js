const LANG_KEY = "resize-lang";

export const SUPPORTED_LANGS = ["bg", "en"];

const dict = {
  bg: {
    brand: "Image Resize",
    heroTitle: "Преоразмери снимките от папката",
    heroLede:
      "Избери файлове от {images}, задай размер и запази в {downloads}.",
    themeLight: "Светла",
    themeDark: "Тъмна",
    themeToLight: "Включи светла тема",
    themeToDark: "Включи тъмна тема",
    langBg: "BG",
    langEn: "EN",
    langSwitch: "Език",

    galleryTitle: "Качени снимки",
    galleryHint: "Избери файловете, които искаш да преоразмериш.",
    loading: "Зареждане…",
    emptyGallery:
      "Няма снимки в {images}. Качи файлове с бутона Качи снимки или добави ги ръчно и натисни Презареди.",

    upload: "Качи снимки",
    uploading: "Качва…",
    selectAll: "Избери всички",
    deselectAll: "Махни всички",
    reload: "Презареди",
    delete: "Изтрий ({count})",
    deleting: "Изтрива…",
    resize: "Resize ({count})",
    resizing: "Обработва…",
    deleteImage: "Изтрий {name}",
    confirmDeleteMany: "Изтрий {count} избрани снимки?",

    width: "Ширина",
    height: "Височина",
    fit: "Fit",
    format: "Формат",
    compression: "Компресия",
    rename: "Ново име",
    renamePlaceholder: "напр. cover → cover-1, cover-2…",
    lockAspect: "Заключи пропорцията",
    unlockAspect: "Отключи пропорцията",
    aspectLocked: "Пропорцията е заключена",
    aspectLockedHint: " · заключена пропорция",
    targetSize: "Целеви размер: ",
    original: "Оригинал: ",

    formatOriginal: "Оригинален",
    fitCover: "Cover (изрязва)",
    fitContain: "Contain (с полета)",
    fitFill: "Fill (разтяга)",
    fitInside: "Inside (вмества)",
    fitOutside: "Outside (покрива)",

    compressionMax: "Максимум — почти без загуба",
    compressionHigh: "Високо — печат / архив",
    compressionWeb: "Уеб — баланс (препоръчително)",
    compressionSmall: "Малък файл — социални мрежи",
    compressionTiny: "Минимален — бързо зареждане",

    wmTitle: "Watermark",
    wmHint: "Текст или лого върху готовите снимки.",
    wmType: "Тип",
    wmText: "Текст",
    wmLogo: "Лого",
    wmPosition: "Позиция",
    wmOpacity: "Прозрачност",
    wmScale: "Мащаб",
    wmTextPlaceholder: "напр. © Resize",
    wmUploadLogo: "Качи лого",
    wmRemoveLogo: "Премахни",
    posNw: "Горе ляво",
    posNe: "Горе дясно",
    posCenter: "Център",
    posSw: "Долу ляво",
    posSe: "Долу дясно",

    resultsTitle: "Генерирани снимки",
    resultsHint: "Записват се в Downloads с папка по днешна дата.",
    downloadZip: "Изтегли ZIP",
    zipping: "Подготвя…",
    openFolder: "Отвори папката",
    openingFolder: "Отваря…",
    compareTitle: "Преди / след",
    comparePhoto: "Снимка",
    compareBefore: "Оригинал",
    compareAfter: "Резултат",
    sizeVsOriginal: "{label} спрямо оригинала",
    sizeSmaller: "По-малък от оригинала",
    sizeLarger: "По-голям от оригинала",
    sizeSame: "Същият размер",

    historyTitle: "Последни настройки",
    historyHint: "Кликни, за да заредиш размер, формат и компресия.",
    presetsTitle: "Готови размери",
    presetsHint: "Избери aspect ratio и размер с един клик.",
    fitPreviewTitle: "Превю на fit",
    fitPreviewHint:
      "Цел: {width}×{height} px. Кликни върху опция, за да я избереш.",

    presetGroupVideo: "Видео и екран",
    presetGroupPhoto: "Фото и печат",
    presetGroupSocial: "Социални мрежи",
    presetStandard: "Стандарт",
    presetMonitor: "Монитор",
    presetPortrait: "Портрет",
    presetSquare: "Квадрат",
    presetBanner: "Банер",

    summarySameSize: "{count} снимки · {size}",
    summaryMixed: "{count} снимки с различни размери",

    msgLoadedSettings: "Заредени настройки: {label}",
    msgDone:
      "Готово: {count} снимки → {size}{format}{compression}{watermark}{rename}{folder}",
    msgUploaded: "Качени {count} снимки в images/",
    msgLogoUploaded: "Логото за watermark е качено",
    msgLogoRemoved: "Логото е премахнато",
    msgDeletedOne: "Изтрита 1 снимка",
    msgDeletedMany: "Изтрити {count} снимки",
    msgOpenPath: "Опит за отваряне. Път (копиран): {path}",
    msgOpenOk: "Папката с резултатите е отворена",
    msgZipDone: "Изтеглен ZIP с {count} снимки",

    errLoadImages: "Неуспешно зареждане на снимките",
    errLoad: "Грешка при зареждане",
    errResize: "Resize неуспешен",
    errResizeGeneric: "Грешка при resize",
    errUpload: "Качването неуспешно",
    errUploadGeneric: "Грешка при качване",
    errLogoUpload: "Качването на лого неуспешно",
    errLogoUploadGeneric: "Грешка при качване на лого",
    errDelete: "Изтриването неуспешно",
    errDeleteGeneric: "Грешка при изтриване",
    errLogoDeleteGeneric: "Грешка при изтриване на лого",
    errOpenFolder: "Неуспешно отваряне на папката",
    errOpenFolderGeneric: "Грешка при отваряне на папката",
    errZip: "ZIP изтеглянето неуспешно",
    errZipGeneric: "Грешка при ZIP",
    errApiUnavailable: "API сървърът не отговаря. Стартирай го с: npm run server",
    errInvalidJson: "Невалиден JSON отговор от сървъра ({status})",
    errServer: "Грешка от сървъра ({status})",
    errInvalidResponse: "Невалиден отговор от сървъра ({status})",
  },
  en: {
    brand: "Image Resize",
    heroTitle: "Resize images from your folder",
    heroLede:
      "Pick files from {images}, set the size, and save to {downloads}.",
    themeLight: "Light",
    themeDark: "Dark",
    themeToLight: "Switch to light theme",
    themeToDark: "Switch to dark theme",
    langBg: "BG",
    langEn: "EN",
    langSwitch: "Language",

    galleryTitle: "Uploaded images",
    galleryHint: "Select the files you want to resize.",
    loading: "Loading…",
    emptyGallery:
      "No images in {images}. Upload with Upload images or add them manually and click Reload.",

    upload: "Upload images",
    uploading: "Uploading…",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    reload: "Reload",
    delete: "Delete ({count})",
    deleting: "Deleting…",
    resize: "Resize ({count})",
    resizing: "Processing…",
    deleteImage: "Delete {name}",
    confirmDeleteMany: "Delete {count} selected images?",

    width: "Width",
    height: "Height",
    fit: "Fit",
    format: "Format",
    compression: "Compression",
    rename: "New name",
    renamePlaceholder: "e.g. cover → cover-1, cover-2…",
    lockAspect: "Lock aspect ratio",
    unlockAspect: "Unlock aspect ratio",
    aspectLocked: "Aspect ratio locked",
    aspectLockedHint: " · aspect locked",
    targetSize: "Target size: ",
    original: "Original: ",

    formatOriginal: "Original",
    fitCover: "Cover (crop)",
    fitContain: "Contain (letterbox)",
    fitFill: "Fill (stretch)",
    fitInside: "Inside (fit)",
    fitOutside: "Outside (cover)",

    compressionMax: "Maximum — near lossless",
    compressionHigh: "High — print / archive",
    compressionWeb: "Web — balanced (recommended)",
    compressionSmall: "Small file — social media",
    compressionTiny: "Minimal — fast loading",

    wmTitle: "Watermark",
    wmHint: "Text or logo on the output images.",
    wmType: "Type",
    wmText: "Text",
    wmLogo: "Logo",
    wmPosition: "Position",
    wmOpacity: "Opacity",
    wmScale: "Scale",
    wmTextPlaceholder: "e.g. © Resize",
    wmUploadLogo: "Upload logo",
    wmRemoveLogo: "Remove",
    posNw: "Top left",
    posNe: "Top right",
    posCenter: "Center",
    posSw: "Bottom left",
    posSe: "Bottom right",

    resultsTitle: "Generated images",
    resultsHint: "Saved to Downloads in a folder named by today’s date.",
    downloadZip: "Download ZIP",
    zipping: "Preparing…",
    openFolder: "Open folder",
    openingFolder: "Opening…",
    compareTitle: "Before / after",
    comparePhoto: "Image",
    compareBefore: "Original",
    compareAfter: "Result",
    sizeVsOriginal: "{label} vs original",
    sizeSmaller: "Smaller than original",
    sizeLarger: "Larger than original",
    sizeSame: "Same size as original",

    historyTitle: "Recent settings",
    historyHint: "Click to restore size, format, and compression.",
    presetsTitle: "Ready sizes",
    presetsHint: "Pick an aspect ratio and size in one click.",
    fitPreviewTitle: "Fit preview",
    fitPreviewHint: "Target: {width}×{height} px. Click an option to select it.",

    presetGroupVideo: "Video & screen",
    presetGroupPhoto: "Photo & print",
    presetGroupSocial: "Social",
    presetStandard: "Standard",
    presetMonitor: "Monitor",
    presetPortrait: "Portrait",
    presetSquare: "Square",
    presetBanner: "Banner",

    summarySameSize: "{count} images · {size}",
    summaryMixed: "{count} images with different sizes",

    msgLoadedSettings: "Loaded settings: {label}",
    msgDone:
      "Done: {count} images → {size}{format}{compression}{watermark}{rename}{folder}",
    msgUploaded: "Uploaded {count} images to images/",
    msgLogoUploaded: "Watermark logo uploaded",
    msgLogoRemoved: "Logo removed",
    msgDeletedOne: "Deleted 1 image",
    msgDeletedMany: "Deleted {count} images",
    msgOpenPath: "Tried to open. Path (copied): {path}",
    msgOpenOk: "Results folder opened",
    msgZipDone: "Downloaded ZIP with {count} images",

    errLoadImages: "Failed to load images",
    errLoad: "Error while loading",
    errResize: "Resize failed",
    errResizeGeneric: "Error while resizing",
    errUpload: "Upload failed",
    errUploadGeneric: "Error while uploading",
    errLogoUpload: "Logo upload failed",
    errLogoUploadGeneric: "Error while uploading logo",
    errDelete: "Delete failed",
    errDeleteGeneric: "Error while deleting",
    errLogoDeleteGeneric: "Error while deleting logo",
    errOpenFolder: "Failed to open folder",
    errOpenFolderGeneric: "Error while opening folder",
    errZip: "ZIP download failed",
    errZipGeneric: "Error creating ZIP",
    errApiUnavailable: "API server is not responding. Start it with: npm run server",
    errInvalidJson: "Invalid JSON response from server ({status})",
    errServer: "Server error ({status})",
    errInvalidResponse: "Invalid server response ({status})",
  },
};

export function getInitialLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (SUPPORTED_LANGS.includes(saved)) return saved;
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("bg") ? "bg" : "en";
}

export function saveLang(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    localStorage.setItem(LANG_KEY, lang);
  }
}

export function t(lang, key, vars = {}) {
  const table = dict[lang] || dict.bg;
  let text = table[key] ?? dict.bg[key] ?? key;
  return String(text).replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] == null ? "" : String(vars[name])
  );
}

export function createTranslator(lang) {
  return (key, vars) => t(lang, key, vars);
}
