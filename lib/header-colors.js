export const HEADER_COLOR_KEYS = ["headerBackgroundColor", "headerTextColor"];

export function headerColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim()
    : "";
}
