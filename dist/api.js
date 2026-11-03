// The shared service from beibei030/burrowkeep at 3fa8c2f.
// A static host has no /api routes. Use this origin on every gateway, including previews.
export const API = "https://aiqiang888.com/burrowkeep-api";

/**
 * Fetch the existing API without allowing HTML error pages or a hanging request
 * to interrupt the local game. Callers retain their existing retry cadence.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any | null>}
 */
export async function apiJson(path, options) {
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
