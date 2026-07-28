const API_UNAVAILABLE_MSG =
  "API сървърът не отговаря. Стартирай го с: npm run server";

export async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Невалиден JSON отговор от сървъра (${res.status})`);
    }
  }

  const trimmed = text.trimStart();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(API_UNAVAILABLE_MSG);
  }

  if (res.status >= 400) {
    throw new Error(trimmed || `Грешка от сървъра (${res.status})`);
  }

  throw new Error(trimmed || `Невалиден отговор от сървъра (${res.status})`);
}

export async function apiRequest(url, options = {}) {
  let res;

  try {
    res = await fetch(url, options);
  } catch {
    throw new Error(API_UNAVAILABLE_MSG);
  }

  const data = await parseJsonResponse(res);
  return { res, data };
}
