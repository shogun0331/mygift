import { useState, useEffect } from 'react'
import { saveEvents, loadEvents, saveCharacters, loadCharacters } from './events/db'
import type { GameEvent } from './events/types'
import {
  createRegisteredCharacter,
  findLevelIdleVideoUrl,
  normalizeOwnedCreator,
  type OwnedCreator,
  type RegisteredCharacter,
} from './game/characters'
import { resolveMediaSrc } from './game/mediaUrl'
import { createInitialStudioSlots, type StudioSlot } from './game/studioSlots'
import type { AddCharacterPayload } from './screens/EditorScreen'
import { EditorScreen } from './screens/EditorScreen'
import { InGame } from './screens/InGame'
import { MainMenu } from './screens/MainMenu'
import { I18nProvider } from './locales/i18n'

type Screen = 'main' | 'game' | 'editor'

/** 미디어 id 기반 고유 파일명 — 같은 원본 이름을 여러 번 올려도 덮어쓰지 않음 */
function buildSafeFileName(mediaId: string, originalName: string) {
  const trimmed = (originalName || 'asset').trim()
  const lastDot = trimmed.lastIndexOf('.')
  const ext =
    lastDot >= 0 ? trimmed.slice(lastDot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : ''
  const rawBase = lastDot >= 0 ? trimmed.slice(0, lastDot) : trimmed
  const base =
    rawBase
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'asset'
  return `${mediaId}__${base}${ext}`
}

function mediaUrl(characterId: string, kind: 'image' | 'video', fileName: string, cacheKey?: string | number) {
  const folder = kind === 'image' ? 'images' : 'videos'
  return resolveMediaSrc(`media://characters/${characterId}/${folder}/${fileName}`, cacheKey ?? fileName)
}

function syncOwnedWithRegistered(
  owned: OwnedCreator[],
  registered: RegisteredCharacter[],
): OwnedCreator[] {
  if (owned.length === 0) return owned
  let changed = false
  const next = owned.map((creator) => {
    const normalized = normalizeOwnedCreator(creator)
    if (
      normalized.skill !== creator.skill ||
      normalized.heat !== creator.heat ||
      normalized.trust !== creator.trust ||
      normalized.revenueMult !== creator.revenueMult
    ) {
      changed = true
    }
    const source = registered.find((item) => item.id === creator.id)
    if (!source) return normalized
    if (
      source.videos === creator.videos &&
      source.images === creator.images &&
      source.profileImageUrl === creator.profileImageUrl &&
      source.name === creator.name &&
      source.mediaRevision === creator.mediaRevision &&
      !changed
    ) {
      return normalized
    }
    changed = true
    return normalizeOwnedCreator({
      ...normalized,
      name: source.name,
      age: source.age,
      job: source.job,
      bust: source.bust,
      weight: source.weight,
      concept: source.concept,
      eventLinks: source.eventLinks,
      profileImageUrl: source.profileImageUrl,
      profileBlob: source.profileBlob ?? null,
      characterIconId: source.characterIconId,
      characterIllustrationId: source.characterIllustrationId,
      profileImageId: source.profileImageId,
      profileVideoId: source.profileVideoId,
      images: source.images,
      videos: source.videos,
      mediaRevision: source.mediaRevision,
    })
  })
  return changed ? next : owned
}

function syncStudioSlotsWithOwned(slots: StudioSlot[], owned: OwnedCreator[]): StudioSlot[] {
  let changed = false
  const next = slots.map((slot) => {
    if (!slot.assignment) return slot
    const creator = owned.find((item) => item.id === slot.assignment!.creatorId)
    if (!creator) return slot
    const idleVideoUrl = findLevelIdleVideoUrl(creator, 1)
    const profileImageUrl = creator.profileImageUrl || null
    const revision = creator.mediaRevision
    if (
      slot.assignment.idleVideoUrl === idleVideoUrl &&
      slot.assignment.profileImageUrl === profileImageUrl &&
      slot.assignment.mediaRevision === revision &&
      slot.assignment.creatorName === creator.name &&
      slot.assignment.grade === creator.grade &&
      slot.assignment.popularity === creator.popularity
    ) {
      return slot
    }
    changed = true
    return {
      ...slot,
      assignment: {
        ...slot.assignment,
        creatorName: creator.name,
        grade: creator.grade,
        popularity: creator.popularity,
        profileImageUrl,
        idleVideoUrl,
        mediaRevision: revision,
      },
    }
  })
  return changed ? next : slots
}

function collectFileNameRefs(
  images: Array<{ id: string; fileName?: string }>,
  videos: Array<{ id: string; fileName?: string }>,
) {
  const refs = new Map<string, number>()
  for (const item of [...images, ...videos]) {
    if (!item.fileName) continue
    refs.set(item.fileName, (refs.get(item.fileName) || 0) + 1)
  }
  return refs
}

async function saveCharacterMediaToProject(characterId: string, payload: AddCharacterPayload) {
  if (!window.electronAPI?.saveCharacterAssets) return payload

  const assetsToSave: Array<{
    id: string
    fileName: string
    kind: 'image' | 'video'
    buffer: ArrayBuffer
  }> = []
  const obsoleteNames: Array<{ kind: 'image' | 'video'; fileName: string }> = []

  const images = await Promise.all(
    payload.images.map(async (img) => {
      if (!img.file) {
        if (img.fileName) {
          return {
            ...img,
            file: undefined,
            url: mediaUrl(characterId, 'image', img.fileName, img.fileSize),
          }
        }
        return { ...img, file: undefined }
      }

      try {
        const buffer = await img.file.arrayBuffer()
        const safeName = buildSafeFileName(img.id, img.file.name)
        if (img.fileName && img.fileName !== safeName) {
          obsoleteNames.push({ kind: 'image', fileName: img.fileName })
        }
        assetsToSave.push({
          id: img.id,
          fileName: safeName,
          kind: 'image',
          buffer,
        })
        return {
          id: img.id,
          keys: img.keys,
          fileName: safeName,
          fileSize: img.file.size,
          url: mediaUrl(characterId, 'image', safeName, img.file.size),
          file: undefined,
        }
      } catch (err) {
        console.error('Failed to read image arrayBuffer:', err)
        throw err
      }
    }),
  )

  const videos = await Promise.all(
    payload.videos.map(async (vid) => {
      if (!vid.file) {
        if (vid.fileName) {
          return {
            ...vid,
            file: undefined,
            url: mediaUrl(characterId, 'video', vid.fileName, vid.fileSize),
          }
        }
        return { ...vid, file: undefined }
      }

      try {
        const buffer = await vid.file.arrayBuffer()
        const safeName = buildSafeFileName(vid.id, vid.file.name)
        if (vid.fileName && vid.fileName !== safeName) {
          obsoleteNames.push({ kind: 'video', fileName: vid.fileName })
        }
        assetsToSave.push({
          id: vid.id,
          fileName: safeName,
          kind: 'video',
          buffer,
        })
        return {
          id: vid.id,
          keys: vid.keys,
          level: vid.level,
          stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
          fileName: safeName,
          fileSize: vid.file.size,
          url: mediaUrl(characterId, 'video', safeName, vid.file.size),
          file: undefined,
        }
      } catch (err) {
        console.error('Failed to read video arrayBuffer:', err)
        throw err
      }
    }),
  )

  if (assetsToSave.length > 0) {
    const res = await window.electronAPI.saveCharacterAssets(characterId, assetsToSave)
    if (!res.success) {
      throw new Error(res.error || '캐릭터 미디어를 폴더에 저장하지 못했습니다.')
    }
  }

  const keptRefs = collectFileNameRefs(images, videos)
  if (window.electronAPI.deleteCharacterFile) {
    for (const obsolete of obsoleteNames) {
      if ((keptRefs.get(obsolete.fileName) || 0) > 0) continue
      await window.electronAPI.deleteCharacterFile(characterId, obsolete.kind, obsolete.fileName)
    }
  }

  return {
    ...payload,
    images,
    videos,
  }
}

/** 과거에 같은 원본 파일명으로 덮어쓴 미디어를 id별 고유 파일로 복제 */
async function dedupeSharedMediaFiles(character: RegisteredCharacter): Promise<RegisteredCharacter> {
  if (!window.electronAPI?.cloneCharacterFile) return character

  const images = [...(character.images ?? [])]
  const videos = [...(character.videos ?? [])]
  let changed = false

  const migrate = async (
    kind: 'image' | 'video',
    item: { id: string; fileName?: string; url?: string },
  ) => {
    if (!item.fileName) return item
    const uniqueName = buildSafeFileName(item.id, item.fileName.replace(/^.*?__/, '') || item.fileName)
    if (item.fileName === uniqueName) return item

    const res = await window.electronAPI!.cloneCharacterFile!(
      character.id,
      kind,
      item.fileName,
      uniqueName,
    )
    if (!res.success) {
      console.error('Failed to clone shared media:', res.error, item)
      return item
    }
    changed = true
    return {
      ...item,
      fileName: uniqueName,
      url: mediaUrl(character.id, kind, uniqueName),
    }
  }

  // 파일명이 중복된 항목만 분리 복제 (첫 참조는 원본 유지 후 고유명으로 복사해도 무방)
  const imageNameCount = collectFileNameRefs(images, [])
  const videoNameCount = collectFileNameRefs([], videos)

  for (let i = 0; i < images.length; i++) {
    const name = images[i].fileName
    if (name && (imageNameCount.get(name) || 0) > 1) {
      images[i] = await migrate('image', images[i])
    } else if (name && !name.includes(images[i].id)) {
      // id 접두사가 없는 기존 파일도 고유명으로 정규화
      images[i] = await migrate('image', images[i])
    }
  }

  for (let i = 0; i < videos.length; i++) {
    const name = videos[i].fileName
    if (name && (videoNameCount.get(name) || 0) > 1) {
      videos[i] = await migrate('video', videos[i])
    } else if (name && !name.includes(videos[i].id)) {
      videos[i] = await migrate('video', videos[i])
    }
  }

  if (!changed) return character

  // 더 이상 참조되지 않는 옛 공유 파일 정리
  const kept = collectFileNameRefs(images, videos)
  const oldNames = [
    ...(character.images ?? []).map((img) => ({ kind: 'image' as const, fileName: img.fileName })),
    ...(character.videos ?? []).map((vid) => ({ kind: 'video' as const, fileName: vid.fileName })),
  ]
  if (window.electronAPI.deleteCharacterFile) {
    const seen = new Set<string>()
    for (const old of oldNames) {
      if (!old.fileName || seen.has(old.fileName)) continue
      seen.add(old.fileName)
      if ((kept.get(old.fileName) || 0) > 0) continue
      await window.electronAPI.deleteCharacterFile(character.id, old.kind, old.fileName)
    }
  }

  const profile =
    character.profileImageId != null
      ? images.find((image) => image.id === character.profileImageId)
      : null

  return {
    ...character,
    images,
    videos,
    profileImageUrl: profile?.url || character.profileImageUrl,
  }
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>('main')
  /** 에디터에 등록된 캐릭터 (스카우트 풀) */
  const [registeredCharacters, setRegisteredCharacters] = useState<RegisteredCharacter[]>([])
  /** 인게임 보유 크리에이터 — 새 게임 시작 시 비움 */
  const [ownedCreators, setOwnedCreators] = useState<OwnedCreator[]>([])
  /** 스튜디오 배치 — 메인/에디터를 오가도 유지 */
  const [studioSlots, setStudioSlots] = useState<StudioSlot[]>(() => createInitialStudioSlots())
  /** 에디터 등록 이벤트 상태 (App 단으로 Lift up) */
  const [events, setEvents] = useState<GameEvent[]>([])
  /** 데이터 로드 완료 상태 플래그 */
  const [isLoaded, setIsLoaded] = useState(false)
  const [editorReturnScreen, setEditorReturnScreen] = useState<Screen>('main')
  const hasActiveSession = ownedCreators.length > 0

  function openEditor(returnTo: 'main' | 'game' = 'main') {
    setEditorReturnScreen(returnTo)
    setScreen('editor')
  }

  // 1. 최초 마운트 시 데이터 로드
  useEffect(() => {
    loadEvents()
      .then((loaded) => setEvents(loaded))
      .catch((err) => console.error('Failed to load events:', err))

    if (window.electronAPI?.loadCharactersJson) {
      window.electronAPI.loadCharactersJson()
        .then(async (res) => {
          if (res.success && res.characters) {
            const list = res.characters.map((c) => {
              if (c.images) {
                c.images = c.images.map((img: any) => ({
                  ...img,
                  url: img.url || (img.fileName ? mediaUrl(c.id, 'image', img.fileName, img.fileSize) : (img.file ? URL.createObjectURL(img.file) : '')),
                }))
              }
              if (c.videos) {
                c.videos = c.videos.map((vid: any) => ({
                  ...vid,
                  stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
                  level: Math.max(1, Math.floor(Number(vid.level) || 1)),
                  url: vid.url || (vid.fileName ? mediaUrl(c.id, 'video', vid.fileName, vid.fileSize) : (vid.file ? URL.createObjectURL(vid.file) : '')),
                }))
              }
              const profileImg = c.images?.find((img: any) => img.id === c.profileImageId)
              if (profileImg) {
                c.profileImageUrl = profileImg.url
              }
              return c as RegisteredCharacter
            })

            const migrated = []
            for (const character of list) {
              migrated.push(await dedupeSharedMediaFiles(character))
            }
            setRegisteredCharacters(migrated)
          } else {
            console.error('Failed to load characters JSON:', res.error)
          }
          setIsLoaded(true)
        })
        .catch((err) => {
          console.error('Failed to load characters JSON:', err)
          setIsLoaded(true)
        })
    } else {
      loadCharacters()
        .then((records) => {
          const chars = records.map((r) => {
            const c = r.character
            c.profileBlob = r.profileBlob || undefined
            if (r.profileBlob) {
              c.profileImageUrl = URL.createObjectURL(r.profileBlob)
            }
            if (c.images) {
              c.images = c.images.map((img) => ({
                ...img,
                url: img.url || (img.file ? URL.createObjectURL(img.file) : ''),
              }))
            }
            if (c.videos) {
              c.videos = c.videos.map((vid) => ({
                ...vid,
                stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
                level: Math.max(1, Math.floor(Number(vid.level) || 1)),
                url: vid.url || (vid.file ? URL.createObjectURL(vid.file) : ''),
              }))
            }
            return c
          })
          setRegisteredCharacters(chars)
          setIsLoaded(true)
        })
        .catch((err) => {
          console.error('Failed to load characters:', err)
          setIsLoaded(true)
        })
    }
  }, [])

  // 2. 이벤트 상태 변경 시 자동 저장
  useEffect(() => {
    saveEvents(events).catch((err) => console.error('Failed to save events:', err))
  }, [events])

  // 3. 캐릭터 상태 변경 시 자동 저장
  useEffect(() => {
    if (!isLoaded) return

    if (window.electronAPI?.saveCharactersJson) {
      const cleanCharacters = registeredCharacters.map((c) => {
        const cleanImages = c.images?.map((img) => ({
          id: img.id,
          fileName: img.fileName,
          fileSize: img.fileSize,
          // JSON 저장 시 media:// 커스텀 파일 프로토콜 형태로 치환하여 저장
          url: img.fileName ? `media://characters/${c.id}/images/${img.fileName}` : img.url,
          keys: img.keys,
        })) ?? []
        const cleanVideos = c.videos?.map((vid) => ({
          id: vid.id,
          fileName: vid.fileName,
          fileSize: vid.fileSize,
          url: vid.fileName ? `media://characters/${c.id}/videos/${vid.fileName}` : vid.url,
          keys: vid.keys,
          level: vid.level,
          stage: Math.max(1, Math.floor(Number(vid.stage ?? 1) || 1)),
        })) ?? []

        const profileImageObj = cleanImages.find((img) => img.id === c.profileImageId)
        const profileImageUrl = profileImageObj ? profileImageObj.url : c.profileImageUrl

        return {
          id: c.id,
          name: c.name,
          age: c.age,
          job: c.job,
          bust: c.bust,
          weight: c.weight,
          grade: c.grade,
          popularity: c.popularity,
          concept: c.concept,
          salary: c.salary,
          eventLinks: c.eventLinks,
          avatarTone: c.avatarTone,
          profileImageUrl: profileImageUrl,
          characterIconId: c.characterIconId || null,
          characterIllustrationId: c.characterIllustrationId || null,
          profileImageId: c.profileImageId || null,
          profileVideoId: c.profileVideoId || null,
          mediaRevision: c.mediaRevision,
          images: cleanImages,
          videos: cleanVideos,
        }
      })
      window.electronAPI.saveCharactersJson(cleanCharacters)
        .catch((err) => console.error('Failed to save characters JSON:', err))
    } else {
      const records = registeredCharacters.map((c) => ({
        id: c.id,
        character: c,
        profileBlob: c.profileBlob || null,
      }))
      saveCharacters(records).catch((err) => console.error('Failed to save characters:', err))
    }
  }, [registeredCharacters, isLoaded])

  // 에디터에서 캐릭터를 수정하면 보유 크리에이터·스튜디오 배치에 즉시 반영
  useEffect(() => {
    if (!isLoaded) return
    setOwnedCreators((prev) => syncOwnedWithRegistered(prev, registeredCharacters))
  }, [registeredCharacters, isLoaded])

  useEffect(() => {
    setStudioSlots((prev) => syncStudioSlotsWithOwned(prev, ownedCreators))
  }, [ownedCreators])

  async function handleRegisterCharacter(payload: AddCharacterPayload) {
    try {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const savedPayload = await saveCharacterMediaToProject(tempId, payload)

      const profile =
        savedPayload.profileImageId != null
          ? savedPayload.images.find((image) => image.id === savedPayload.profileImageId)
          : null
      const profileImageUrl = profile?.url || null

      setRegisteredCharacters((prev) => [
        ...prev,
        createRegisteredCharacter({
          id: tempId,
          name: savedPayload.name,
          age: savedPayload.age,
          job: savedPayload.job,
          bust: savedPayload.bust,
          weight: savedPayload.weight,
          eventLinks: savedPayload.eventLinks,
          profileImageUrl,
          profileBlob: null,
          characterIconId: savedPayload.characterIconId,
          characterIllustrationId: savedPayload.characterIllustrationId,
          profileImageId: savedPayload.profileImageId,
          profileVideoId: savedPayload.profileVideoId,
          images: savedPayload.images,
          videos: savedPayload.videos,
          mediaRevision: Date.now(),
        }),
      ])
    } catch (err) {
      console.error('handleRegisterCharacter error:', err)
      alert(
        err instanceof Error
          ? err.message
          : '캐릭터를 추가하는 도중 오류가 발생했습니다.',
      )
    }
  }

  async function handleUpdateCharacter(id: string, payload: AddCharacterPayload) {
    try {
      const oldChar = registeredCharacters.find((c) => c.id === id)
      const savedPayload = await saveCharacterMediaToProject(id, payload)

      // 제거된 미디어만 삭제. 다른 항목이 같은 파일명을 쓰면 유지
      if (oldChar && window.electronAPI?.deleteCharacterFile) {
        const keptRefs = collectFileNameRefs(savedPayload.images, savedPayload.videos)
        if (oldChar.images) {
          for (const oldImg of oldChar.images) {
            const stillExists = savedPayload.images.some((img) => img.id === oldImg.id)
            if (stillExists || !oldImg.fileName) continue
            if ((keptRefs.get(oldImg.fileName) || 0) > 0) continue
            await window.electronAPI.deleteCharacterFile(id, 'image', oldImg.fileName)
          }
        }
        if (oldChar.videos) {
          for (const oldVid of oldChar.videos) {
            const stillExists = savedPayload.videos.some((vid) => vid.id === oldVid.id)
            if (stillExists || !oldVid.fileName) continue
            if ((keptRefs.get(oldVid.fileName) || 0) > 0) continue
            await window.electronAPI.deleteCharacterFile(id, 'video', oldVid.fileName)
          }
        }
      }

      const profile =
        savedPayload.profileImageId != null
          ? savedPayload.images.find((image) => image.id === savedPayload.profileImageId)
          : null
      const profileImageUrl = profile?.url || null

      const nextCharacter = {
        name: savedPayload.name,
        age: savedPayload.age,
        job: savedPayload.job,
        bust: savedPayload.bust,
        weight: savedPayload.weight,
        concept: savedPayload.job.trim() || '뉴비',
        eventLinks: savedPayload.eventLinks,
        profileImageUrl,
        profileBlob: null as Blob | null,
        characterIconId: savedPayload.characterIconId,
        characterIllustrationId: savedPayload.characterIllustrationId,
        profileImageId: savedPayload.profileImageId,
        profileVideoId: savedPayload.profileVideoId,
        images: savedPayload.images,
        videos: savedPayload.videos,
        mediaRevision: Date.now(),
      }

      setRegisteredCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c

          if (c.profileImageUrl && c.profileImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(c.profileImageUrl)
          }
          if (c.images) {
            for (const img of c.images) {
              if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
            }
          }
          if (c.videos) {
            for (const vid of c.videos) {
              if (vid.url?.startsWith('blob:')) URL.revokeObjectURL(vid.url)
            }
          }

          return { ...c, ...nextCharacter }
        }),
      )

      // 이미 스카우트된 크리에이터에도 새 영상/이미지 반영 (대시보드 idle 재생용)
      setOwnedCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...nextCharacter } : c)),
      )
    } catch (err) {
      console.error('handleUpdateCharacter error:', err)
      alert(
        err instanceof Error
          ? err.message
          : '캐릭터를 수정하는 도중 오류가 발생했습니다.',
      )
    }
  }

  function handleDeleteCharacter(id: string) {
    if (window.electronAPI?.deleteCharacterFolder) {
      window.electronAPI.deleteCharacterFolder(id)
        .catch((err) => console.error('Failed to delete character folder from disk:', err))
    }

    setRegisteredCharacters((prev) => {
      const target = prev.find((c) => c.id === id)
      if (target) {
        if (target.profileImageUrl && target.profileImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.profileImageUrl)
        }
        if (target.images) {
          for (const img of target.images) {
            if (img.url?.startsWith('blob:')) URL.revokeObjectURL(img.url)
          }
        }
        if (target.videos) {
          for (const vid of target.videos) {
            if (vid.url?.startsWith('blob:')) URL.revokeObjectURL(vid.url)
          }
        }
      }
      return prev.filter((c) => c.id !== id)
    })
    setOwnedCreators((prev) => prev.filter((c) => c.id !== id))
  }

  function handleScout(creator: OwnedCreator) {
    setOwnedCreators((prev) => {
      if (prev.some((c) => c.id === creator.id)) return prev
      return [...prev, normalizeOwnedCreator(creator)]
    })
  }

  function startNewGame() {
    setOwnedCreators([])
    setStudioSlots(createInitialStudioSlots())
    setScreen('game')
  }

  function continueGame() {
    setScreen('game')
  }

  if (screen === 'editor') {
    return (
      <EditorScreen
        registeredCharacters={registeredCharacters}
        onRegisterCharacter={handleRegisterCharacter}
        onUpdateCharacter={handleUpdateCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        events={events}
        onEventsChange={setEvents}
        onBack={() => setScreen(editorReturnScreen === 'game' ? 'game' : 'main')}
      />
    )
  }

  if (screen === 'game') {
    return (
      <InGame
        registeredCharacters={registeredCharacters}
        ownedCreators={ownedCreators}
        studioSlots={studioSlots}
        onStudioSlotsChange={setStudioSlots}
        onOwnedCreatorsChange={setOwnedCreators}
        onScout={handleScout}
        onBack={() => setScreen('main')}
        onOpenEditor={() => openEditor('game')}
      />
    )
  }

  return (
    <MainMenu
      onNewGame={startNewGame}
      onContinueGame={hasActiveSession ? continueGame : undefined}
      onOpenEditor={() => openEditor('main')}
    />
  )
}
