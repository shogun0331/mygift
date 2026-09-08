function resolvePublicFetchUrl(url: string): string {
  if (!url.startsWith('/')) return url
  if (typeof window === 'undefined') return url
  if (window.location.protocol.startsWith('http')) return url
  if (window.electronAPI || /Electron/i.test(navigator.userAgent || '')) {
    return `media://${url.replace(/^\/+/, '')}`
  }
  return `.${url}`
}

export async function fetchPublicJson<T>(url: string): Promise<T | null> {
  const res = await fetch(resolvePublicFetchUrl(url), { cache: 'no-store' })
  if (!res.ok) return null
  return (await res.json()) as T
}
