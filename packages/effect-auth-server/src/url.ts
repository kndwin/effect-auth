const hasScheme = (value: string) => /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value);

const withDefaultScheme = (value: string) => {
  if (hasScheme(value)) {
    return value;
  }
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(value) ? `http://${value}` : `https://${value}`;
};

export const toAbsoluteBaseUrl = (value: string, fallback = "http://localhost") => {
  const trimmed = value.trim();
  if (!trimmed) {
    return new URL(fallback).toString();
  }
  if (trimmed.startsWith("/")) {
    return new URL(trimmed, fallback).toString();
  }
  return new URL(withDefaultScheme(trimmed)).toString();
};

export const resolveUrl = (path: string, base: string, fallback = "http://localhost") =>
  new URL(path, toAbsoluteBaseUrl(base, fallback)).toString();

export const isAbsoluteUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};
