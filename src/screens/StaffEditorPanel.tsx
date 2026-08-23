import { useMemo, useState, type DragEvent, type FormEvent } from 'react'
import {
  STAFF_GENDERS,
  STAFF_GENDER_LABEL_KEY,
  STAFF_KINDS,
  STAFF_KIND_LABEL_KEY,
  staffCardUrl,
  staffDisplayName,
  staffIconUrl,
  type AddStaffPayload,
  type RegisteredStaff,
  type StaffGender,
  type StaffImage,
  type StaffKind,
} from '../game/staff'
import { pickStaffNamePack } from '../game/staffRoster'
import { resolveMediaSrc } from '../game/mediaUrl'
import { primaryCharacterLocaleText } from '../game/characterLocales'
import { useTranslation } from '../locales/i18n'

type StaffView = 'list' | 'add' | 'edit'

type StaffEditorPanelProps = {
  registeredStaff: RegisteredStaff[]
  onRegisterStaff: (payload: AddStaffPayload) => void | Promise<void>
  onUpdateStaff: (id: string, payload: AddStaffPayload) => void | Promise<void>
  onDeleteStaff: (id: string) => void
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isImageFile(file: File | undefined | null): file is File {
  return Boolean(file && file.type.startsWith('image/'))
}

function imageFromFile(file: File): StaffImage {
  return {
    id: createId(),
    file,
    fileSize: file.size,
    url: URL.createObjectURL(file),
  }
}

function usedNameKeys(staff: RegisteredStaff[], exceptId?: string) {
  return new Set(
    staff
      .filter((row) => row.id !== exceptId && row.nameKey)
      .map((row) => row.nameKey as string),
  )
}

export function StaffEditorPanel({
  registeredStaff,
  onRegisterStaff,
  onUpdateStaff,
  onDeleteStaff,
}: StaffEditorPanelProps) {
  const { t, locale } = useTranslation()
  const [view, setView] = useState<StaffView>('list')
  const [editing, setEditing] = useState<RegisteredStaff | null>(null)

  function openList() {
    setEditing(null)
    setView('list')
  }

  const grouped = useMemo(
    () =>
      STAFF_KINDS.map((kind) => ({
        kind,
        rows: registeredStaff.filter((row) => row.kind === kind),
      })),
    [registeredStaff],
  )

  return view === 'list' ? (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">스태프 관리</h2>
          <p className="mt-2 text-sm text-slate-400">
            역할당 6명, 총 {registeredStaff.length}명. 1:1 아이콘과 3:4 카드만 넣으면 됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView('add')}
          className="game-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
        >
          <span aria-hidden>＋</span>
          스태프 추가
        </button>
      </div>

      {registeredStaff.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">아직 등록된 스태프가 없습니다.</p>
      ) : (
        <div className="mt-6 space-y-7">
          {grouped.map(({ kind, rows }) => (
            <section key={kind}>
              <p className="mb-3 text-xs font-bold tracking-wide text-indigo-300">
                {t(STAFF_KIND_LABEL_KEY[kind])}
                <span className="ml-2 font-medium text-slate-500">{rows.length}/6</span>
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {rows.map((staff) => {
                  const cardUrl = staffCardUrl(staff)
                  const iconUrl = staffIconUrl(staff)
                  const displayName = staffDisplayName(staff, locale)
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        setEditing(staff)
                        setView('edit')
                      }}
                      className="game-card group overflow-hidden rounded-2xl text-left"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                        {cardUrl ? (
                          <img
                            src={resolveMediaSrc(cardUrl, staff.mediaRevision)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl font-black text-slate-600">
                            {displayName.slice(0, 1)}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/15 bg-black/40">
                              {iconUrl ? (
                                <img
                                  src={resolveMediaSrc(iconUrl, staff.mediaRevision)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-300">
                                  {t(STAFF_KIND_LABEL_KEY[staff.kind]).slice(0, 1)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-100">{displayName}</p>
                              <p className="truncate text-[10px] font-bold text-indigo-300">
                                {t(STAFF_GENDER_LABEL_KEY[staff.gender])} · {t(STAFF_KIND_LABEL_KEY[staff.kind])}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  ) : (
    <StaffForm
      key={editing?.id ?? 'new'}
      initial={editing}
      others={registeredStaff}
      onCancel={openList}
      onDelete={
        editing
          ? () => {
              onDeleteStaff(editing.id)
              openList()
            }
          : undefined
      }
      onSubmit={async (payload) => {
        if (editing) await onUpdateStaff(editing.id, payload)
        else await onRegisterStaff(payload)
        openList()
      }}
    />
  )
}

type StaffFormProps = {
  initial: RegisteredStaff | null
  others: RegisteredStaff[]
  onCancel: () => void
  onDelete?: () => void
  onSubmit: (payload: AddStaffPayload) => void | Promise<void>
}

function StaffForm({ initial, others, onCancel, onDelete, onSubmit }: StaffFormProps) {
  const { t, locale } = useTranslation()
  const starting = useMemo(() => {
    if (initial) return initial
    const pack = pickStaffNamePack('female', usedNameKeys(others))
    return {
      name: primaryCharacterLocaleText(pack.names),
      names: pack.names,
      nameKey: pack.key,
      gender: pack.gender,
      kind: 'care' as StaffKind,
    }
  }, [initial, others])

  const [gender, setGender] = useState<StaffGender>(starting.gender)
  const [kind, setKind] = useState<StaffKind>(starting.kind)
  const [nameKey, setNameKey] = useState<string | null>(starting.nameKey)
  const [names, setNames] = useState(starting.names)
  const [images, setImages] = useState<StaffImage[]>(initial?.images ?? [])
  const [iconImageId, setIconImageId] = useState<string | null>(initial?.iconImageId ?? null)
  const [cardImageId, setCardImageId] = useState<string | null>(initial?.cardImageId ?? null)
  const [busy, setBusy] = useState(false)

  function applyGender(nextGender: StaffGender) {
    setGender(nextGender)
    const pack = pickStaffNamePack(
      nextGender,
      usedNameKeys(others, initial?.id),
      nextGender === starting.gender ? starting.nameKey : null,
    )
    setNameKey(pack.key)
    setNames(pack.names)
  }

  function replaceImage(slot: 'icon' | 'card', file: File) {
    if (!isImageFile(file)) return
    const next = imageFromFile(file)
    const prevId = slot === 'icon' ? iconImageId : cardImageId
    setImages((prev) => {
      const without = prevId ? prev.filter((image) => image.id !== prevId) : prev
      return [...without, next]
    })
    if (slot === 'icon') setIconImageId(next.id)
    else setCardImageId(next.id)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await onSubmit({
        name: primaryCharacterLocaleText(names),
        names,
        nameKey,
        gender,
        kind,
        iconImageId,
        cardImageId,
        images,
      })
    } finally {
      setBusy(false)
    }
  }

  const icon = images.find((image) => image.id === iconImageId)
  const card = images.find((image) => image.id === cardImageId)
  const displayName = staffDisplayName({ name: primaryCharacterLocaleText(names), names }, locale)

  return (
    <form onSubmit={handleSubmit} className="game-panel mx-auto max-w-3xl rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {initial ? '스태프 수정' : '스태프 추가'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">성별·역할을 고르고, 아이콘과 카드 이미지만 넣으면 됩니다.</p>
        </div>
        <button type="button" onClick={onCancel} className="game-btn rounded-xl px-3 py-2 text-sm">
          목록으로
        </button>
      </div>

      <div className="mt-6">
        <span className="game-stat-label">성별</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {STAFF_GENDERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => applyGender(item)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                gender === item
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 bg-black/20 text-slate-300'
              }`}
            >
              {t(STAFF_GENDER_LABEL_KEY[item])}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <span className="game-stat-label">이름</span>
        <p className="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100">
          {displayName}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">남/여를 바꾸면 그 성별의 일본 이름이 자동으로 들어갑니다.</p>
      </div>

      <div className="mt-5">
        <span className="game-stat-label">역할</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAFF_KINDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                kind === item
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 bg-black/20 text-slate-300'
              }`}
            >
              {t(STAFF_KIND_LABEL_KEY[item])}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageDropBox
          label="아이콘 (1:1)"
          aspectClass="aspect-square"
          image={icon}
          onFile={(file) => replaceImage('icon', file)}
        />
        <ImageDropBox
          label="카드 (3:4)"
          aspectClass="aspect-[3/4]"
          image={card}
          onFile={(file) => replaceImage('card', file)}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={busy}
          className="game-btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-40"
        >
          {busy ? '저장 중…' : initial ? '수정 저장' : '등록'}
        </button>
      </div>
    </form>
  )
}

function ImageDropBox({
  label,
  aspectClass,
  image,
  onFile,
}: {
  label: string
  aspectClass: string
  image?: StaffImage
  onFile: (file: File) => void
}) {
  const [over, setOver] = useState(false)

  function takeFile(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={takeFile}
      className="block cursor-pointer"
    >
      <span className="game-stat-label">{label}</span>
      <div
        className={`mt-2 overflow-hidden rounded-2xl border bg-black/25 ${aspectClass} ${
          over ? 'border-indigo-400/70' : 'border-white/12'
        }`}
      >
        {image?.url ? (
          <img src={image.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="text-xl text-indigo-300">＋</span>
            <p className="text-[11px] leading-snug text-slate-400">이미지를 드롭하거나 클릭해서 선택</p>
          </div>
        )}
      </div>
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}
