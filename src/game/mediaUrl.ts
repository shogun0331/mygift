function encodeMediaRel(rel: string): string {
  return rel
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => {
      try {
        return encodeURIComponent(decodeURIComponent(part))
      } catch {
        return encodeURIComponent(part)
      }
    })
    .join('/')
}

function isHttpProtocol(): boolean {
  return typeof window !== 'undefined' && window.location.protocol.startsWith('http')
}

function isElectronRenderer(): boolean {
  return (
    typeof window !== 'undefined' &&
    (Boolean(window.electronAPI) || /Electron/i.test(navigator.userAgent || ''))
  )
}

/** public/ 상대경로를 현재 런타임(dev http / Electron file)에 맞게 변환 */
function resolvePublicRel(relRaw: string): string {
  const rel = encodeMediaRel(relRaw.replace(/^\/+/, ''))
  if (isHttpProtocol()) {
    // Vite 개발 서버는 public 루트를 `/` 로 제공
    return `/${rel}`
  }
  if (isElectronRenderer()) {
    // 패키징본: dist 절대경로(`/ui/...`)는 file:// 에서 깨지므로 media 프로토콜 사용
    return `media://${rel}`
  }
  return `./${rel}`
}

/** media:// 또는 상대경로를 재생 가능한 src로 만들고, 교체 즉시 반영되도록 캐시 키를 붙임 */
export function resolveMediaSrc(url: string | null | undefined, cacheKey?: string | number | null): string {
  if (!url) return ''

  // blob/data는 그대로
  if (url.startsWith('blob:') || url.startsWith('data:')) return url

  let resolved = url.split('?')[0] ?? url

  if (resolved.startsWith('media://')) {
    resolved = resolvePublicRel(resolved.slice('media://'.length))
  } else if (resolved.startsWith('/')) {
    // `/ui/...` 같은 public 절대경로 — Electron 패키징에서 깨지므로 런타임 변환
    resolved = resolvePublicRel(resolved)
  } else if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    // keep absolute http as-is (without query we stripped — restore path only)
  }

  if (cacheKey == null || cacheKey === '') return resolved
  const joiner = resolved.includes('?') ? '&' : '?'
  return `${resolved}${joiner}v=${encodeURIComponent(String(cacheKey))}`
}

/** public 하위 에셋 헬퍼. 예: uiAsset('ui/dashboard/x.webp', 'v1') */
export function uiAsset(relPath: string, cacheKey?: string | number | null): string {
  const clean = relPath.replace(/^\/+/, '').replace(/^media:\/\//, '')
  return resolveMediaSrc(`media://${clean}`, cacheKey)
}

/**
 * CSS `url('/ui/...')` 는 Electron file:// 에서 실패한다.
 * documentElement CSS 변수로 media-호환 URL을 주입한다.
 */
export function applyPackagedUiCssVars(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const setUrl = (cssVar: string, relPath: string, ver: string) => {
    root.style.setProperty(cssVar, `url("${uiAsset(relPath, ver)}")`)
  }

  setUrl('--dash-stage-bg', 'ui/dashboard/dash_stage_bg.webp', 'v1')
  setUrl('--dash-btn-start-live', 'ui/dashboard/dash_btn_start_live.webp', 'v1')
  setUrl('--dash-btn-start-live-pressed', 'ui/dashboard/dash_btn_start_live_pressed.webp', 'v1')
  setUrl('--dash-btn-promo-audit', 'ui/dashboard/dash_btn_promo_audit.webp', 'v1')
  setUrl('--dash-hud-quest-frame', 'ui/dashboard/dash_hud_quest_frame.webp', 'v1')

  setUrl('--ui-dialog-btn', 'ui/shell/ui_dialog_btn_primary.webp', 'v3')
  setUrl('--ui-dialog-btn-pressed', 'ui/shell/ui_dialog_btn_primary_pressed.webp', 'v3')
}

export function characterMediaUrl(
  characterId: string,
  kind: 'image' | 'video' | 'vn',
  fileName: string,
): string {
  const folder = kind === 'image' ? 'images' : kind === 'vn' ? 'vn' : 'videos'
  return resolveMediaSrc(`media://characters/${characterId}/${folder}/${fileName}`)
}

export function characterSoundUrl(characterId: string, fileName: string): string {
  return resolveMediaSrc(`media://characters/${characterId}/sounds/${fileName}`)
}

export function staffMediaUrl(staffId: string, fileName: string): string {
  return resolveMediaSrc(`media://staff/${staffId}/images/${fileName}`)
}

export function commonSoundMediaPath(fileName: string): string {
  return `media://chapter_assets/common_sounds/${fileName}`
}

export function commonSoundMediaUrl(fileName: string, cacheKey?: string | number | null): string {
  return resolveMediaSrc(commonSoundMediaPath(fileName), cacheKey)
}
