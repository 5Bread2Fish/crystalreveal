// Base path for the application, used to prefix fetch() calls
// Next.js auto-prefixes <Link>, <Image>, and router.push() — but NOT fetch()
export const BASE_PATH = '/crystalreveal';

/**
 * Prefix an API path with the basePath.
 * Usage: apiUrl("/api/checkout") → "/crystalreveal/api/checkout"
 */
export function apiUrl(path: string): string {
    return `${BASE_PATH}${path}`;
}
