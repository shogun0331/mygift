import { useState, useEffect, useRef } from 'react'
import {
  CREATOR_TYPE_LABEL,
  createAuditSession,
  submitTurnPerformance,
  type AuditSession,
} from '../game/auditEngine'
import { pickCharacterLocaleText } from '../game/characterLocales'
import { auditMediaSlotUrl, type RegisteredCharacter as RegisteredCreator } from '../game/characters'
import { readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion, GameEvent } from '../events/types'
import { blurRegionsForVnFile } from './CharacterAuditEditorModal'
import { MosaicMediaFrame } from './MosaicMediaFrame'
import { resolveMediaSrc } from '../game/mediaUrl'
import { stationGradeLabel, type StationGrade } from '../game/station'
import { getJudgeSatisfactionMediaUrl, type StationGradeConfig, type CreatorType } from '../game/stationGradeConfig'
import { useI18n } from '../locales/i18n'
import {
  getJudgeReactionDialogue,
  getJudgeAttackDialogue,
  getAuditPassTitle,
  getAuditFailTitle,
  getSatisfyJudgeTitle,
  getSelectCardPrompt,
} from '../game/judgeDialogues'
import { playSfx, playAuditPassFanfare } from '../game/uiSfx'

function isVideoMediaUrl(url: string) {
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.startsWith('data:video') ||
    /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/.test(clean)
  )
}

function fileNameFromUrl(url: string) {
  const clean = url.split('?')[0]
  try {
    return decodeURIComponent(clean.split('/').pop() || '')
  } catch {
    return clean.split('/').pop() || ''
  }
}

function resolveCutsceneBlur(
  slot: unknown,
  mediaUrl: string,
  events?: GameEvent[],
): BlurRegion[] {
  const stored = readBlurRegions(slot && typeof slot === 'object' ? slot : { blurRegions: [] })
  if (stored.length > 0) return stored
  if (!events?.length) return []
  return blurRegionsForVnFile(events, fileNameFromUrl(mediaUrl))
}

/** 등급별(S, A, B, C) 프리미엄 네온 글로우 뱃지 스타일 헬퍼 */
export function getGradeBadgeStyle(grade: string = 'B') {
  const g = (grade || 'B').toUpperCase()
  switch (g) {
    case 'S':
      return 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50'
    case 'A':
      return 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_15px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50'
    case 'B':
      return 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_15px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50'
    case 'C':
    default:
      return 'border-slate-400 text-slate-200 bg-slate-900 shadow-[0_0_10px_rgba(148,163,184,0.5)]'
  }
}

type PromotionAuditModalProps = {
  tier: Exclude<StationGrade, 'black' | 'tiny'>
  creators: RegisteredCreator[]
  events?: GameEvent[]
  config?: StationGradeConfig
  onComplete: (success: boolean, staminaDeductions: Record<string, number>) => void
  onClose?: () => void
}

