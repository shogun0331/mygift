/** 알림(신규 스카우트/영입 제안)이 있음을 알리는 빨간 점 배지.
 * 부모 버튼 위에 absolute로 얹혀지며, 클릭은 부모 버튼의 onClick으로 전달된다.
 * 확산 링 + 글로우 펄스 + 하이라이트 스캔으로 시선을 끈다. */
export function RedDot({
  label,
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={`pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex h-3 w-3 items-center justify-center ${className}`}
    >
      {/* 바깥으로 퍼져나가는 링 ×2 (교차) */}
      <span className="red-dot-ring" />
      <span className="red-dot-ring red-dot-ring-delay" />
      {/* 하이라이트 스캔 (ping) */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-200 opacity-70" />
      {/* 본체 */}
      <span className="red-dot-core" />
    </span>
  )
}
