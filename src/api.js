import { t } from "./i18n";

let currentLang = "bg";

export function setApiLang(lang) {
  currentLang = lang === "en" ? "en" : "bg";
}

export async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(t(currentLang, "errInvalidJson", { status: res.status }));
    }
  }

  const trimmed = text.trimStart();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(t(currentLang, "errApiUnavailable"));
  }

  if (res.status >= 400) {
    throw new Error(trimmed || t(currentLang, "errServer", { status: res.status }));
  }

  throw new Error(trimmed || t(currentLang, "errInvalidResponse", { status: res.status }));
}

export async function apiRequest(url, options = {}) {
  let res;
  const headers = new Headers(options.headers || {});
  headers.set("Accept-Language", currentLang);

  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(t(currentLang, "errApiUnavailable"));
  }

  const data = await parseJsonResponse(res);
  return { res, data };
}