export function PromotionAuditModal({
  tier,
  creators,
  events,
  config,
  onComplete,
  onClose,
}: PromotionAuditModalProps) {
  const { locale } = useI18n()
  const [session, setSession] = useState<AuditSession>(() => createAuditSession(tier, config))
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [draggedCreatorId, setDraggedCreatorId] = useState<string | null>(null)

  const [lastPerformedCreator, setLastPerformedCreator] = useState<RegisteredCreator | null>(null)
  const [popupCutsceneMediaUrl, setPopupCutsceneMediaUrl] = useState<string | null>(null)
  const [popupCutsceneBlurRegions, setPopupCutsceneBlurRegions] = useState<BlurRegion[]>([])
  const [isCutsceneModalOpen, setIsCutsceneModalOpen] = useState<boolean>(false)
  const [canCloseCutscene, setCanCloseCutscene] = useState(false)
  const cutsceneHoldRef = useRef<number | null>(null)

  // 매혹/야한 댄스 퍼포먼스 심쿵 폭발 연출 (Seductive Heart Attack & Temptation Burst)
  const [lastScoreGained, setLastScoreGained] = useState<number | null>(null)
  const [isTypeMatchedHit, setIsTypeMatchedHit] = useState<boolean>(false)
  const [isCriticalHit, setIsCriticalHit] = useState<boolean>(false)
  const [criticalMult, setCriticalMult] = useState<number>(1.0)
  const [showImpactEffect, setShowImpactEffect] = useState<boolean>(false)
  const [isHeartShaking, setIsHeartShaking] = useState<boolean>(false)

  // 💬 심사관 오른쪽 상단 말풍선 코멘트 상태 (시작하자마자 0% 만족도 저만족 멘트 초기 노출)
  const [judgeSpeechBubble, setJudgeSpeechBubble] = useState<{
    text: string
    type: 'reaction' | 'attack'
  } | null>(() => ({
    text: getJudgeReactionDialogue(0, locale),
    type: 'reaction',
  }))

  // 🎬 진입 직후 암전 시네마틱 스케일 트윈 타이틀 연출 상태 (0ms ~ 2000ms)
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(true)
  const [isActionLocked, setIsActionLocked] = useState<boolean>(true)
  const [showActionGuide, setShowActionGuide] = useState<boolean>(false)
  const [showResultModal, setShowResultModal] = useState<boolean>(false)

  useEffect(() => {
    // 🎬 까만 화면에서 "심사관을 만족시켜라!" 스케일 트윈 2초 연출 후 심사관 미디어 & 액션 가이드 활성화!
    const timer = setTimeout(() => {
      setShowCinematicIntro(false)
      setIsActionLocked(false)
      setShowActionGuide(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const passAudioPlayedRef = useRef(false)
  useEffect(() => {
    if (
      showResultModal &&
      (session.isSuccess || session.currentSatisfaction >= session.targetSatisfaction) &&
      !passAudioPlayedRef.current
    ) {
      passAudioPlayedRef.current = true
      playSfx('training-exam-success')
      playAuditPassFanfare()
    }
  }, [showResultModal, session.isSuccess, session.currentSatisfaction, session.targetSatisfaction])

  useEffect(() => {
    return () => {
      if (cutsceneHoldRef.current != null) window.clearTimeout(cutsceneHoldRef.current)
    }
  }, [])
  const [isJudgeTurn, setIsJudgeTurn] = useState<boolean>(false)
  const [isJudgeEnergyFlying, setIsJudgeEnergyFlying] = useState<boolean>(false)
  const [hitFlashingCardId, setHitFlashingCardId] = useState<string | null>(null)
  const [targetSlotIdx, setTargetSlotIdx] = useState<number>(0)
  const [lastDamageDealt, setLastDamageDealt] = useState<number>(20)

  // 4인 보유 크리에이터 (보유 크리에이터 없으면 기본 로스터)
  const displayCreators = creators.slice(0, 4)

  // 심사관 반격 턴 시퀀스 시작
  const triggerJudgeCounterAttack = (targetCreatorId: string) => {
    // 만족도를 완전히 채워서 이미 승급 성공한 경우에만 공격 멈춤! (5/5 턴 포함 미달 시 마지막 반격 정상 수행)
    if (session.isSuccess || session.currentSatisfaction >= session.targetSatisfaction) {
      setIsActionLocked(false)
      return
    }

    setIsJudgeTurn(true)
    playSfx('audit-judge-attack')
    const attackDmg = Math.round(session.judge.attackPower || 20)
    setLastDamageDealt(attackDmg)

    // ⚔️ 심사관 공격 멘트 7개국어 중 픽업하여 말풍선 표시
    const attackDialogueText = getJudgeAttackDialogue(locale)
    setJudgeSpeechBubble({ text: attackDialogueText, type: 'attack' })

    // 피격 대상 크리에이터의 4칸 슬롯 위치 인덱스 (0~3) 탐색
    const slotIdx = displayCreators.findIndex((c) => c.id === targetCreatorId)
    setTargetSlotIdx(slotIdx !== -1 ? slotIdx : 0)

    // 1단계: 심사관 위치에서 붉은 공격 에너지 볼이 해당 크리에이터 카드로 대각선 광속 비행 (0ms ~ 420ms)
    setIsJudgeEnergyFlying(true)

    setTimeout(() => {
      // 2단계: 크리에이터 카드 도착 & CCTV 지진 카메라 피격 흔들림 + 붉은 번쩍임 (420ms 시점)
      setIsJudgeEnergyFlying(false)
      setHitFlashingCardId(targetCreatorId)
      playSfx('audit-card-hit')

      // 3단계: 피격 크리에이터 스테미너 실시간 삭감
      setCreatorStaminaMap((prev) => {
        const cur = prev[targetCreatorId] ?? 100
        const next = Math.max(0, cur - attackDmg)
        return {
          ...prev,
          [targetCreatorId]: next,
        }
      })
    }, 420)

    // 4단계: 피격 모션 종료 및 턴 복귀 + 유저 행동 잠금 해제 (1000ms 시점)
    setTimeout(() => {
      setHitFlashingCardId(null)
      setIsJudgeTurn(false)
      setIsActionLocked(false) // 비로소 다음 유저 카드 제출 허용!
    }, 1000)
  }

  const triggerImpactParticle = (
    score: number,
    isMatched: boolean,
    _targetCreatorId?: string,
    nextPct?: number,
    isCrit = false,
    critMult = 1.0
  ) => {
    setLastScoreGained(score)
    playSfx('audit-judge-hit')
    setIsTypeMatchedHit(isMatched)
    setIsCriticalHit(isCrit)
    setCriticalMult(critMult)
    setShowImpactEffect(true)
    setIsHeartShaking(true)

    // 💬 심사관 만족도 반응 멘트 7개국어 픽업하여 말풍선 표시
    const currentPct = nextPct ?? Math.round((session.currentSatisfaction / session.targetSatisfaction) * 100)
    const reactionDialogueText = getJudgeReactionDialogue(currentPct, locale)
    setJudgeSpeechBubble({ text: reactionDialogueText, type: 'reaction' })

    // 220ms 심사관 심쿵 쿵쾅 무대 셰이크
    setTimeout(() => {
      setIsHeartShaking(false)
    }, 220)

    // 650ms 유혹 폭발 마무리 후 -> 만족도 채워짐 & 피격 파티클 감상 후 승급 성공 팝업 표출!
    setTimeout(() => {
      setShowImpactEffect(false)
      const currentPct = nextPct ?? Math.round((session.currentSatisfaction / session.targetSatisfaction) * 100)
      const isCompletedNow = session.isCompleted || session.currentSatisfaction >= session.targetSatisfaction || currentPct >= 100

      if (isCompletedNow) {
        // 🎉 피격 파티클과 만족도 100% 채워짐 연출을 감상하도록 750ms 뒤에 승급 성공 팝업 오픈!
        setTimeout(() => {
          setShowResultModal(true)
        }, 750)
      } else if (displayCreators.length > 0) {
        // 🎯 4인 덱 중 무작위 1명 크리에이터 픽업!
        const randIdx = Math.floor(Math.random() * displayCreators.length)
        const randomTarget = displayCreators[randIdx] || displayCreators[0]!
        setTimeout(() => {
          triggerJudgeCounterAttack(randomTarget.id)
        }, 1000) // 1초 딜레이 쉼표!
      } else {
        setIsActionLocked(false)
      }
    }, 650)
  }

  const handleCloseCutscene = () => {
    if (!canCloseCutscene) return
    setIsCutsceneModalOpen(false)
    setCanCloseCutscene(false)
    if (lastScoreGained !== null && lastPerformedCreator) {
      const nextPct = Math.round((session.currentSatisfaction / session.targetSatisfaction) * 100)
      triggerImpactParticle(
        lastScoreGained,
        isTypeMatchedHit,
        lastPerformedCreator.id,
        nextPct,
        isCriticalHit,
        criticalMult,
      )
    } else {
      setIsActionLocked(false)
    }
  }

  const [creatorStaminaMap, setCreatorStaminaMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    creators.forEach((c) => {
      map[c.id] = typeof (c as any).stamina === 'number' ? Math.max(0, Math.min(100, Math.round((c as any).stamina))) : 100
    })
    return map
  })

  // 🪫 제출 가능한 크리에이터 카드(스테미나 15 이상)가 0개인 경우 심사 실패 자동 종료
  useEffect(() => {
    if (
      !session.isCompleted &&
      !showResultModal &&
      !isActionLocked &&
      !isJudgeTurn &&
      !showCinematicIntro &&
      !isCutsceneModalOpen
    ) {
      const hasPlayableCard = displayCreators.some(
        (c) => (creatorStaminaMap[c.id] ?? 100) >= 15,
      )
      if (!hasPlayableCard) {
        setSession((prev) => ({
          ...prev,
          isCompleted: true,
          isSuccess: prev.currentSatisfaction >= prev.targetSatisfaction,
          failReason: 'no_cards',
        }))
        setShowResultModal(true)
      }
    }
  }, [
    session.isCompleted,
    showResultModal,
    isActionLocked,
    isJudgeTurn,
    showCinematicIntro,
    isCutsceneModalOpen,
    displayCreators,
    creatorStaminaMap,
  ])

  const currentSatisfactionPct = Math.round(
    (session.currentSatisfaction / session.targetSatisfaction) * 100,
  )
  const judgeDisplayMediaUrl =
    getJudgeSatisfactionMediaUrl(session.judge, currentSatisfactionPct) || session.judge.avatarUrl || null

  const judgeName = pickCharacterLocaleText(session.judge.names, locale, session.judge.name)

  const currentDemand = session.turnDemands[session.currentTurn - 1] ?? 'elegance'
  const currentDemandInfo = CREATOR_TYPE_LABEL[currentDemand]

  const handlePerform = (creator: RegisteredCreator) => {
    if (session.isCompleted || isJudgeTurn || isActionLocked) return
    const currentStamina = creatorStaminaMap[creator.id] ?? 100
    if (currentStamina < 15) {
      return // 스테미나 15 미만 시 퍼포먼스 제시 불가!
    }

    setShowActionGuide(false) // 조작 개시 시 가이드 해제
    setIsActionLocked(true) // 카드 선택 즉시 잠금 개시!
    playSfx('audit-card-perform')

    // ⚡ 퍼포먼스 1회 제출 당 스테미너 15 차감!
    setCreatorStaminaMap((prev) => {
      const cur = prev[creator.id] ?? 100
      const next = Math.max(0, cur - 15)
      return {
        ...prev,
        [creator.id]: next,
      }
    })

    setLastPerformedCreator(creator)
    const nextSession = submitTurnPerformance(
      session,
      {
        id: creator.id,
        name: creator.name,
        type: (creator as any).type || (creator as any).statType,
        statSexy: (creator as any).statSexy,
        statElegance: (creator as any).statElegance,
        statCommunication: (creator as any).statCommunication,
        statPerformance: (creator as any).statPerformance,
        stats: (creator as any).stats,
        statValue: (creator as any).statValue || (creator as any).power,
      },
      creator.grade ?? 'B',
      config?.auditConfig?.stageSettings[tier]?.judgeAttackMod ?? 1.0,
    )

    const lastResult = nextSession.history[nextSession.history.length - 1] ?? null
    const gained = lastResult ? lastResult.scoreGained : 20
    const matched = lastResult ? lastResult.typeMatched : false
    const isCrit = lastResult?.isCritical ?? false
    const critMult = lastResult?.criticalMultiplier ?? 1.0

    setIsCriticalHit(isCrit)
    setCriticalMult(critMult)

    setSession(nextSession)
    setSelectedCreatorId(null)

    // 카드를 클릭하여 제출 시, 중간 사이즈 미디어 추가 오버레이 팝업 띄우기
    const nextPct = Math.round((nextSession.currentSatisfaction / nextSession.targetSatisfaction) * 100)
    const nextMediaKey = nextPct >= 80 ? 'A' : nextPct >= 30 ? 'B' : 'C'
    const targetSlot = creator.auditMedia?.[nextMediaKey]
    const targetMedia = auditMediaSlotUrl(targetSlot)

    if (targetMedia) {
      setPopupCutsceneMediaUrl(targetMedia)
      setPopupCutsceneBlurRegions(resolveCutsceneBlur(targetSlot, targetMedia, events))
      setCanCloseCutscene(false)
      setIsCutsceneModalOpen(true)
      if (cutsceneHoldRef.current != null) window.clearTimeout(cutsceneHoldRef.current)
      cutsceneHoldRef.current = window.setTimeout(() => {
        cutsceneHoldRef.current = null
        setCanCloseCutscene(true)
      }, 2000)
      setLastScoreGained(gained)
      setIsTypeMatchedHit(matched)
    } else {
      triggerImpactParticle(gained, matched, creator.id, nextPct, isCrit, critMult)
    }
  }

  const handleFinish = () => {
    onComplete(session.isSuccess, session.staminaDeductions)
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-2 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex h-[97vh] w-[99vw] max-w-[1800px] flex-col overflow-hidden rounded-3xl border border-purple-500/50 bg-slate-950/95 shadow-[0_0_90px_rgba(168,85,247,0.35)]">
        {/* 카드 선택 탭 키프레임 */}
        <style>{`
          @keyframes cardDeckTap {
            0% {
              transform: translateY(0px) scale(1);
              opacity: 0.3;
            }
            30% {
              transform: translateY(-10px) scale(1.1);
              opacity: 1;
            }
            60% {
              transform: translateY(8px) scale(0.95);
              opacity: 1;
            }
            100% {
              transform: translateY(0px) scale(1);
              opacity: 0.3;
            }
          }
        `}</style>

        {/* ⚔️ 최상위 Z-INDEX (z-[120]) 심사관 반격 4칸 대각선 비행 혜성 투사체 (카드 정중앙 정밀 타격) */}
        {isJudgeEnergyFlying ? (
          <div className="pointer-events-none absolute inset-0 z-[120] flex items-center justify-center overflow-hidden bg-rose-950/20 backdrop-blur-xs">
            <div
              className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2"
              style={{
                animation: `flyingJudgeToSlot${targetSlotIdx} 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              }}
            >
              {/* 붉은 뇌전 빛 줄기 에너지 트레일 (이모지 100% 제거, 순수 빔 빛 줄기전용) */}
              <div className="relative flex flex-col items-center justify-center">
                {/* 붉은 혜성 빛 줄기 꼬리 트레일 */}
                <div className="h-44 w-3.5 rounded-full bg-gradient-to-t from-rose-500 via-red-600 to-transparent shadow-[0_0_50px_rgba(244,63,94,1)] animate-pulse" />
                {/* 혜성 머리 빔 코어 발광 (이모지 없음) */}
                <div className="relative -mt-4 h-7 w-7 rounded-full bg-rose-400 border-2 border-white shadow-[0_0_60px_rgba(244,63,94,1)] animate-ping" />
                <div className="absolute -bottom-1 h-5 w-5 rounded-full bg-white shadow-[0_0_40px_rgba(255,255,255,1)]" />
              </div>
            </div>

            {/* 카드 4칸 정중앙 타격 정밀 위치 계산 키프레임 */}
            <style>{`
              @keyframes flyingJudgeToSlot0 {
                0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(-35deg); opacity: 0.1; filter: blur(4px); }
                40% { opacity: 1; filter: blur(0px); }
                100% { top: 90%; left: calc(50% - 215px); transform: translate(-50%, -50%) scale(1.35) rotate(-20deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
              }
              @keyframes flyingJudgeToSlot1 {
                0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(-12deg); opacity: 0.1; filter: blur(4px); }
                40% { opacity: 1; filter: blur(0px); }
                100% { top: 90%; left: calc(50% - 72px); transform: translate(-50%, -50%) scale(1.35) rotate(-7deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
              }
              @keyframes flyingJudgeToSlot2 {
                0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(12deg); opacity: 0.1; filter: blur(4px); }
                40% { opacity: 1; filter: blur(0px); }
                100% { top: 90%; left: calc(50% + 72px); transform: translate(-50%, -50%) scale(1.35) rotate(7deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
              }
              @keyframes flyingJudgeToSlot3 {
                0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(35deg); opacity: 0.1; filter: blur(4px); }
                40% { opacity: 1; filter: blur(0px); }
                100% { top: 90%; left: calc(50% + 215px); transform: translate(-50%, -50%) scale(1.35) rotate(20deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
              }
              @media (min-width: 640px) {
                @keyframes flyingJudgeToSlot0 {
                  0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(-35deg); opacity: 0.1; filter: blur(4px); }
                  40% { opacity: 1; filter: blur(0px); }
                  100% { top: 90%; left: calc(50% - 245px); transform: translate(-50%, -50%) scale(1.4) rotate(-20deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
                }
                @keyframes flyingJudgeToSlot1 {
                  0% { top: 22%; left: 50%; transform: translate(-50%, -50%) scale(0.3) rotate(-12deg); opacity: 0.1; filter: blur(4px); }
                  40% { opacity: 1; filter: blur(0px); }
                  100% { top: 90%; left: calc(50% - 82px); transform: translate(-50%, -50%) scale(1.4) rotate(-7deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
                }
                @keyframes flyingJudgeToSlot2 {
                  0% { top: 22%; left: 50%; transform: scale(0.3) rotate(12deg); opacity: 0.1; filter: blur(4px); }
                  40% { opacity: 1; filter: blur(0px); }
                  100% { top: 90%; left: calc(50% + 82px); transform: translate(-50%, -50%) scale(1.4) rotate(7deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
                }
                @keyframes flyingJudgeToSlot3 {
                  0% { top: 22%; left: 50%; transform: scale(0.3) rotate(35deg); opacity: 0.1; filter: blur(4px); }
                  40% { opacity: 1; filter: blur(0px); }
                  100% { top: 90%; left: calc(50% + 245px); transform: translate(-50%, -50%) scale(1.4) rotate(20deg); opacity: 1; filter: drop-shadow(0 0 70px rgba(225,29,72,1)); }
                }
              }
            `}</style>
          </div>
        ) : null}

        {/* 제출 카드 클릭 시 띄워지는 중간 사이즈 컷씬 미디어 오버레이 모달 (클릭 시 닫히며 심사관 타격 파티클 터짐) */}
        {isCutsceneModalOpen && popupCutsceneMediaUrl ? (
          <div
            onClick={handleCloseCutscene}
            className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/88 p-4 transition-all ${
              canCloseCutscene ? 'cursor-pointer' : 'cursor-wait'
            }`}
          >
            <div className="relative aspect-[16/9] w-full max-w-2xl sm:max-w-3xl overflow-hidden rounded-3xl border-2 border-purple-400/60 bg-black shadow-[0_0_80px_rgba(168,85,247,0.5)]">
              <MosaicMediaFrame
                src={resolveMediaSrc(popupCutsceneMediaUrl)}
                kind={isVideoMediaUrl(popupCutsceneMediaUrl) ? 'video' : 'image'}
                regions={popupCutsceneBlurRegions}
                className="h-full w-full"
              />

              {/* 하단 닫기 안내 뱃지 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/80 px-4 py-1.5 text-xs font-black text-white shadow-xl backdrop-blur-md flex items-center gap-2">
                <span>
                  {canCloseCutscene
                    ? '🎭 퍼포먼스 컷씬 (클릭하여 닫기 ✕)'
                    : '🎭 퍼포먼스 컷씬'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
        {/* 상단 맘모스 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-purple-500/20 bg-purple-950/40 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-purple-400/40 bg-purple-900/60 px-3 py-1 text-xs font-black tracking-widest text-purple-200 uppercase">
              {stationGradeLabel(tier)} 승급 심사관
            </span>
            <h2 className="text-base font-black text-slate-100">{judgeName}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-slate-300">
              <span>TURN</span>
              <span className="text-amber-400 font-black tabular-nums">
                {session.currentTurn}
              </span>
            </div>
            {onClose && !session.isCompleted ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                닫기 ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* 중단 메인 비주얼 영역 (심사관 & 퍼포먼스 미디어 뷰어) */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950">
          {/* 심사관 프로필 / 스테이지 연출 */}
          <div className="relative flex flex-1 flex-col justify-between p-3 sm:p-4 min-h-0">
            {/* 퍼포먼스 미디어 컷씬 영역 (1280x720 HD 16:9 정밀 해상도 핏 & 심사관 심쿵 쿵쾅 셰이크 적용) */}
            <div
              className={`relative my-auto flex aspect-[16/9] w-full max-w-[1280px] max-h-[64vh] items-center justify-center overflow-hidden rounded-2xl border border-purple-500/40 bg-black shadow-2xl mx-auto transition-transform duration-75 ${
                isHeartShaking
                  ? 'scale-[1.04] translate-x-2 -translate-y-2 rotate-1 border-pink-500 ring-4 ring-pink-500/80 shadow-[0_0_110px_rgba(244,63,94,0.9)]'
                  : ''
              }`}
            >
              {/* 심사관 메인 화면 헤더 오버레이 (선호 타입 & 🔥 심사관을 만족시켜라! 7개국어 뱃지) */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-black/85 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
                <span className="rounded-full border border-amber-400 bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.5)] animate-pulse">
                  {getSatisfyJudgeTitle(locale)}
                </span>
                <span className="hidden sm:inline text-xs font-bold text-slate-300">| 선호:</span>
                <span
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black ${currentDemandInfo.tone}`}
                >
                  <span>{currentDemandInfo.icon}</span>
                  <span>{currentDemandInfo.label}</span>
                </span>
              </div>



              {/* 💬 심사관 VN (Visual Novel) 스타일 하단 대화창 코멘트 오버레이 */}
              {judgeSpeechBubble ? (
                <div className="absolute bottom-14 left-3 right-3 z-30 max-w-4xl mx-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
                  <div
                    className={`relative rounded-2xl border-2 p-3 sm:p-4 shadow-2xl backdrop-blur-md ${
                      judgeSpeechBubble.type === 'attack'
                        ? 'border-rose-500/90 bg-rose-950/95 shadow-[0_0_35px_rgba(244,63,94,0.7)]'
                        : 'border-purple-400/90 bg-slate-950/95 shadow-[0_0_35px_rgba(168,85,247,0.7)]'
                    }`}
                  >
                    {/* VN 대화창 네임플레이트 상단 헤더 */}
                    <div className="mb-1.5 flex items-center justify-between border-b border-white/15 pb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-black ${
                            judgeSpeechBubble.type === 'attack'
                              ? 'border-rose-400/60 bg-rose-900/70 text-rose-200'
                              : 'border-purple-400/60 bg-purple-900/70 text-purple-200'
                          }`}
                        >
                          {judgeSpeechBubble.type === 'attack' ? '⚔️ 심사관 반격!' : '⚖️ 심사평'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-100 tracking-wide">
                          {judgeName}
                        </span>
                      </div>
                      <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        🌐 {locale.toUpperCase()}
                      </span>
                    </div>

                    {/* VN 스타일 7개국어 대화 본문 */}
                    <p className="text-sm sm:text-base font-bold text-slate-100 leading-relaxed drop-shadow-md">
                      "{judgeSpeechBubble.text}"
                    </p>
                  </div>
                </div>
              ) : null}

              {/* 🎬 미디어 뷰어 (showCinematicIntro 일 때는 미디어 X, 까만 화면에 거대한 스케일 트윈 연출 표출!) */}
              {showCinematicIntro ? (
                <div className="flex h-full w-full aspect-[16/9] flex-col items-center justify-center bg-black p-4">
                  <div className="relative flex flex-col items-center justify-center text-center animate-in zoom-in-50 duration-500 ease-out">
                    <span className="text-6xl sm:text-8xl mb-3 animate-bounce drop-shadow-[0_0_35px_rgba(251,191,36,0.9)]">
                      ⚖️
                    </span>
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-[0_0_40px_rgba(251,191,36,0.95)] animate-pulse">
                      {getSatisfyJudgeTitle(locale)}
                    </h1>
                    <p className="mt-3 rounded-full border border-amber-400/40 bg-amber-950/80 px-4 py-1 text-xs font-bold text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                      {stationGradeLabel(tier)} PERFORMANCE AUDIT
                    </p>
                  </div>
                </div>
              ) : judgeDisplayMediaUrl ? (
                isVideoMediaUrl(judgeDisplayMediaUrl) ? (
                  <video
                    key={judgeDisplayMediaUrl}
                    src={resolveMediaSrc(judgeDisplayMediaUrl)}
                    width={1280}
                    height={720}
                    className="h-full w-full aspect-[16/9] object-contain border-0"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={resolveMediaSrc(judgeDisplayMediaUrl)}
                    alt={judgeName}
                    width={1280}
                    height={720}
                    className="h-full w-full aspect-[16/9] object-contain border-0"
                  />
                )
              ) : (
                <div className="flex h-full w-full aspect-[16/9] flex-col items-center justify-center bg-gradient-to-br from-purple-950 via-slate-950 to-indigo-950 text-5xl">
                  <span>⚖️</span>
                  <span className="mt-2 text-xs font-bold text-purple-200">1280 × 720 (16:9) 미디어 미등록</span>
                </div>
              )}

              {/* 영상 가장자리 외곽 검은 라인 & 그라데이션 페이드 오버레이 (무대 배경과 부드럽게 연결) */}
              <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] border border-black/60 rounded-2xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/70 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/70 to-transparent z-10" />

              {/* 🏆 승급심사 통과 성공 미디어 중앙 네온 순수 타이틀 오버레이 (7개국어 연동) */}
              {showResultModal && (session.isSuccess || session.currentSatisfaction >= session.targetSatisfaction) ? (
                <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-400/90 bg-slate-950/90 px-8 py-6 shadow-[0_0_90px_rgba(52,211,153,0.8)] text-center">
                    <span className="text-6xl sm:text-7xl animate-bounce mb-2 drop-shadow-[0_0_30px_rgba(52,211,153,0.9)]">
                      👑✨
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black text-emerald-300 tracking-tight drop-shadow-[0_0_30px_rgba(52,211,153,1)]">
                      {getAuditPassTitle(locale)}
                    </h3>
                  </div>
                </div>
              ) : null}

              {/* ❌ 승급심사 통과 실패 미디어 중앙 네온 타이틀 오버레이 (7개국어 연동) */}
              {showResultModal &&
              !session.isSuccess &&
              session.currentSatisfaction < session.targetSatisfaction ? (
                <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-rose-500/90 bg-slate-950/95 px-8 py-6 shadow-[0_0_90px_rgba(244,63,94,0.8)] text-center">
                    <span className="text-6xl sm:text-7xl animate-pulse mb-2 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]">
                      💔💥
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black text-rose-400 tracking-tight drop-shadow-[0_0_30px_rgba(244,63,94,1)]">
                      {getAuditFailTitle(locale)}
                    </h3>
                  </div>
                </div>
              ) : null}

              {/* 은은한 핑크/골드 하트 폭발 연출 (무 텍스트 & 파스텔 핑크 오버레이) */}
              {showImpactEffect && lastScoreGained !== null ? (
                <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden">
                  {/* 연하고 부드러운 핑크/골드 순간 플래시 */}
                  <div className="absolute inset-0 bg-pink-300/15 animate-out fade-out duration-150 z-50 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-amber-200/10 animate-out fade-out duration-200 z-40" />

                  {/* 하단 충격파 부드러운 핑크 링 */}
                  <div className="absolute h-[500px] w-[500px] rounded-full border-4 border-pink-300/50 shadow-[0_0_50px_rgba(244,114,182,0.4)] animate-ping duration-150" />

                  {/* 💖 💋 거대 하트 & 입술 파티클 (무 텍스트, 숫자만 표출) */}
                  <div className="relative flex flex-col items-center justify-center animate-in zoom-in-125 duration-100 ease-out">
                    <div className="relative flex items-center justify-center">
                      <span className="text-7xl sm:text-8xl animate-bounce drop-shadow-[0_0_25px_rgba(244,114,182,0.8)]">💖</span>
                      <span className="absolute -top-10 -right-14 text-6xl animate-ping drop-shadow-[0_0_20px_rgba(244,114,182,0.7)]">💋</span>
                      <span className="absolute -bottom-10 -left-14 text-6xl animate-pulse drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]">💕</span>
                      <span className="absolute top-8 -left-20 text-5xl animate-bounce">🔥</span>
                      <span className="absolute -top-12 left-8 text-5xl animate-pulse">✨</span>
                    </div>

                    {/* 영문 CRITICAL! 황금 빛 네온 타이틀 오버레이 */}
                    {isCriticalHit ? (
                      <div className="mb-2 flex flex-col items-center animate-bounce drop-shadow-[0_0_35px_rgba(251,191,36,1)]">
                        <span className="text-4xl sm:text-6xl font-black italic tracking-widest text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,1)] uppercase">
                          CRITICAL!
                        </span>
                        <span className="rounded-full border-2 border-amber-400 bg-amber-950/90 px-3.5 py-0.5 text-xs sm:text-sm font-black text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.9)] mt-1">
                          🔥 {criticalMult}x MULTIPLIER
                        </span>
                      </div>
                    ) : null}

                    {/* 무 텍스트 — 오직 순수 상승 수치 (+25) & 아이콘만 표출 */}
                    <div className="mt-2 flex flex-col items-center">
                      <div className="flex items-center gap-1.5 rounded-2xl border-2 border-pink-300/70 bg-black/85 px-5 py-2 shadow-[0_0_40px_rgba(244,114,182,0.5)] backdrop-blur-md">
                        <span className="text-4xl sm:text-5xl font-black tracking-tighter text-pink-300 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)]">
                          +{lastScoreGained}
                        </span>
                      </div>
                      {isTypeMatchedHit ? (
                        <span className="mt-1.5 rounded-full border border-pink-300/80 bg-pink-950/80 px-3 py-0.5 text-xs font-black text-amber-300 shadow-lg animate-pulse">
                          🔥 1.5x
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 하단 심사관 만족도 게이지 바 오버레이 (기존 설명 텍스트 제거 후 이동 배치) */}
              <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-purple-500/40 bg-black/85 p-2.5 backdrop-blur-md shadow-2xl">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">⚖️ 심사관 만족도</span>
                  </div>
                  <span className="font-black tabular-nums text-amber-300">
                    {session.currentSatisfaction} / {session.targetSatisfaction} 점 (
                    {Math.round((session.currentSatisfaction / session.targetSatisfaction) * 100)}%)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-300 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    style={{
                      width: `${Math.min(
                        100,
                        (session.currentSatisfaction / session.targetSatisfaction) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 4인 크리에이터 카드 드래그 앤 드롭 & 선택 덱 (완료 시 딤딩) */}
        <div
          className={`shrink-0 border-t border-purple-500/20 bg-slate-950/90 px-4 py-2.5 transition-all relative ${
            showResultModal ? 'pointer-events-none opacity-40 grayscale-[40%]' : ''
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (draggedCreatorId) {
              const target = displayCreators.find((c) => c.id === draggedCreatorId)
              if (target) handlePerform(target)
              setDraggedCreatorId(null)
            }
          }}
        >
          {/* 👆 핑거 카드 선택 가이드 (심사관 영상 바로 아래, 카드 선택 안내 문구 위치) */}
          {showActionGuide && !showCinematicIntro && !showResultModal ? (
            <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center">
              <div className="flex flex-col items-center animate-[cardDeckTap_1.4s_ease-in-out_infinite]">
                {/* 카드를 클릭하라는 탭 안내 뱃지 */}
                <div className="mb-1 flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-slate-950/95 px-4 py-1.5 shadow-[0_0_30px_rgba(251,191,36,0.95)] backdrop-blur-md">
                  <span className="text-xs sm:text-sm font-black text-amber-200 uppercase tracking-wider animate-pulse">
                    👇 아래 카드 중 하나를 선택하세요!
                  </span>
                </div>

                {/* 3D 핑거 클릭 손가락 아이콘 */}
                <div className="relative flex items-center justify-center">
                  <span className="text-5xl sm:text-6xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] filter drop-shadow-[0_0_25px_rgba(251,191,36,1)]">
                    👇
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* 오직 유저 카드 선택이 가능한 차례일 때만 카드 선택 가이드 라인 팝업! */}
          <div className="mb-2 text-center min-h-[28px] flex items-center justify-center">
            {!isActionLocked && !isJudgeTurn && !showCinematicIntro && !showResultModal ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-950/80 px-4 py-1 text-xs sm:text-sm font-black text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.35)] animate-pulse">
                {getSelectCardPrompt(locale)}
              </span>
            ) : isJudgeTurn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-950/80 px-4 py-1 text-xs sm:text-sm font-black text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-bounce">
                ⚔️ 심사관 반격 진행 중...
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-xl sm:max-w-2xl mx-auto">
            {displayCreators.map((creator) => {
              const rawType = creator.statType || (creator as any).type || (creator as any).primaryStat || 'elegance'
              const cType: CreatorType =
                rawType === 'sexy' || rawType === 'communication' || rawType === 'elegance' || rawType === 'performance'
                  ? rawType
                  : 'elegance'
              const typeInfo = CREATOR_TYPE_LABEL[cType]
              const isTypeMatched = cType === currentDemand
              const creatorGrade = creator.grade ?? 'B'
              const profileUrl = (creator as any).profileImageUrl || (creator as any).avatarUrl
              const currentStamina = creatorStaminaMap[creator.id] ?? 100
              const isStaminaExhausted = currentStamina < 15
              const isHitFlashing = hitFlashingCardId === creator.id
              const isCardDisabled = isStaminaExhausted || isJudgeTurn || isActionLocked || showResultModal

              return (
                <div
                  key={creator.id}
                  draggable={!isCardDisabled}
                  onDragStart={() => {
                    if (!isCardDisabled) setDraggedCreatorId(creator.id)
                  }}
                  onClick={() => {
                    if (!isCardDisabled) handlePerform(creator)
                  }}
                  style={
                    isHitFlashing
                      ? { animation: 'cctvCameraShake 600ms cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite' }
                      : undefined
                  }
                  className={`group relative aspect-[3/4] max-h-[155px] sm:max-h-[185px] flex flex-col justify-between overflow-hidden rounded-xl transition-all ${
                    isHitFlashing
                      ? 'border-rose-500 ring-4 ring-rose-500 shadow-[0_0_50px_rgba(244,63,94,1)] bg-rose-950 z-30'
                      : isCardDisabled
                      ? 'cursor-not-allowed border border-purple-900/40 opacity-40 grayscale-[30%]'
                      : selectedCreatorId === creator.id
                      ? 'cursor-pointer border-2 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_22px_rgba(251,191,36,0.38)] scale-[1.02]'
                      : isTypeMatched
                      ? 'cursor-pointer border-2 border-emerald-400 ring-4 ring-emerald-500/60 shadow-[0_0_35px_rgba(52,211,153,0.8)] scale-[1.02] hover:scale-[1.04]'
                      : 'cursor-pointer border border-purple-500/30 hover:border-purple-400 hover:scale-[1.03] hover:shadow-[0_0_18px_rgba(168,85,247,0.3)]'
                  }`}
                >
                  {/* CCTV 진상 카메라 지진 셰이크 키프레임 */}
                  <style>{`
                    @keyframes cctvCameraShake {
                      0% { transform: translate(0, 0) rotate(0deg) scale(1.08); }
                      10% { transform: translate(-14px, 10px) rotate(-8deg) scale(1.12); }
                      20% { transform: translate(14px, -12px) rotate(9deg) scale(1.08); }
                      30% { transform: translate(-12px, -8px) rotate(-7deg) scale(1.14); }
                      40% { transform: translate(12px, 10px) rotate(8deg) scale(1.09); }
                      50% { transform: translate(-10px, 8px) rotate(-6deg) scale(1.11); }
                      60% { transform: translate(10px, -8px) rotate(7deg) scale(1.08); }
                      70% { transform: translate(-8px, -6px) rotate(-4deg) scale(1.06); }
                      80% { transform: translate(8px, 6px) rotate(5deg) scale(1.04); }
                      90% { transform: translate(-4px, 4px) rotate(-2deg) scale(1.02); }
                      100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    }
                  `}</style>
                  {/* 3:4 프로필 미디어 배경 커버 */}
                  {profileUrl ? (
                    <img
                      src={resolveMediaSrc(profileUrl)}
                      alt={creator.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-xl font-bold text-purple-300">
                      <span>👤</span>
                      <span className="text-[10px]">{creator.name.slice(0, 2)}</span>
                    </div>
                  )}

                  {/* 🌟 심사관 만족 조건 충족 1.5배 아웃라인 글로우 오버레이 */}
                  {isTypeMatched && !isCardDisabled && !isHitFlashing ? (
                    <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-emerald-400/90 shadow-[inset_0_0_20px_rgba(52,211,153,0.6)] animate-pulse" />
                  ) : null}

                  {/* ⚔️ 심사관 피격 흔들림 & 붉은 번쩍임 핏빛 오버레이 (이모지 100% 제거) */}
                  {isHitFlashing ? (
                    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-rose-600/70 animate-pulse backdrop-blur-xs">
                      <span className="rounded-lg border-2 border-rose-300 bg-rose-950/90 px-2.5 py-1 text-xs sm:text-sm font-black text-rose-200 shadow-[0_0_25px_rgba(244,63,94,1)] drop-shadow">
                        -{lastDamageDealt}
                      </span>
                    </div>
                  ) : null}

                  {/* 상단 뱃지 오버레이 (S, A, B, C 단 1글자 프리미엄 네온 & 매칭) */}
                  <div className="relative z-10 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/80 to-transparent">
                    <span className={`rounded-md border px-2 py-0.5 text-xs sm:text-sm font-black italic tracking-widest backdrop-blur-xs ${getGradeBadgeStyle(creatorGrade)}`}>
                      {creatorGrade}
                    </span>
                    {isTypeMatched ? (
                      <span className="rounded bg-emerald-500/90 px-1.5 py-0.3 text-[9px] font-black text-white shadow-md animate-pulse">
                        🔥 1.5배!
                      </span>
                    ) : null}
                  </div>

                  {/* 스테미나 부족 제시 불가 레이어 */}
                  {isStaminaExhausted ? (
                    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-1 text-center backdrop-blur-xs">
                      <span className="text-base">🪫</span>
                      <span className="mt-0.5 text-[9px] font-black text-rose-400 leading-tight">
                        스테미나 부족
                      </span>
                      <span className="text-[8px] text-slate-400">제시 불가</span>
                    </div>
                  ) : null}

                  {/* 하단 캐릭터 프로필 & 타입 아이콘 & 스테미나 비주얼 게이지 바 */}
                  <div className="relative z-10 flex flex-col justify-end p-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-5 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="truncate text-xs font-black text-white drop-shadow-md">{creator.name}</h4>
                      <span
                        className={`flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-black shadow-md ${typeInfo.tone}`}
                        title={typeInfo.label}
                      >
                        <span>{typeInfo.icon}</span>
                      </span>
                    </div>

                    {/* 스테미나 실시간 프로그레스 게이지 바 */}
                    <div className="flex flex-col space-y-0.5 border-t border-white/10 pt-1">
                      <div className="flex items-center justify-between text-[8px] font-black text-amber-300">
                        <span>⚡ STAMINA</span>
                        <span className="tabular-nums font-bold text-slate-200">{currentStamina} / 100</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/15 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, currentStamina))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 👑 승급 심사 완료 독립 정중앙 게임 팝업 모달 (Arcade / Esports Game Style Result Modal) */}
        {showResultModal ? (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <div
              className={`relative flex w-full max-w-xl flex-col items-center overflow-hidden rounded-[2.5rem] border-2 p-6 sm:p-9 text-center shadow-[0_0_120px_rgba(0,0,0,0.9)] ${
                session.isSuccess
                  ? 'border-amber-400/90 bg-gradient-to-b from-slate-950 via-purple-950/70 to-slate-950 ring-2 ring-amber-400/40 shadow-[0_0_130px_rgba(251,191,36,0.6)]'
                  : 'border-rose-500/90 bg-gradient-to-b from-slate-950 via-rose-950/70 to-slate-950 ring-2 ring-rose-500/40 shadow-[0_0_130px_rgba(244,63,94,0.6)]'
              }`}
            >
              {/* 회전하는 광채 후광 라이트 링 */}
              <div
                className={`pointer-events-none absolute -top-32 h-96 w-96 rounded-full blur-3xl opacity-60 animate-pulse ${
                  session.isSuccess ? 'bg-amber-400/30' : 'bg-rose-500/30'
                }`}
              />

              {/* 상단 아케이드 헤더 뱃지 */}
              <div className="relative z-10 mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-black/80 px-5 py-1 text-xs font-black tracking-widest text-amber-300 uppercase shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>{session.isSuccess ? '✦ STAGE CLEARED ✦' : '✦ AUDIT FAILED ✦'}</span>
              </div>

              {/* 승급 성공 / 실패 16:9 미디어 컷씬 비주얼 */}
              {session.isSuccess && session.judge.successMediaUrl ? (
                <div className="relative z-10 mb-5 aspect-[16/9] w-full max-w-md overflow-hidden rounded-2xl border-2 border-amber-400/70 shadow-[0_0_50px_rgba(251,191,36,0.5)]">
                  {isVideoMediaUrl(session.judge.successMediaUrl) ? (
                    <video
                      src={resolveMediaSrc(session.judge.successMediaUrl)}
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={resolveMediaSrc(session.judge.successMediaUrl)}
                      alt="승급 성공"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ) : !session.isSuccess && session.judge.failMediaUrl ? (
                <div className="relative z-10 mb-5 aspect-[16/9] w-full max-w-md overflow-hidden rounded-2xl border-2 border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.5)]">
                  {isVideoMediaUrl(session.judge.failMediaUrl) ? (
                    <video
                      src={resolveMediaSrc(session.judge.failMediaUrl)}
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={resolveMediaSrc(session.judge.failMediaUrl)}
                      alt="승급 실패"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ) : null}

              {/* 대형 승리 타이틀 & 아이콘 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative flex items-center justify-center mb-1">
                  <span className="text-6xl sm:text-7xl animate-bounce drop-shadow-[0_0_40px_rgba(251,191,36,1)]">
                    {session.isSuccess ? '👑' : '💔'}
                  </span>
                  {session.isSuccess ? (
                    <span className="absolute -top-3 -right-6 text-4xl animate-pulse drop-shadow-[0_0_20px_rgba(251,191,36,1)]">
                      ✨
                    </span>
                  ) : null}
                </div>

                <h3
                  className={`text-3xl sm:text-5xl font-black italic tracking-tight drop-shadow-2xl ${
                    session.isSuccess
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-[0_0_35px_rgba(251,191,36,1)]'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-red-500 to-rose-300 drop-shadow-[0_0_35px_rgba(244,63,94,1)]'
                  }`}
                >
                  {session.isSuccess ? getAuditPassTitle(locale) : getAuditFailTitle(locale)}
                </h3>

                {/* 게임 스탯 카드 (Result Card) */}
                <div className="mt-4 w-full max-w-md rounded-2xl border border-white/15 bg-black/60 p-3.5 backdrop-blur-md shadow-xl text-left space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-bold">🏆 승급 등급</span>
                    <span className="font-black text-amber-300">
                      {stationGradeLabel(session.tier)} 등급
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-bold">⚖️ 전담 심사관</span>
                    <span className="font-bold text-slate-200">{judgeName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">🔥 최종 달성 만족도</span>
                    <span className="font-black tabular-nums text-emerald-400">
                      {session.currentSatisfaction} / {session.targetSatisfaction} 점 (
                      {Math.round((session.currentSatisfaction / session.targetSatisfaction) * 100)}%)
                    </span>
                  </div>
                </div>

                <p className="mt-4 max-w-md text-xs sm:text-sm font-bold text-slate-300 leading-relaxed drop-shadow">
                  {session.isSuccess
                    ? `축하합니다! ${judgeName} 심사관의 자격 심사를 통과하고 ${stationGradeLabel(
                        session.tier,
                      )} 등급으로 정식 승급하였습니다!`
                    : session.failReason === 'no_cards'
                    ? `제출 가능한 크리에이터 카드가 소진되었습니다. 스테미나를 회복한 후 재도전해 주세요.`
                    : `목표 만족도 달성에 실패하였습니다. 덱을 보강한 후 재도전해 주세요.`}
                </p>
              </div>

              {/* 3D 볼륨 게임 액션 버튼 */}
              <div className="relative z-10 mt-6 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleFinish}
                  className={`game-btn w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wider uppercase shadow-2xl transition-all active:scale-95 ${
                    session.isSuccess
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-2 border-yellow-200 shadow-[0_0_40px_rgba(251,191,36,0.85)] hover:scale-105 hover:shadow-[0_0_65px_rgba(251,191,36,1)]'
                      : 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white border-2 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.85)] hover:scale-105 hover:shadow-[0_0_65px_rgba(244,63,94,1)]'
                  }`}
                >
                  {session.isSuccess ? '🎉 승급 확정 및 계속하기' : '확인 및 재도전'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
