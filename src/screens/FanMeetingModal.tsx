import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BlurRegionOverlay } from '../events/BlurRegionEditor'
import { CREATOR_TYPE_LABEL, getCreatorTypeDisplayName, typeForCreator } from '../game/auditEngine'
import { auditMediaSlotUrl, pickFanStrikeSlot } from '../game/characters'
import {
  advanceFanLine,
  advanceFixedLine,
  createExamMeeting,
  createFanMeeting,
  submitFanCard,
  rollDemand,
  type FanCardState,
  type FanMeeting,
  type FanPortrait,
  type FanSubmitResult,
} from '../game/fanMeeting'
import { previewCardPlay } from '../game/fanMeetingCombat'
import { characterDisplayName } from '../game/characterLocales'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import type { StationGrade, VipVisitConfig } from '../game/stationGradeConfig'
import { defaultAuditConfig, defaultVipConfig, type StationGradeConfig } from '../game/stationGradeConfig'
import { playAuditJudgePleased, playFanCriticalSting, playFanOpeningSting, playFanTasteSting, playSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { DECK_UI_ASSETS } from '../ui/deckAssets'
import {
  BoltGlyph,
  GradePlate,
  STAT_TYPE_CHIP_TONE,
  STAT_TYPE_LABEL_KEY,
  TypeStatIcon,
} from '../ui/creatorMarks'
import type { Grade } from '../game/characters'

type FanMeetingModalProps = {
  config: VipVisitConfig
  grade: StationGrade
  cards: FanCardState[]
  prepared?: FanMeeting | null
  fixedLine?: boolean
  title?: string
  showSpeech?: boolean
  onFinish: (result: { earned: number; satisfiedCount: number; lastRewardText: string; staminaById: Record<string, number> }) => void
  onAbort?: () => void
  onPayout?: (amount: number) => void
  practice?: boolean
  headerExtra?: ReactNode
}

type FanHit = 'critical' | 'type' | 'basic'

type StrikeFlash = {
  id: number
  url: string
  blurRegions: FanPortrait['blurRegions']
  kind: FanHit
}

const BASIC_FLASH_MS = 280
const BASIC_HIT_MS = 120
const SPECIAL_FLASH_MS = 500
const SPECIAL_HIT_MS = 280
const FAN_SWAP_MS = 420
const SHOT_MS = 1050
const FAN_LINE_COUNT = 20

function isVideo(url: string): boolean {
  return url.startsWith('data:video') || /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/i.test(url.split('?')[0] ?? '')
}

function pickAutoCard(current: FanMeeting): FanCardState | null {
  const living = current.cards.filter((card) => card.hp > 0)
  const matched = living.filter((card) => typeForCreator(card.id, card.statType) === current.center.demand)
  const pool = (matched.length > 0 ? matched : living)
    .slice()
    .sort((a, b) => b.statPerformance - a.statPerformance)
  return pool[0] ?? null
}

function FanFigure({
  portrait,
  active,
  leaving,
  hit,
  motion,
  lit,
  uniform = false,
}: {
  portrait: FanPortrait
  active: boolean
  leaving: boolean
  hit?: FanHit | null
  motion?: 'center' | 'wait' | 'join' | 'depart' | null
  lit?: boolean
  uniform?: boolean
}) {
  const shown = lit ?? active
  const hitClass = hit === 'critical' ? 'fan-hit-critical' : hit === 'type' ? 'fan-hit-type' : hit === 'basic' ? 'fan-hit-basic' : ''
  const motionClass =
    motion === 'center'
      ? 'fan-step-center'
      : motion === 'wait'
        ? 'fan-step-wait'
        : motion === 'join'
          ? 'fan-join'
          : motion === 'depart'
            ? 'fan-depart'
            : ''
  const mediaClass = uniform
    ? 'block max-h-full max-w-full object-contain object-bottom'
    : active
      ? 'block h-auto max-h-[min(68vh,46rem)] w-auto max-w-[min(44vh,30rem)] object-contain'
      : 'block h-auto max-h-[min(50vh,34rem)] w-auto max-w-[min(32vh,20rem)] object-contain'
  return (
    <div
      className={`relative shrink-0 ${uniform ? 'flex h-[min(72vh,50rem)] w-full items-end justify-center' : 'w-fit'} ${hit || motion ? '' : 'transition-all duration-500'} ${
        shown ? '' : 'brightness-[0.32]'
      } ${leaving ? '-translate-x-24 scale-95 opacity-0' : ''} ${hitClass} ${motionClass}`}
    >
      <div className={`${uniform ? 'flex h-full w-full items-end justify-center' : ''} ${active && !leaving && !hit && !motion ? 'vn-standing-live' : ''}`}>
        {portrait.url ? (
          isVideo(portrait.url) ? (
            <video src={resolveMediaSrc(portrait.url)} className={mediaClass} autoPlay loop muted playsInline />
          ) : (
            <img src={resolveMediaSrc(portrait.url)} alt="" className={mediaClass} />
          )
        ) : null}
        {portrait.blurRegions.length > 0 && portrait.url ? (
          <BlurRegionOverlay regions={portrait.blurRegions} src={resolveMediaSrc(portrait.url)} kind={isVideo(portrait.url) ? 'video' : 'image'} />
        ) : null}
      </div>
    </div>
  )
}

type PracticeStep = 'type' | 'match' | 'iron' | 'mismatch' | 'pressure' | 'reward'

function livingPracticeCards(meeting: FanMeeting) {
  return meeting.cards.filter((card) => card.hp > 0)
}

function practiceHas(meeting: FanMeeting, matched: boolean) {
  const demand = meeting.center.demand
  return livingPracticeCards(meeting).some(
    (card) => (typeForCreator(card.id, card.statType) === demand) === matched,
  )
}

function practiceFocusId(meeting: FanMeeting, step: PracticeStep): string | null {
  if (step !== 'match' && step !== 'mismatch') return null
  const wantMatch = step === 'match'
  const card = meeting.cards.find(
    (item) => item.hp > 0 && (typeForCreator(item.id, item.statType) === meeting.center.demand) === wantMatch,
  )
  return card?.id ?? null
}

function explainAdvance(meeting: FanMeeting, step: PracticeStep): PracticeStep {
  if (step === 'type') return practiceHas(meeting, true) ? 'match' : 'iron'
  if (step === 'iron') return practiceHas(meeting, false) ? 'mismatch' : 'pressure'
  return 'reward'
}

function PracticeCoach({
  kind,
  step,
  onNext,
  onDone,
}: {
  kind: 'fan' | 'exam'
  step: PracticeStep
  onNext: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [buttonRect, setButtonRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const clickStep = step === 'match' || step === 'mismatch'
  const selector =
    clickStep
      ? '[data-practice-target="1"]'
      : step === 'type'
        ? '[data-coach="type"]'
        : step === 'iron'
          ? '[data-coach="iron"]'
          : step === 'pressure'
            ? '[data-coach="pressure"]'
            : kind === 'fan'
              ? '[data-coach="earned"]'
              : '[data-coach="reward"]'
  const bodyKey =
    step === 'type'
      ? 'tutorial.coachLookType'
      : step === 'match'
        ? kind === 'fan'
          ? 'tutorial.coachFan1'
          : 'tutorial.coachExam1'
        : step === 'iron'
          ? 'tutorial.coachLookIron'
          : step === 'mismatch'
            ? kind === 'fan'
              ? 'tutorial.coachFan2'
              : 'tutorial.coachExam2'
            : step === 'pressure'
              ? 'tutorial.coachLookPressure'
              : kind === 'fan'
                ? 'tutorial.coachFan3'
                : 'tutorial.coachExam3'

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(selector)
      if (!el) setTargetRect(null)
      else {
        const box = el.getBoundingClientRect()
        setTargetRect({ top: box.top, left: box.left, width: box.width, height: box.height })
      }
      const button = document.querySelector('[data-coach-action="next"]')
      if (!button) setButtonRect(null)
      else {
        const box = button.getBoundingClientRect()
        setButtonRect({ top: box.top, left: box.left, width: box.width, height: box.height })
      }
    }
    measure()
    const timer = window.setInterval(measure, 150)
    window.addEventListener('resize', measure)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', measure)
    }
  }, [selector])

  const hand = clickStep ? targetRect : buttonRect
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {targetRect ? (
        <>
          <div className="pointer-events-auto fixed inset-x-0 top-0 bg-slate-950/78" style={{ height: Math.max(0, targetRect.top - 8) }} />
          <div className="pointer-events-auto fixed inset-x-0 bottom-0 bg-slate-950/78" style={{ top: targetRect.top + targetRect.height + 8 }} />
          <div
            className="pointer-events-auto fixed left-0 bg-slate-950/78"
            style={{ top: targetRect.top - 8, height: targetRect.height + 16, width: Math.max(0, targetRect.left - 8) }}
          />
          <div
            className="pointer-events-auto fixed right-0 bg-slate-950/78"
            style={{ top: targetRect.top - 8, height: targetRect.height + 16, left: targetRect.left + targetRect.width + 8 }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl ring-4 ring-pink-400"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 28px rgba(244,114,182,0.9)',
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-slate-950/78" />
      )}
      <div className="pointer-events-auto fixed left-1/2 top-20 z-[81] w-[380px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-2xl border-2 border-pink-500/80 bg-slate-950/95 p-4 shadow-[0_0_35px_rgba(236,72,153,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-pink-500/30 pb-2">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-pink-500" />
          <p className="truncate text-xs font-black tracking-wider text-pink-300">
            {t(kind === 'fan' ? 'tutorial.coachTitleFan' : 'tutorial.coachTitleExam')}
          </p>
        </div>
        <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-200">{t(bodyKey)}</p>
        {step === 'reward' ? (
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
            {t(kind === 'fan' ? 'tutorial.coachFan4' : 'tutorial.coachExam4')}
          </p>
        ) : null}
        {clickStep ? (
          <p className="mt-2 text-xs font-black text-pink-200">{t('tutorial.coachTap')}</p>
        ) : (
          <button
            type="button"
            data-coach-action="next"
            onClick={step === 'reward' ? onDone : onNext}
            className="mt-3 w-full cursor-pointer rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 py-2.5 text-xs font-black text-white shadow-lg"
          >
            {step === 'reward' ? t('tutorial.coachEnd') : t('tutorial.coachNext')}
          </button>
        )}
      </div>
      {hand ? (
        <div
          className="pointer-events-none fixed z-[82] text-4xl"
          style={{ top: hand.top + Math.min(hand.height * 0.42, 28), left: hand.left + hand.width / 2 - 16 }}
        >
          <span className="drop-shadow-[0_0_12px_rgba(236,72,153,0.95)]">👆</span>
        </div>
      ) : null}
    </div>
  )
}

