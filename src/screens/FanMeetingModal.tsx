import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { characterDisplayName } from '../game/characterLocales'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import type { StationGrade, VipVisitConfig } from '../game/stationGradeConfig'
import { defaultAuditConfig, defaultVipConfig, type StationGradeConfig } from '../game/stationGradeConfig'
import { playFanCriticalSting, playFanOpeningSting, playFanTasteSting, playSfx } from '../game/uiSfx'
import { useTranslation } from '../locales/i18n'
import { getGradeBadgeStyle } from './PromotionAuditModal'

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
  headerExtra,
}: FanMeetingModalProps) {
  const { t, locale } = useTranslation()
  const [meeting, setMeeting] = useState<FanMeeting | null>(() => prepared ?? createFanMeeting(config, grade, cards))
  const [lineup] = useState(() => (fixedLine && prepared ? [prepared.center, ...prepared.waiting] : []))
  const finishedRef = useRef(false)
  const aliveRef = useRef(true)
  const busyRef = useRef(false)
  const [departing, setDeparting] = useState<FanPortrait | null>(null)
  const openingUrl = config.openingUrl?.trim() ?? ''
  const [opening, setOpening] = useState(Boolean(openingUrl))
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
    return Object.fromEntries(current.cards.map((card) => [card.id, Math.max(0, card.hpMax - card.hp)]))
  }

  function finish(current: FanMeeting) {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinish({
      earned: current.earned,
      satisfiedCount: current.satisfiedCount,
      lastRewardText: current.lastRewardText,
      staminaById: staminaMap(current),
    })
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
    if (result.satisfied) {
      setFloatText('')
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
    if (fixedLine && !nextMeeting.over) {
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
    if (result.critical) playFanCriticalSting()
    if (result.typeMatched) playFanTasteSting(result.critical ? 0.16 : 0)
    if (!result.critical && !result.typeMatched) playSfx('audit-card-perform')
    meetingRef.current = result.meeting
    setMeeting(result.meeting)
    setFloatText(`${result.gained > 0 ? `+${result.gained}` : '+0'}${result.damage > 0 ? ` / -${result.damage}` : ''}`)
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
    if (busyRef.current) {
      queuedRef.current = cardId
      return
    }
    playCard(cardId, current)
  }

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
          <div className="text-right text-xs text-slate-300">
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
                          <span className="whitespace-nowrap rounded-lg border border-sky-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)]">
                            {t('audit.ironWall')} {live.ironWall}
                          </span>
                          <span className="whitespace-nowrap rounded-lg border border-rose-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.35)]">
                            {t('audit.pressure')} {live.pressure}
                          </span>
                        </div>
                        <div className={`absolute inset-x-0 bottom-1 z-20 px-1 ${statsClass}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black text-pink-50 drop-shadow">
                              {t('vip.fanSatisfaction').replace('{value}', String(satisfaction))}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <span className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-black ${CREATOR_TYPE_LABEL[live.demand].tone}`}>
                                <span>{CREATOR_TYPE_LABEL[live.demand].icon}</span>
                                <span>{getCreatorTypeDisplayName(live.demand, t)}</span>
                              </span>
                              {floatText ? <span className="text-xs font-black text-amber-200">{floatText}</span> : null}
                            </span>
                          </div>
                          <div className="h-3.5 overflow-hidden rounded-full border border-pink-200/70 bg-black/75 shadow-[0_0_18px_rgba(244,114,182,0.7)]">
                            <div
                              className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-rose-200 transition-all"
                              style={{ width: `${Math.min(100, Math.round((live.satisfaction / live.target) * 100))}%` }}
                            />
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
                <span className={`absolute right-full top-[38%] z-20 mr-3 whitespace-nowrap rounded-lg border border-sky-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)] ${statsClass}`}>
                  {t('audit.ironWall')} {meeting.center.ironWall}
                </span>
                <span className={`absolute right-full top-[52%] z-20 mr-3 whitespace-nowrap rounded-lg border border-rose-300/50 bg-slate-950/90 px-2.5 py-1 text-xs font-black text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.35)] ${statsClass}`}>
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
                    <span className="truncate text-xs font-black text-pink-50 drop-shadow">
                      {t('vip.fanSatisfaction').replace('{value}', String(satisfaction))}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-black ${CREATOR_TYPE_LABEL[meeting.center.demand].tone}`}>
                        <span>{CREATOR_TYPE_LABEL[meeting.center.demand].icon}</span>
                        <span>{getCreatorTypeDisplayName(meeting.center.demand, t)}</span>
                      </span>
                      {floatText ? <span className="text-xs font-black text-amber-200">{floatText}</span> : null}
                    </span>
                  </div>
                  <div className="h-3.5 overflow-hidden rounded-full border border-pink-200/70 bg-black/75 shadow-[0_0_18px_rgba(244,114,182,0.7)]">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-rose-200 transition-all"
                      style={{ width: `${Math.min(100, Math.round((meeting.center.satisfaction / meeting.center.target) * 100))}%` }}
                    />
                  </div>
                  {fixedLine ? null : (
                    <p className="mt-1 text-center text-[11px] font-black text-amber-200 drop-shadow">
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
          {fixedLine ? null : (
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
              const typeInfo = CREATOR_TYPE_LABEL[creatorType]
              const staminaPct = card.hpMax > 0 ? Math.min(100, Math.round((card.hp / card.hpMax) * 100)) : 0
              const waitingFan = !statsOn
              const performing = Boolean(flash?.url)
              const disabled = dead || meeting.over || opening || performing
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => requestCard(card.id)}
                  className={`group relative flex aspect-[3/4] max-h-[210px] flex-col justify-between overflow-hidden rounded-xl text-left transition-all ${
                    dead
                      ? 'cursor-not-allowed border border-white/10 opacity-40 grayscale'
                      : performing
                        ? 'cursor-not-allowed border border-white/10 brightness-[0.32] saturate-50'
                        : waitingFan
                        ? 'cursor-pointer border border-white/10 brightness-[0.32] saturate-50'
                        : matched
                          ? 'cursor-pointer border-2 border-pink-400 ring-4 ring-pink-500/50 shadow-[0_0_24px_rgba(244,114,182,0.55)] hover:scale-[1.03]'
                          : 'cursor-pointer border border-pink-400/30 hover:scale-[1.03] hover:border-pink-300'
                  }`}
                >
                  {card.profileImageUrl ? (
                    <img src={resolveMediaSrc(card.profileImageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-slate-900 to-slate-950" />
                  )}
                  <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-1.5">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black italic ${getGradeBadgeStyle(card.grade)}`}>
                      {card.grade}
                    </span>
                    <span className="rounded bg-black/70 px-1 py-0.5 text-[9px] font-black text-cyan-200">
                      {t('creator.statPerformance')} {card.statPerformance}
                    </span>
                  </div>
                  {matched && !dead ? (
                    <div className="relative z-10 px-1.5">
                      <span className="rounded bg-pink-500/90 px-1.5 py-0.5 text-[9px] font-black text-white">{t('vip.fanTaste')}</span>
                    </div>
                  ) : null}
                  <div className="relative z-10 space-y-1 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-2 pt-6">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-black text-white">{characterDisplayName({ id: card.id, name: card.name }, locale)}</p>
                      <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-black ${typeInfo.tone}`}>
                        {typeInfo.icon}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-1">
                      <div className="flex items-center justify-between text-[8px] font-black text-amber-300">
                        <span>⚡ STAMINA</span>
                        <span className="tabular-nums text-slate-200">{card.hp}/{card.hpMax}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full border border-white/15 bg-slate-900">
                        <div className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300" style={{ width: `${staminaPct}%` }} />
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
  const hp = Math.max(1, Math.round(creator.stamina ?? creator.staminaMax ?? 100))
  return {
    id: creator.id,
    name: creator.name,
    grade: creator.grade ?? 'B',
    statType: creator.statType ?? '',
    statPerformance: Math.round(creator.statPerformance ?? 0),
    statMental: Math.round(creator.statMental ?? creator.statElegance ?? 0),
    hp,
    hpMax: hp,
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
  headerExtra,
}: {
  tier: Exclude<StationGrade, 'black' | 'tiny'>
  creators: ExamCreator[]
  config: StationGradeConfig
  onAbort: () => void
  onFinish: FanMeetingModalProps['onFinish']
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
    />
  )
}
