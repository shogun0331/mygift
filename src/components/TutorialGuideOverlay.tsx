import { useState, useLayoutEffect } from 'react'
import { useTranslation } from '../locales/i18n'

export type TutorialStep =
  | 'scout_hire'
  | 'studio_assign'
  | 'nav_dashboard'
  | 'start_broadcast'
  | 'statement_confirm'
  | 'nav_creator_for_staff'
  | 'staff_scout_open'
  | 'staff_hire'
  | 'staff_assign'
  | 'nav_creator_for_sns'
  | 'sns_open_compose'
  | 'sns_post'

interface TutorialGuideOverlayProps {
  step: TutorialStep | null
  onSkip?: () => void
  onAutoAssignSlot?: () => void
  onAutoAssignStaff?: () => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialGuideOverlay({
  step,
  onSkip,
  onAutoAssignSlot,
  onAutoAssignStaff,
}: TutorialGuideOverlayProps) {
  const { t } = useTranslation()
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [slotRect, setSlotRect] = useState<TargetRect | null>(null)

  // Find target element rect based on current step
  useLayoutEffect(() => {
    if (!step) {
      setTargetRect(null)
      setSlotRect(null)
      return
    }

    const updateRects = () => {
      let selector = ''
      let slotSelector = ''

      if (step === 'scout_hire') {
        selector = '[data-tutorial="scout-hire-btn"]'
      } else if (step === 'studio_assign') {
        selector = '[data-tutorial="studio-hand-card-0"]'
        slotSelector = '[data-tutorial="studio-slot-0"]'
      } else if (step === 'nav_dashboard') {
        selector = '[data-tutorial="nav-tab-dashboard"]'
      } else if (step === 'start_broadcast') {
        selector = '[data-tutorial="start-broadcast-btn"]'
      } else if (step === 'statement_confirm') {
        selector = '[data-tutorial="statement-confirm-btn"]'
      } else if (step === 'nav_creator_for_staff') {
        selector = '[data-tutorial="nav-tab-creator"]'
      } else if (step === 'staff_scout_open') {
        selector = '[data-tutorial="staff-scout-btn"]'
      } else if (step === 'staff_hire') {
        selector = '[data-tutorial="staff-hire-btn"]'
      } else if (step === 'staff_assign') {
        selector = '[data-tutorial="staff-hand-card-0"]'
        slotSelector = '[data-tutorial="staff-slot-0"], [data-tutorial="studio-slot-0"]'
      } else if (step === 'nav_creator_for_sns') {
        selector = '[data-tutorial="nav-tab-creator"]'
      } else if (step === 'sns_open_compose') {
        selector = '[data-tutorial="sns-compose-btn"]'
      } else if (step === 'sns_post') {
        selector = '[data-tutorial="sns-post-btn"]'
      }

      if (selector) {
        const el = document.querySelector(selector)
        if (el) {
          const rect = el.getBoundingClientRect()
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          })
        }
      }

      if (slotSelector) {
        const slotEl = document.querySelector(slotSelector)
        if (slotEl) {
          const sRect = slotEl.getBoundingClientRect()
          setSlotRect({
            top: sRect.top,
            left: sRect.left,
            width: sRect.width,
            height: sRect.height,
          })
        }
      }
    }

    updateRects()
    const timer = setInterval(updateRects, 150)
    window.addEventListener('resize', updateRects)
    window.addEventListener('scroll', updateRects, true)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', updateRects)
      window.removeEventListener('scroll', updateRects, true)
    }
  }, [step])

  if (!step) return null

  // Guide texts mapped via i18n
  const stepInfoMap: Record<
    TutorialStep,
    { title: string; desc: string; targetLabel: string }
  > = {
    scout_hire: {
      title: t('tutorial.step1Title') || 'STEP 1: 크리에이터 영입',
      desc: t('tutorial.step1Desc') || '방송을 진행할 크리에이터를 영입하세요! 아래의 [영입] 버튼을 클릭하세요.',
      targetLabel: '영입하기',
    },
    studio_assign: {
      title: t('tutorial.step2Title') || 'STEP 2: 스튜디오 슬롯 배치',
      desc: t('tutorial.step2Desc') || '영입한 크리에이터 카드를 클릭하거나 드래그하여 스튜디오 1번 슬롯에 배치하세요!',
      targetLabel: '스튜디오에 배치',
    },
    nav_dashboard: {
      title: t('tutorial.step3Title') || 'STEP 3: 대시보드로 이동',
      desc: t('tutorial.step3Desc') || '배치가 완료되었습니다. 하단의 [DASHBOARD] 탭을 눌러 방송 관제실로 이동하세요!',
      targetLabel: '대시보드 이동',
    },
    start_broadcast: {
      title: t('tutorial.step4Title') || 'STEP 4: 첫 방송 시작',
      desc: t('tutorial.step4Desc') || '모든 준비가 완료되었습니다! [방송 시작] 버튼을 눌러 첫 방송을 진행하세요!',
      targetLabel: '방송 시작',
    },
    statement_confirm: {
      title: t('tutorial.step5Title') || 'STEP 5: 월간 정산 명세서 확인',
      desc: t('tutorial.step5Desc') || '첫 방송이 끝났습니다! 수익과 순이익을 확인하고 [확인] 버튼을 눌러 정산을 완료하세요.',
      targetLabel: '정산 확인',
    },
    nav_creator_for_staff: {
      title: t('tutorial.step6Title') || 'STEP 6: 크리에이터 관리 탭 이동',
      desc: t('tutorial.step6Desc') || '스탭 고용과 SNS 관리를 위해 하단의 [CREATOR] 탭을 클릭하세요!',
      targetLabel: 'CREATOR 탭',
    },
    staff_scout_open: {
      title: t('tutorial.step7Title') || 'STEP 7: 스탭 영입 제안 확인',
      desc: t('tutorial.step7Desc') || '방송을 든든하게 서포트해줄 전문 스탭을 영입해보세요! [스탭 제안] 버튼을 누르세요.',
      targetLabel: '스탭 제안 확인',
    },
    staff_hire: {
      title: t('tutorial.step8Title') || 'STEP 8: 스탭 고용 계약',
      desc: t('tutorial.step8Desc') || '스탭의 직무 특성과 연봉 조건을 확인하고 [영입하기] 버튼을 누르세요!',
      targetLabel: '스탭 영입하기',
    },
    staff_assign: {
      title: t('tutorial.stepStaffAssignTitle') || 'STEP 9: 스탭 업무 배치',
      desc: t('tutorial.stepStaffAssignDesc') || '영입한 전문 스탭을 스튜디오 1번 슬롯에 배치하여 크리에이터의 방송을 서포트하세요!',
      targetLabel: '스탭 배치하기',
    },
    nav_creator_for_sns: {
      title: t('tutorial.stepNavCreatorForSnsTitle') || 'STEP 10: 크리에이터 탭 이동',
      desc: t('tutorial.stepNavCreatorForSnsDesc') || '스탭 배치가 완료되었습니다! 이제 SNS 홍보를 위해 하단의 [CREATOR] 탭을 클릭하세요.',
      targetLabel: 'CREATOR 탭',
    },
    sns_open_compose: {
      title: t('tutorial.step9Title') || 'STEP 11: 크리에이터 SNS 열기',
      desc: t('tutorial.step9Desc') || 'SNS 구독자가 늘어나면 방송 시청자 유입과 수익이 크게 증가합니다! 크리에이터의 [📱 SNS] 버튼을 클릭하세요.',
      targetLabel: 'SNS 피드 열기',
    },
    sns_post: {
      title: t('tutorial.step10Title') || 'STEP 12: SNS 게시물 포스팅',
      desc: t('tutorial.step10Desc') || '새로운 사진과 일상을 포스팅하여 구독자를 늘려보세요! 하단의 [📷 포스팅] 버튼을 누르세요.',
      targetLabel: '게시물 포스팅',
    },
  }

  const stepInfo = stepInfoMap[step]

  // Calculate position for dialog box
  const getDialogStyle = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    if (
      step === 'nav_dashboard' ||
      step === 'nav_creator_for_staff' ||
      step === 'nav_creator_for_sns'
    ) {
      return {
        bottom: `${window.innerHeight - targetRect.top + 20}px`,
        left: `${Math.max(20, Math.min(window.innerWidth - 380, targetRect.left - 100))}px`,
      }
    }

    if (step === 'start_broadcast') {
      return {
        bottom: `${window.innerHeight - targetRect.top + 20}px`,
        right: '24px',
      }
    }

    if (step === 'statement_confirm') {
      return {
        bottom: `${window.innerHeight - targetRect.top + 20}px`,
        right: `${Math.max(20, window.innerWidth - targetRect.left - targetRect.width)}px`,
      }
    }

    if (step === 'sns_post') {
      return {
        bottom: `${window.innerHeight - targetRect.top + 30}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }

    if (step === 'studio_assign' || step === 'staff_assign') {
      return {
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }

    if (step === 'staff_hire') {
      return {
        bottom: `${window.innerHeight - targetRect.top + 20}px`,
        right: '40px',
      }
    }

    if (step === 'sns_open_compose' || step === 'staff_scout_open') {
      // Place dialog box to the LEFT of the button so it never covers it
      return {
        top: `${Math.max(20, Math.min(window.innerHeight - 200, targetRect.top - 40))}px`,
        right: `${Math.max(20, window.innerWidth - targetRect.left + 35)}px`,
      }
    }

    if (step === 'scout_hire') {
      return {
        bottom: `${window.innerHeight - targetRect.top + 25}px`,
        right: `${Math.max(20, window.innerWidth - targetRect.left - targetRect.width)}px`,
      }
    }

    // Default positioning with smart collision avoidance
    if (targetRect.top > 200) {
      return {
        top: `${targetRect.top - 165}px`,
        left: `${Math.max(20, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 170))}px`,
      }
    }
    return {
      top: `${targetRect.top + targetRect.height + 35}px`,
      left: `${Math.max(20, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 170))}px`,
    }
  }

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none select-none font-sans overflow-hidden">
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7), 0 0 25px rgba(236, 72, 153, 0.9);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(236, 72, 153, 0), 0 0 45px rgba(236, 72, 153, 1);
          }
        }
        @keyframes tutorialHandTap {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          40% {
            transform: translate(0, 10px) scale(0.9);
          }
          60% {
            transform: translate(0, 2px) scale(0.95);
          }
          80% {
            transform: translate(0, 10px) scale(0.9);
          }
        }
        @keyframes tutorialAssignGesture {
          0% {
            opacity: 0;
            transform: translate(var(--start-x), var(--start-y)) scale(1.1);
          }
          15% {
            opacity: 1;
            transform: translate(var(--start-x), var(--start-y)) scale(0.95);
          }
          30% {
            transform: translate(var(--start-x), var(--start-y)) scale(0.9);
          }
          75% {
            transform: translate(var(--end-x), var(--end-y)) scale(0.95);
          }
          85% {
            opacity: 1;
            transform: translate(var(--end-x), var(--end-y)) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--end-x), var(--end-y)) scale(1.2);
          }
        }
        @keyframes rippleRing {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
      `}</style>

      {/* 4-piece Blocking Backdrop (leaves hole open for targetRect, transparent to drag events during studio_assign & staff_assign) */}
      {targetRect ? (
        <>
          {/* Top block */}
          <div
            className={`fixed top-0 left-0 right-0 bg-black/30 transition-all duration-200 ${
              step === 'studio_assign' || step === 'staff_assign' ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{ height: `${Math.max(0, targetRect.top)}px` }}
          />
          {/* Bottom block */}
          <div
            className={`fixed left-0 right-0 bottom-0 bg-black/30 transition-all duration-200 ${
              step === 'studio_assign' || step === 'staff_assign' ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{
              top: `${Math.min(window.innerHeight, targetRect.top + targetRect.height)}px`,
            }}
          />
          {/* Left block */}
          <div
            className={`fixed left-0 bg-black/30 transition-all duration-200 ${
              step === 'studio_assign' || step === 'staff_assign' ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{
              top: `${targetRect.top}px`,
              height: `${targetRect.height}px`,
              width: `${Math.max(0, targetRect.left)}px`,
            }}
          />
          {/* Right block */}
          <div
            className={`fixed right-0 bg-black/30 transition-all duration-200 ${
              step === 'studio_assign' || step === 'staff_assign' ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{
              top: `${targetRect.top}px`,
              height: `${targetRect.height}px`,
              left: `${Math.min(window.innerWidth, targetRect.left + targetRect.width)}px`,
            }}
          />

          {/* Glowing Target Ring Hole */}
          <div
            className="fixed rounded-xl pointer-events-none ring-4 ring-pink-500 transition-all duration-200"
            style={{
              top: `${targetRect.top - 3}px`,
              left: `${targetRect.left - 3}px`,
              width: `${targetRect.width + 6}px`,
              height: `${targetRect.height + 6}px`,
              animation: 'tutorialPulse 1.8s infinite ease-in-out',
            }}
          />
        </>
      ) : (
        /* Full Backdrop when rect not found yet */
        <div
          className={`fixed inset-0 bg-black/30 ${
            step === 'studio_assign' || step === 'staff_assign' ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        />
      )}

      {/* Interactive Hole for Studio/Staff Placement: Allow Clicking Target & Slot */}
      {(step === 'studio_assign' || step === 'staff_assign') && slotRect && (
        <div
          className="fixed rounded-xl pointer-events-none ring-4 ring-yellow-400 z-10 transition-all duration-200"
          style={{
            top: `${slotRect.top - 3}px`,
            left: `${slotRect.left - 3}px`,
            width: `${slotRect.width + 6}px`,
            height: `${slotRect.height + 6}px`,
            animation: 'tutorialPulse 1.8s infinite ease-in-out',
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded shadow whitespace-nowrap">
            {step === 'staff_assign'
              ? t('tutorial.stepStaffSlotBadge') || '🎯 1번 슬롯 (스탭을 여기에 배치)'
              : t('tutorial.step2SlotBadge') || '🎯 1번 슬롯 (여기에 드래그 또는 클릭)'}
          </div>
        </div>
      )}

      {/* Guide Dialog Box */}
      <div
        className="fixed z-[9995] w-[380px] max-w-[calc(100vw-32px)] rounded-2xl border-2 border-pink-500/80 bg-slate-950/95 p-4 shadow-[0_0_35px_rgba(236,72,153,0.4)] backdrop-blur-md pointer-events-auto transition-all duration-300 animate-in fade-in zoom-in-95"
        style={getDialogStyle()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-pink-500/30 pb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-pink-500 animate-ping" />
            <span className="text-xs font-black tracking-wider text-pink-400 uppercase truncate">
              {stepInfo.title}
            </span>
          </div>
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 whitespace-nowrap text-[10px] font-bold text-slate-400 hover:text-slate-200 underline decoration-slate-600 transition-colors"
            >
              {t('tutorial.skip') || '튜토리얼 건너뛰기'}
            </button>
          ) : null}
        </div>

        <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-200">
          {stepInfo.desc}
        </p>

        {step === 'studio_assign' && onAutoAssignSlot && (
          <button
            type="button"
            onClick={onAutoAssignSlot}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {t('tutorial.step2AutoBtn') || '👉 원클릭으로 1번 슬롯에 자동 배치하기'}
          </button>
        )}

        {step === 'staff_assign' && onAutoAssignStaff && (
          <button
            type="button"
            onClick={onAutoAssignStaff}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            {t('tutorial.stepStaffAssignAutoBtn') || '👉 원클릭으로 1번 슬롯에 스탭 자동 배치하기'}
          </button>
        )}
      </div>

      {/* Animated Finger Pointer & Motion */}
      {targetRect && (
        <>
          {(step === 'studio_assign' || step === 'staff_assign') && slotRect ? (
            /* Studio Drag/Move Gesture from Card to Slot */
            <div
              className="fixed pointer-events-none z-[9999]"
              style={
                {
                  '--start-x': `${targetRect.left + targetRect.width / 2 - 24}px`,
                  '--start-y': `${targetRect.top + targetRect.height / 2 - 24}px`,
                  '--end-x': `${slotRect.left + slotRect.width / 2 - 24}px`,
                  '--end-y': `${slotRect.top + slotRect.height / 2 - 24}px`,
                  animation: 'tutorialAssignGesture 2.4s infinite cubic-bezier(0.4, 0, 0.2, 1)',
                } as any
              }
            >
              <div className="relative flex items-center justify-center">
                {/* Ripple Wave */}
                <div className="absolute h-16 w-16 rounded-full border-2 border-pink-400 bg-pink-500/20" />
                {/* 3D Hand Icon */}
                <span className="text-4xl filter drop-shadow-[0_0_12px_rgba(236,72,153,0.9)]">
                  👆
                </span>
              </div>
            </div>
          ) : (
            /* Standard Tap Pointer on Button */
            <div
              className="fixed pointer-events-none z-[9999] transition-all duration-200"
              style={{
                top: `${targetRect.top + targetRect.height / 2 + 10}px`,
                left: `${targetRect.left + targetRect.width / 2 - 24}px`,
                animation: 'tutorialHandTap 1.5s infinite ease-in-out',
              }}
            >
              <div className="relative flex flex-col items-center">
                {/* Ripple Wave at fingertip */}
                <div
                  className="absolute -top-3 h-10 w-10 rounded-full border-2 border-pink-400 bg-pink-500/30"
                  style={{ animation: 'rippleRing 1.5s infinite cubic-bezier(0.1, 0.8, 0.3, 1)' }}
                />
                {/* Pointing Finger */}
                <span className="text-4xl filter drop-shadow-[0_0_14px_rgba(236,72,153,0.95)]">
                  👆
                </span>
                <span className="mt-1 rounded-full bg-pink-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(236,72,153,0.8)] border border-pink-300/60">
                  CLICK!
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