export function FanMeetingModal({
  config,
  grade,
  cards,
  prepared,
  fixedLine = false,
  title,
  showSpeech = true,
  onFinish,
  onAbort,
  onPayout,
  practice = false,
  headerExtra,
}: FanMeetingModalProps) {
  const { t, locale } = useTranslation()
  const initialHpByIdRef = useRef<Record<string, number>>({})
  const [meeting, setMeeting] = useState<FanMeeting | null>(() => {
    const next = prepared ?? createFanMeeting(config, grade, cards)
    if (next) {
      initialHpByIdRef.current = Object.fromEntries(next.cards.map((card) => [card.id, card.hp]))
    }
    return next
  })
  const [practiceStep, setPracticeStep] = useState<PracticeStep | null>(practice ? 'type' : null)
  const [lineup] = useState(() => (fixedLine && prepared ? [prepared.center, ...prepared.waiting] : []))
  const finishedRef = useRef(false)
  const aliveRef = useRef(true)
  const busyRef = useRef(false)
  const [departing, setDeparting] = useState<FanPortrait | null>(null)
  const openingUrl = config.openingUrl?.trim() ?? ''
  const [opening, setOpening] = useState(Boolean(openingUrl) && !practice)
  const [payoutBurst, setPayoutBurst] = useState<{ id: number; amount: number } | null>(null)
  const meetingRef = useRef(meeting)
  const openingRef = useRef(opening)
  const autoRef = useRef(false)
  const queuedRef = useRef<string | null>(null)
  meetingRef.current = meeting
  openingRef.current = opening
  const [flash, setFlash] = useState<StrikeFlash | null>(null)
  const [hit, setHit] = useState<FanHit | null>(null)
  const [heartBurst, setHeartBurst] = useState(0)

  useEffect(() => {
    if (!opening) return
    const stopSting = playFanOpeningSting()
    const timer = window.setTimeout(() => setOpening(false), 3000)
    return () => {
      window.clearTimeout(timer)
      stopSting()
    }
  }, [opening])
  const [floatText, setFloatText] = useState('')
  const [satGainPopup, setSatGainPopup] = useState<{
    id: number
    targetKey: string
    value: number
    critical: boolean
    matched: boolean
  } | null>(null)
  const satGainSeq = useRef(0)
  const [auto, setAuto] = useState(false)
  autoRef.current = auto
  const [shiftKeys, setShiftKeys] = useState<string[]>([])
  const [bubble, setBubble] = useState<{ key: string; line: number; side: 'left' | 'right' } | null>(() => {
    const start = prepared ?? null
    if (!start) return null
    return {
      key: start.center.key,
      line: 1 + Math.floor(Math.random() * FAN_LINE_COUNT),
      side: Math.random() < 0.5 ? 'left' : 'right',
    }
  })
  const flashSeq = useRef(0)
  const critSeq = useRef(0)
  const [verdict, setVerdict] = useState<'pass' | 'fail' | null>(null)
  const [meetingEnded, setMeetingEnded] = useState(false)
  const [callout, setCallout] = useState<{ id: number; taste: boolean; critical: boolean } | null>(null)

  useEffect(() => {
    if (!meeting) return
    const key = meeting.center.key
    setBubble((current) => {
      if (current?.key === key) return current
      return {
        key,
        line: 1 + Math.floor(Math.random() * FAN_LINE_COUNT),
        side: Math.random() < 0.5 ? 'left' : 'right',
      }
    })
  }, [meeting])

  function staminaMap(current: FanMeeting): Record<string, number> {
    return Object.fromEntries(
      current.cards.map((card) => {
        const start = initialHpByIdRef.current[card.id] ?? card.hp
        return [card.id, Math.max(0, start - card.hp)]
      }),
    )
  }

  function finish(current: FanMeeting) {
    if (finishedRef.current) return
    finishedRef.current = true
    if (practice) {
      onFinish({ earned: 0, satisfiedCount: 0, lastRewardText: '', staminaById: {} })
      return
    }
    onFinish({
      earned: current.earned,
      satisfiedCount: current.satisfiedCount,
      lastRewardText: current.lastRewardText,
      staminaById: staminaMap(current),
    })
  }

  function announcePay(amount: number) {
    if (amount <= 0) return
    setPayoutBurst({ id: Date.now(), amount })
    onPayout?.(amount)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (meeting || finishedRef.current) return
    finishedRef.current = true
    onFinish({ earned: 0, satisfiedCount: 0, lastRewardText: '', staminaById: {} })
  }, [meeting, onFinish])

  function later(ms: number, action: () => void) {
    window.setTimeout(() => {
      if (!aliveRef.current) return
      action()
    }, ms)
  }

  function releaseBusy() {
    busyRef.current = false
  }

  function pump(next: FanMeeting) {
    if (next.over) {
      releaseBusy()
      if (fixedLine) {
        setVerdict(next.satisfiedCount >= 4 ? 'pass' : 'fail')
        later(1500, () => finish(next))
        return
      }
      setMeetingEnded(true)
      later(1500, () => finish(next))
      return
    }
    const queued = queuedRef.current
    queuedRef.current = null
    const cardId = queued ?? (!fixedLine && autoRef.current ? pickAutoCard(next)?.id ?? null : null)
    if (!cardId) {
      releaseBusy()
      if (autoRef.current) setAuto(false)
      return
    }
    playCard(cardId, next, true)
  }

  function continueAfter(result: FanSubmitResult) {
    if (practice) {
      setPracticeStep((step) => {
        if (step === 'match' && result.typeMatched) return 'iron'
        if (step === 'mismatch' && !result.typeMatched) return 'pressure'
        return step
      })
    }
    if (result.satisfied) {
      setFloatText('')
      setSatGainPopup(null)
      if (!fixedLine) announcePay(result.meeting.center.pay)
      const next = fixedLine ? advanceFixedLine(result.meeting) : advanceFanLine(result.meeting, config, grade)
      meetingRef.current = next
      setMeeting(next)
      if (fixedLine || next.over || next.center.key === result.meeting.center.key) {
        setDeparting(null)
        setShiftKeys([])
        pump(next)
        return
      }
      setDeparting(result.meeting.center.satisfied)
      setShiftKeys(result.meeting.waiting.map((fan) => fan.key))
      later(FAN_SWAP_MS, () => {
        setShiftKeys([])
        setDeparting(null)
        pump(meetingRef.current ?? next)
      })
      return
    }
    let nextMeeting = result.meeting
    // 카드를 낼 때마다 요구 타입 재굴림 (승급심사·팬미팅 공통). 직전 타입은 제외.
    if (!nextMeeting.over) {
      nextMeeting = {
        ...nextMeeting,
        center: { ...nextMeeting.center, demand: rollDemand(nextMeeting.center.demand) },
      }
    }
    meetingRef.current = nextMeeting
    setMeeting(nextMeeting)
    pump(nextMeeting)
  }

  function playCard(cardId: string, current: FanMeeting, chained = false) {
    if (openingRef.current || current.over) return
    if (!chained && busyRef.current) return
    const card = current.cards.find((item) => item.id === cardId)
    if (!card || card.hp <= 0) {
      if (chained) releaseBusy()
      if (autoRef.current) {
        const fallback = pickAutoCard(current)
        if (fallback && fallback.id !== cardId) {
          playCard(fallback.id, current, true)
          return
        }
        setAuto(false)
      }
      return
    }
    busyRef.current = true
    const result = submitFanCard(current, cardId)
    if (fixedLine) {
      if (result.satisfied) playAuditJudgePleased(true)
      else if (result.critical || result.typeMatched) playAuditJudgePleased(false)
      else playSfx('audit-card-perform')
    } else {
      if (result.critical) playFanCriticalSting()
      if (result.typeMatched) playFanTasteSting(result.critical ? 0.16 : 0)
      if (!result.critical && !result.typeMatched) playSfx('audit-card-perform')
    }
    meetingRef.current = result.meeting
    setMeeting(result.meeting)
    setFloatText(result.damage > 0 ? `-${result.damage}` : '')
    satGainSeq.current += 1
    const gainId = satGainSeq.current
    const gainTargetKey = current.center.key
    setSatGainPopup({
      id: gainId,
      targetKey: gainTargetKey,
      value: Math.max(0, Math.round(result.gained)),
      critical: result.critical,
      matched: result.typeMatched,
    })
    later(1400, () => {
      setSatGainPopup((shown) => (shown?.id === gainId ? null : shown))
    })
    const ratio = result.meeting.center.satisfaction / result.meeting.center.target
    const mediaKey = ratio >= 0.8 ? 'A' : ratio >= 0.3 ? 'B' : 'C'
    const strike = pickFanStrikeSlot(card.auditMedia, { critical: result.critical })
    const slot = strike ?? card.auditMedia?.[mediaKey] ?? null
    const media = auditMediaSlotUrl(slot)
    const imageUrl = media && !isVideo(media) ? media : null
    const hitKind: FanHit = result.critical ? 'critical' : result.typeMatched ? 'type' : 'basic'
    const screenFlash = hitKind !== 'basic'
    if (result.typeMatched || result.critical) {
      critSeq.current += 1
      const calloutId = critSeq.current
      setCallout({ id: calloutId, taste: result.typeMatched, critical: result.critical })
      later(1100, () => setCallout((shown) => (shown?.id === calloutId ? null : shown)))
    }
    setHit(null)
    let shotId = 0
    if (imageUrl || screenFlash) {
      flashSeq.current += 1
      shotId = flashSeq.current
      setFlash({ id: shotId, url: imageUrl ?? '', blurRegions: slot?.blurRegions ?? [], kind: hitKind })
    } else {
      setFlash(null)
    }
    const flashMs = hitKind === 'basic' ? BASIC_FLASH_MS : SPECIAL_FLASH_MS
    const punchMs = hitKind === 'basic' ? BASIC_HIT_MS : SPECIAL_HIT_MS
    const hitAt = imageUrl || screenFlash ? flashMs : 0
    if (imageUrl && shotId) {
      const shownId = shotId
      later(SHOT_MS, () => {
        setFlash((current) => (current?.id === shownId ? null : current))
      })
    } else if (screenFlash && shotId) {
      const shownId = shotId
      later(hitAt, () => {
        setFlash((current) => (current?.id === shownId ? null : current))
      })
    }
    later(hitAt, () => {
      setHit(hitKind)
      setHeartBurst((value) => value + 1)
    })
    later(hitAt + punchMs, () => {
      setHit(null)
      continueAfter(result)
    })
  }

  function requestCard(cardId: string) {
    const current = meetingRef.current
    if (!current || current.over || openingRef.current || flash?.url) return
    if (practiceStep) {
      if (practiceStep !== 'match' && practiceStep !== 'mismatch') return
      if (cardId !== practiceFocusId(current, practiceStep)) return
    }
    if (busyRef.current) {
      if (practiceStep) return
      queuedRef.current = cardId
      return
    }
    playCard(cardId, current)
  }

  useEffect(() => {
    if (!practice || !meeting || !practiceStep || practiceStep === 'reward') return
    if (practiceStep === 'match' && !practiceHas(meeting, true)) {
      setPracticeStep('iron')
    } else if (practiceStep === 'iron' && !practiceHas(meeting, false)) {
      setPracticeStep('pressure')
    } else if (practiceStep === 'mismatch' && !practiceHas(meeting, false)) {
      setPracticeStep('pressure')
    }
  }, [practice, meeting, practiceStep])

  useEffect(() => {
    if (!auto || opening || fixedLine) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const current = meetingRef.current
      if (!current || current.over || busyRef.current) return
      const card = pickAutoCard(current)
      if (!card) {
        setAuto(false)
        return
      }
      playCard(card.id, current)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [auto, opening, fixedLine])

  if (!meeting) {
    return null
  }

  const satisfaction = `${meeting.center.satisfaction}/${meeting.center.target}`
  const statsOn = !departing && !shiftKeys.includes(meeting.center.key)
  const statsClass = `transition-opacity duration-300 ${statsOn ? 'opacity-100' : 'pointer-events-none opacity-0'}`

  return (
    <div className="fixed inset-0 z-[200] bg-black" role="dialog" aria-modal="true">
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-950">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <p className="text-lg font-black text-pink-100">{title ?? t('vip.visitTitle')}</p>
            {headerExtra}
          </div>
          <div className="flex items-center gap-3 text-right text-xs text-slate-300">
            {fixedLine ? null : (
              <div data-coach="earned" className="rounded-2xl border border-amber-300/60 bg-amber-400/15 px-4 py-1.5 shadow-[0_0_18px_rgba(251,191,36,0.28)]">
                <p className="text-[10px] font-black tracking-widest text-amber-200/80">{t('vip.earnedSoFar')}</p>
                <p className="text-2xl font-black tabular-nums leading-none text-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]">
                  {formatMoney(meeting.earned)}
                </p>
              </div>
            )}
            {onAbort ? (
              <button type="button" onClick={onAbort} className="text-xs font-bold text-slate-400 hover:text-white">
                닫기 ✕
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative flex flex-1 items-end justify-center gap-4 overflow-hidden bg-gradient-to-b from-sky-900/40 to-slate-950 px-6">
          {config.backgroundUrl ? (
            <>
              <img src={resolveMediaSrc(config.backgroundUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {config.backgroundBlurRegions && config.backgroundBlurRegions.length > 0 ? (
                <BlurRegionOverlay
                  regions={config.backgroundBlurRegions}
                  src={resolveMediaSrc(config.backgroundUrl)}
                  kind={isVideo(config.backgroundUrl) ? 'video' : 'image'}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/35" />
            </>
          ) : null}
          {fixedLine ? (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-1 px-2">
              {(lineup.length > 0 ? lineup : [meeting.center, ...meeting.waiting]).map((seat) => {
                const active = seat.key === meeting.center.key
                const pending = meeting.waiting.some((fan) => fan.key === seat.key)
                const live = active ? meeting.center : seat
                const passed = (!active && !pending) || (active && live.satisfaction >= live.target)
                return (
                  <div key={seat.key} className="relative w-[min(23vw,24rem)] shrink-0">
                    <FanFigure
                      portrait={passed ? live.satisfied : active ? live.center : live.wait}
                      active={active && !passed}
                      lit={active || passed}
                      uniform
                      leaving={false}
                      hit={active ? hit : null}
                    />
                    {active && !passed && bubble ? (
                      <div
                        className={`fan-speech pointer-events-none absolute top-[30%] z-40 ${
                          bubble.side === 'right' ? 'left-[58%]' : 'right-[58%]'
                        }`}
                      >
                        {t(`audit.judgeLine${String(bubble.line).padStart(2, '0')}`)}
                        <span className={`fan-speech-tail${bubble.side === 'left' ? ' fan-speech-tail--end' : ''}`} />
                      </div>
                    ) : null}
                    {active ? (
                      <>
                        <div className={`absolute bottom-[4.6rem] left-2 z-20 flex flex-col items-start gap-1 ${statsClass}`}>
                          <span data-coach={fixedLine ? 'iron' : undefined} className="whitespace-nowrap rounded-lg border border-sky-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)]">
                            {t('audit.ironWall')} {live.ironWall}
                          </span>
                          <span data-coach={fixedLine ? 'pressure' : undefined} className="whitespace-nowrap rounded-lg border border-rose-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.35)]">
                            {t('audit.pressure')} {live.pressure}
                          </span>
                        </div>
                        <div className={`absolute inset-x-0 bottom-1 z-20 px-1 ${statsClass}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span data-coach={fixedLine ? 'reward' : undefined} className="truncate text-xs font-black text-pink-50 drop-shadow">
                              {t('vip.fanSatisfaction').replace('{value}', String(satisfaction))}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <span data-coach={fixedLine ? 'type' : undefined} className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-black ${CREATOR_TYPE_LABEL[live.demand].tone}`}>
                                <span>{CREATOR_TYPE_LABEL[live.demand].icon}</span>
                                <span>{getCreatorTypeDisplayName(live.demand, t)}</span>
                              </span>
                              {floatText ? <span className="text-xs font-black text-rose-200">{floatText}</span> : null}
                            </span>
                          </div>
                          <div className="relative">
                            {satGainPopup && satGainPopup.targetKey === live.key ? (
                              <div
                                key={satGainPopup.id}
                                className={`sat-gain-float pointer-events-none absolute left-1/2 bottom-full z-30 mb-1 whitespace-nowrap rounded-xl border px-3 py-1.5 shadow-lg backdrop-blur-md ${
                                  satGainPopup.critical
                                    ? 'border-amber-300/70 bg-amber-950/90 text-amber-100'
                                    : satGainPopup.matched
                                      ? 'border-pink-300/70 bg-pink-950/90 text-pink-100'
                                      : 'border-white/20 bg-slate-950/90 text-slate-100'
                                }`}
                              >
                                <span className="text-lg font-black tabular-nums tracking-tight">
                                  {t('audit.satisfactionGain', { value: satGainPopup.value })}
                                </span>
                              </div>
                            ) : null}
                            <div className="h-3.5 overflow-hidden rounded-full border border-pink-200/70 bg-black/75 shadow-[0_0_18px_rgba(244,114,182,0.7)]">
                              <div
                                className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-rose-200 transition-all"
                                style={{ width: `${Math.min(100, Math.round((live.satisfaction / live.target) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {heartBurst > 0 ? (
                          <div key={heartBurst} className="pointer-events-none absolute inset-x-0 top-[22%] z-30">
                            {[
                              { left: '18%', delay: '0ms', size: '1.7rem' },
                              { left: '42%', delay: '70ms', size: '2.1rem' },
                              { left: '64%', delay: '30ms', size: '1.45rem' },
                            ].map((heart) => (
                              <span
                                key={heart.left}
                                className="fan-heart absolute font-black leading-none"
                                style={{ left: heart.left, animationDelay: heart.delay, fontSize: heart.size }}
                              >
                                ♥
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
          <div className={`absolute inset-x-0 bottom-0 z-10 grid grid-cols-[1fr_auto_1fr] items-end ${fixedLine ? 'hidden' : ''}`}>
            <div />
            <div className="flex w-fit flex-col items-center">
              <div className="relative">
                <span data-coach={fixedLine ? undefined : 'iron'} className={`absolute right-full top-[38%] z-20 mr-3 whitespace-nowrap rounded-lg border border-sky-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)] ${statsClass}`}>
                  {t('audit.ironWall')} {meeting.center.ironWall}
                </span>
                <span data-coach={fixedLine ? undefined : 'pressure'} className={`absolute right-full top-[52%] z-20 mr-3 whitespace-nowrap rounded-lg border border-rose-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.35)] ${statsClass}`}>
                  {t('audit.pressure')} {meeting.center.pressure}
                </span>
                {showSpeech && statsOn && bubble ? (
                  <div
                    className={`fan-speech pointer-events-none absolute top-[2%] z-30 ${
                      bubble.side === 'right' ? 'left-[68%]' : 'right-[68%]'
                    }`}
                  >
                    {t(`vip.fanLine${String(bubble.line).padStart(2, '0')}`)}
                    <span className={`fan-speech-tail${bubble.side === 'left' ? ' fan-speech-tail--end' : ''}`} />
                  </div>
                ) : null}
                <FanFigure
                  key={meeting.center.key}
                  portrait={
                    shiftKeys.includes(meeting.center.key)
                      ? meeting.center.wait
                      : meeting.center.center
                  }
                  active
                  leaving={false}
                  hit={hit}
                  motion={shiftKeys.includes(meeting.center.key) ? 'center' : null}
                />
                {departing ? (
                  <div className="pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2">
                    <FanFigure portrait={departing} active leaving={false} motion="depart" />
                  </div>
                ) : null}
                <div className={`absolute inset-x-0 bottom-1 z-20 px-1 ${statsClass}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span data-coach={fixedLine ? 'reward' : undefined} className="truncate text-xs font-black text-pink-50 drop-shadow">
                      {t('vip.fanSatisfaction').replace('{value}', String(satisfaction))}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span data-coach={fixedLine ? undefined : 'type'} className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-black ${CREATOR_TYPE_LABEL[meeting.center.demand].tone}`}>
                        <span>{CREATOR_TYPE_LABEL[meeting.center.demand].icon}</span>
                        <span>{getCreatorTypeDisplayName(meeting.center.demand, t)}</span>
                      </span>
                      {floatText ? <span className="text-xs font-black text-rose-200">{floatText}</span> : null}
                    </span>
                  </div>
                  <div className="relative">
                    {satGainPopup && satGainPopup.targetKey === meeting.center.key ? (
                      <div
                        key={satGainPopup.id}
                        className={`sat-gain-float pointer-events-none absolute left-1/2 bottom-full z-30 mb-1 whitespace-nowrap rounded-xl border px-3 py-1.5 shadow-lg backdrop-blur-md ${
                          satGainPopup.critical
                            ? 'border-amber-300/70 bg-amber-950/90 text-amber-100'
                            : satGainPopup.matched
                              ? 'border-pink-300/70 bg-pink-950/90 text-pink-100'
                              : 'border-white/20 bg-slate-950/90 text-slate-100'
                        }`}
                      >
                        <span className="text-lg font-black tabular-nums tracking-tight">
                          {t('audit.satisfactionGain', { value: satGainPopup.value })}
                        </span>
                      </div>
                    ) : null}
                    <div className="h-3.5 overflow-hidden rounded-full border border-pink-200/70 bg-black/75 shadow-[0_0_18px_rgba(244,114,182,0.7)]">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-rose-200 transition-all"
                        style={{ width: `${Math.min(100, Math.round((meeting.center.satisfaction / meeting.center.target) * 100))}%` }}
                      />
                    </div>
                  </div>
                  {fixedLine ? null : (
                    <p data-coach="reward" className="mt-1 text-center text-[11px] font-black text-amber-200 drop-shadow">
                      {t('vip.visitPay').replace('{amount}', formatMoney(meeting.center.pay))}
                    </p>
                  )}
                </div>
                {heartBurst > 0 ? (
                  <div key={heartBurst} className="pointer-events-none absolute inset-x-0 top-[22%] z-30">
                    {[
                      { left: '18%', delay: '0ms', size: '1.7rem' },
                      { left: '42%', delay: '70ms', size: '2.1rem' },
                      { left: '64%', delay: '30ms', size: '1.45rem' },
                      { left: '30%', delay: '120ms', size: '1.25rem' },
                      { left: '74%', delay: '90ms', size: '1.6rem' },
                    ].map((heart) => (
                      <span
                        key={heart.left}
                        className="fan-heart absolute font-black leading-none"
                        style={{ left: heart.left, animationDelay: heart.delay, fontSize: heart.size }}
                      >
                        ♥
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-end gap-4 pl-4">
              {meeting.waiting.map((fan, index) => {
                const carried = shiftKeys.includes(fan.key)
                const joining = shiftKeys.length > 0 && !carried && index === meeting.waiting.length - 1
                return (
                  <FanFigure
                    key={fan.key}
                    portrait={fan.wait}
                    active={false}
                    leaving={false}
                    motion={carried ? 'wait' : joining ? 'join' : null}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-pink-500/20 bg-slate-950/90 px-4 py-3">
          <p className="mb-2 text-center text-[10px] font-bold tracking-wide text-slate-400">
            {t('vip.combatTip')}
          </p>
          {fixedLine || practice ? null : (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-pressed={auto}
                onClick={() => setAuto((value) => !value)}
                className={`rounded-full px-4 py-1.5 text-xs font-black tracking-wide ${
                  auto
                    ? 'bg-sky-400 text-slate-950'
                    : 'border border-white/15 bg-black/30 text-slate-200'
                }`}
              >
                {t('vip.fanAuto')}
              </button>
            </div>
          )}
          <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
            {meeting.cards.map((card) => {
              const creatorType = typeForCreator(card.id, card.statType)
              const matched = creatorType === meeting.center.demand
              const dead = card.hp <= 0
              const staminaPct = card.hpMax > 0 ? Math.min(100, Math.round((card.hp / card.hpMax) * 100)) : 0
              const waitingFan = !statsOn
              const performing = Boolean(flash?.url)
              const focusId = practiceStep ? practiceFocusId(meeting, practiceStep) : null
              const practiceTarget = focusId === card.id
              const practiceLocked = practiceStep != null && !practiceTarget
              const disabled = dead || meeting.over || opening || performing || practiceLocked
              const grade = (['S', 'A', 'B', 'C'].includes(String(card.grade).toUpperCase())
                ? String(card.grade).toUpperCase()
                : 'B') as Grade
              const typeLabel = t(STAT_TYPE_LABEL_KEY[creatorType])
              const preview = previewCardPlay({
                performance: card.statPerformance,
                mental: card.statMental,
                ironWall: meeting.center.ironWall,
                pressure: meeting.center.pressure,
                typeMatched: matched,
                satisfaction: meeting.center.satisfaction,
                target: meeting.center.target,
              })
              const scoreLabel =
                preview.scoreMin === preview.scoreMax
                  ? t('vip.previewScoreFlat', { value: preview.scoreMin })
                  : t('vip.previewScore', { min: preview.scoreMin, max: preview.scoreMax })
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={disabled}
                  data-practice-target={practiceTarget ? '1' : undefined}
                  onClick={() => requestCard(card.id)}
                  title={`${typeLabel} · ${scoreLabel} · ${t('vip.previewDamage', { value: preview.damage })}`}
                  className={`group relative flex aspect-[3/4] max-h-[210px] flex-col justify-between overflow-hidden rounded-xl text-left transition-all ${
                    dead
                      ? 'cursor-not-allowed border border-white/10 opacity-40 grayscale'
                      : practiceLocked
                        ? 'cursor-not-allowed border border-white/10 brightness-[0.25] saturate-50'
                      : performing
                        ? 'cursor-not-allowed border border-white/10 brightness-[0.32] saturate-50'
                        : waitingFan
                        ? 'cursor-pointer border border-white/10 brightness-[0.32] saturate-50'
                        : practiceTarget
                          ? 'cursor-pointer border border-amber-300/80 outline outline-1 outline-amber-200/50 shadow-[0_0_16px_rgba(251,191,36,0.28)] hover:scale-[1.02]'
                        : matched
                          ? 'cursor-pointer border-2 border-pink-400/90 outline outline-2 outline-pink-300/50 shadow-[0_0_18px_rgba(244,114,182,0.4)] hover:scale-[1.02]'
                          : 'cursor-pointer border border-white/15 hover:scale-[1.02] hover:border-amber-200/40'
                  }`}
                >
                  {card.profileImageUrl ? (
                    <img
                      src={resolveMediaSrc(card.profileImageUrl)}
                      alt=""
                      className="absolute inset-[4%] rounded-[14px] object-cover"
                    />
                  ) : (
                    <div className="absolute inset-[4%] rounded-[14px] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
                  )}
                  <img
                    src={DECK_UI_ASSETS.cardBezel}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-[5] h-full w-full object-fill"
                  />
                  <div className="relative z-10 flex items-start justify-between gap-1 bg-gradient-to-b from-black/80 to-transparent p-1.5">
                    <GradePlate grade={grade} size="sm" />
                    <span className="rounded bg-black/70 px-1 py-0.5 text-[9px] font-black tabular-nums text-cyan-200">
                      {card.statPerformance}
                    </span>
                  </div>
                  {!dead ? (
                    <div className="relative z-10 flex flex-wrap gap-1 px-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black text-white ${
                          matched ? 'bg-pink-500/90' : 'bg-slate-700/90'
                        }`}
                      >
                        {matched ? t('vip.cardEffective') : t('vip.cardWeak')}
                      </span>
                      {matched ? (
                        <span className="rounded bg-pink-500/90 px-1.5 py-0.5 text-[9px] font-black text-white">
                          {t('vip.fanTaste')}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="relative z-10 space-y-1 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-2 pt-6">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-black text-white">
                        {characterDisplayName({ id: card.id, name: card.name }, locale)}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md border p-0.5 ${STAT_TYPE_CHIP_TONE[creatorType]}`}
                        aria-label={typeLabel}
                      >
                        <TypeStatIcon type={creatorType} className="h-4 w-4" />
                      </span>
                    </div>
                    {!dead ? (
                      <div className="flex items-center justify-between gap-1 text-[8px] font-black tabular-nums">
                        <span className={`rounded px-1 py-0.5 ${matched ? 'bg-emerald-500/25 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}>
                          {scoreLabel}
                        </span>
                        <span
                          className={`rounded px-1 py-0.5 ${
                            preview.likelySatisfy ? 'bg-sky-500/25 text-sky-100' : 'bg-rose-500/25 text-rose-100'
                          }`}
                        >
                          {t('vip.previewDamage', { value: preview.damage })}
                          {preview.likelySatisfy ? t('vip.previewDamageHalfHint') : ''}
                        </span>
                      </div>
                    ) : null}
                    <div
                      className="border-t border-white/10 pt-1"
                      title={`${t('creator.statStamina')} ${card.hp}/${card.hpMax}`}
                    >
                      <div className="flex items-center justify-between text-[8px] font-black text-slate-200">
                        <BoltGlyph className="h-2.5 w-2.5 text-amber-300" />
                        <span className="tabular-nums">
                          {card.hp}/{card.hpMax}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full border border-white/15 bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300"
                          style={{ width: `${staminaPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {flash && flash.kind !== 'basic' ? (
        <div key={`burst-${flash.id}`} className={`fan-screen-flash fan-screen-flash--${flash.kind} pointer-events-none absolute inset-0 z-20`} />
      ) : null}
      {flash?.url ? (
        fixedLine ? (
          <div key={flash.id} className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center">
            <div className="fan-strike-flash relative w-fit">
              <img
                src={resolveMediaSrc(flash.url)}
                alt=""
                className="block h-auto max-h-[min(86vh,58rem)] w-auto max-w-[min(58vh,40rem)] object-contain object-bottom"
              />
              {flash.blurRegions.length > 0 ? (
                <BlurRegionOverlay regions={flash.blurRegions} src={resolveMediaSrc(flash.url)} kind="image" />
              ) : null}
            </div>
          </div>
        ) : (
        <div key={flash.id} className="fan-strike-flash pointer-events-none absolute bottom-0 left-[calc(50%+5rem)] z-30">
          <div className="relative w-fit">
            <img
              src={resolveMediaSrc(flash.url)}
              alt=""
              className="block h-auto max-h-[min(86vh,58rem)] w-auto max-w-[min(58vh,40rem)] object-contain object-bottom"
            />
            {flash.blurRegions.length > 0 ? (
              <BlurRegionOverlay regions={flash.blurRegions} src={resolveMediaSrc(flash.url)} kind="image" />
            ) : null}
          </div>
        </div>
        )
      ) : null}
      {meetingEnded ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-6">
          <p className="fan-crit-title">{t('vip.visitEndTitle')}</p>
        </div>
      ) : null}
      {verdict ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-6">
          <p className={`fan-crit-title fan-crit-title--${verdict}`}>
            {t(verdict === 'pass' ? 'audit.examPassTitle' : 'audit.examFailTitle')}
          </p>
        </div>
      ) : null}
      {callout ? (
        <div key={callout.id} className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6">
          {callout.critical ? <p className="fan-crit-title fan-crit-title--critical">{t('vip.fanCritical')}</p> : null}
          {callout.taste ? <p className="fan-crit-title">{t('vip.fanCrit')}</p> : null}
        </div>
      ) : null}
      {opening && openingUrl ? (
        <div className="fan-opening-shell absolute inset-0 z-40 flex items-center justify-center bg-black">
          <video
            src={resolveMediaSrc(openingUrl)}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          {config.openingBlurRegions && config.openingBlurRegions.length > 0 ? (
            <BlurRegionOverlay
              regions={config.openingBlurRegions}
              src={resolveMediaSrc(openingUrl)}
              kind={isVideo(openingUrl) ? 'video' : 'image'}
            />
          ) : null}
          <p className={`fan-opening-title fan-opening-title--${locale} pointer-events-none absolute inset-x-0 text-center text-white`}>
            {title ?? t('vip.visitTitle')}
          </p>
        </div>
      ) : null}
      {payoutBurst ? (
        <p key={payoutBurst.id} className="fan-payout-burst pointer-events-none absolute left-1/2 top-[38%] z-[55] text-5xl font-black text-amber-200">
          +{formatMoney(payoutBurst.amount)}
        </p>
      ) : null}
      {practice && practiceStep && !opening ? (
        <PracticeCoach
          kind={fixedLine ? 'exam' : 'fan'}
          step={practiceStep}
          onNext={() => {
            if (!meeting) return
            setPracticeStep(explainAdvance(meeting, practiceStep))
          }}
          onDone={() => onAbort?.()}
        />
      ) : null}
    </div>
  )
}

type ExamCreator = {
  id: string
  name: string
  grade?: FanCardState['grade']
  statType?: string
  statPerformance?: number
  statMental?: number
  statElegance?: number
  stamina?: number
  staminaMax?: number
  auditMedia?: FanCardState['auditMedia']
  profileImageUrl?: string | null
}

function examCard(creator: ExamCreator): FanCardState {
  const hpMax = Math.max(1, Math.round(creator.staminaMax ?? creator.stamina ?? 100))
  const hp = Math.max(0, Math.min(hpMax, Math.round(creator.stamina ?? hpMax)))
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade ?? 'B',
    statType: creator.statType ?? '',
    statPerformance: Math.round(creator.statPerformance ?? 0),
    statMental: Math.round(creator.statMental ?? creator.statElegance ?? 0),
    hp,
    hpMax,
    auditMedia: creator.auditMedia,
    profileImageUrl: creator.profileImageUrl,
  }
}

export function ExamMeetingModal({
  tier,
  creators,
  config,
  onAbort,
  onFinish,
  onPayout,
  practice = false,
  headerExtra,
}: {
  tier: Exclude<StationGrade, 'black' | 'tiny'>
  creators: ExamCreator[]
  config: StationGradeConfig
  onAbort: () => void
  onFinish: FanMeetingModalProps['onFinish']
  onPayout?: (amount: number) => void
  practice?: boolean
  headerExtra?: ReactNode
}) {
  const { t } = useTranslation()
  const audit = config.auditConfig ?? defaultAuditConfig()
  const [prepared] = useState(() => createExamMeeting(audit, tier, creators.map(examCard)))
  const vip = config.vipConfig ?? defaultVipConfig()
  const shell: VipVisitConfig = {
    ...vip,
    backgroundUrl: audit.stageSettings[tier].backgroundUrl ?? '',
    backgroundBlurRegions: audit.stageSettings[tier].backgroundBlurRegions ?? [],
    openingUrl: audit.stageSettings[tier].openingUrl ?? '',
    openingBlurRegions: audit.stageSettings[tier].openingBlurRegions ?? [],
  }
  if (!prepared) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md rounded-3xl border border-purple-400/40 bg-slate-950 p-6">
          <p className="text-sm text-slate-200">{t('audit.examNeedImages')}</p>
          <button type="button" onClick={onAbort} className="game-btn game-btn-primary mt-4 rounded-xl px-4 py-2 text-xs font-bold">
            {t('vip.confirm')}
          </button>
        </div>
      </div>
    )
  }
  return (
    <FanMeetingModal
      config={shell}
      grade={tier}
      cards={prepared.cards}
      prepared={prepared}
      fixedLine
      showSpeech={false}
      title={t('audit.examOpeningTitle')}
      headerExtra={headerExtra}
      onAbort={onAbort}
      onFinish={onFinish}
      onPayout={onPayout}
      practice={practice}
    />
  )
}
