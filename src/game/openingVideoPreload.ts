/** 로고 스플래시 동안 오프닝 영상을 미리 디코드해 메뉴 진입 히치를 줄인다. */

type WarmEntry = {
  url: string
  video: HTMLVideoElement
}

let warm: WarmEntry | null = null
let inflight: { url: string; promise: Promise<HTMLVideoElement | null> } | null = null

function makeVideoEl(): HTMLVideoElement {
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.loop = true
  video.preload = 'auto'
  video.setAttribute('playsinline', '')
  video.setAttribute('muted', '')
  video.disablePictureInPicture = true
  // 화면 밖 — 디코더만 워밍업
  video.style.cssText =
    'position:fixed;left:-99999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;visibility:hidden'
  return video
}

function waitUntilPlayable(video: HTMLVideoElement, timeoutMs: number): Promise<boolean> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve(true)

  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      video.removeEventListener('canplaythrough', onReady)
      video.removeEventListener('canplay', onReady)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('error', onError)
      window.clearTimeout(timer)
      resolve(ok)
    }
    const onReady = () => finish(true)
    const onError = () => finish(false)
    video.addEventListener('canplaythrough', onReady, { once: true })
    video.addEventListener('canplay', onReady, { once: true })
    video.addEventListener('loadeddata', onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
    const timer = window.setTimeout(() => finish(video.readyState >= 2), timeoutMs)
  })
}

/**
 * 오프닝 URL을 백그라운드에서 로드·디코드한다.
 * 이미 같은 URL이 준비됐으면 즉시 resolve.
 */
export function preloadOpeningVideo(url: string, timeoutMs = 12000): Promise<HTMLVideoElement | null> {
  const trimmed = url.trim()
  if (!trimmed) return Promise.resolve(null)

  if (warm?.url === trimmed && warm.video.readyState >= 2) {
    return Promise.resolve(warm.video)
  }
  if (inflight?.url === trimmed) return inflight.promise

  const promise = (async () => {
    if (warm && warm.url !== trimmed) {
      warm.video.pause()
      warm.video.removeAttribute('src')
      warm.video.load()
      warm.video.remove()
      warm = null
    }

    const video = makeVideoEl()
    document.body.appendChild(video)
    video.src = trimmed

    const ok = await waitUntilPlayable(video, timeoutMs)
    if (!ok) {
      video.pause()
      video.removeAttribute('src')
      video.load()
      video.remove()
      if (inflight?.url === trimmed) inflight = null
      return null
    }

    try {
      video.currentTime = 0
    } catch {
      /* ignore seek errors before full metadata */
    }
    video.pause()

    warm = { url: trimmed, video }
    if (inflight?.url === trimmed) inflight = null
    return video
  })()

  inflight = { url: trimmed, promise }
  return promise
}

/** 메뉴 스테이지가 워밍업된 video 노드를 가져간다. 없으면 null. */
export function takePreloadedOpeningVideo(url: string): HTMLVideoElement | null {
  if (!warm || warm.url !== url.trim()) return null
  const entry = warm
  warm = null
  entry.video.style.cssText = ''
  entry.video.removeAttribute('style')
  return entry.video
}

export function peekPreloadedOpeningVideo(url: string): HTMLVideoElement | null {
  if (!warm || warm.url !== url.trim()) return null
  return warm.video
}
