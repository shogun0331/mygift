// ── 스탭 스카우트 월말 생성 로직 시뮬레이션 (신규/로드 시나리오)
// 결정적 테스트를 위해 Math.random 고정 (성공 < 0.5 유지)
const origRandom = Math.random
Math.random = () => 0.1

const state = {
  staffScoutCooldown: 3, // 신규 게임 초기값 (로드 시 세이브 값)
  staffScoutAvailable: false,
  scoutedStaffCandidate: null,
  hiredStaffIds: [],
}
const registeredStaff = [{ id: 's1' }, { id: 's2' }] // 등록 스탭 풀

function monthEnd() {
  // finishBroadcastMonth 내부 로직 복제
  if (!state.staffScoutAvailable && !state.scoutedStaffCandidate) {
    const next = Math.max(0, state.staffScoutCooldown - 1)
    if (next === 0) {
      const pool = registeredStaff.filter((s) => !state.hiredStaffIds.includes(s.id))
      if (pool.length > 0) {
        const isFirstStaff = state.hiredStaffIds.length === 0
        const success = isFirstStaff || Math.random() < 0.5
        if (success) {
          state.staffScoutAvailable = true
          state.staffScoutCooldown = 0
        } else {
          state.staffScoutCooldown = 3
        }
      } else {
        state.staffScoutCooldown = 3
      }
    } else {
      state.staffScoutCooldown = next
    }
  }
}

let failed = false
const check = (cond, label) => { if (!cond) failed = true; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`) }

// 신규 게임: 3개월 후 첫 스탭 등장
for (let m = 1; m <= 5; m++) {
  monthEnd()
  console.log(`  month ${m}: available=${state.staffScoutAvailable} cooldown=${state.staffScoutCooldown}`)
}
check(state.staffScoutAvailable === true, '신규 게임 5개월 내 첫 스탭 오퍼 등장')

// 오퍼 유지 확인 (영입 전까지)
for (let m = 1; m <= 4; m++) {
  monthEnd()
}
check(state.staffScoutAvailable === true, '미영입 시 오퍼 유지')

// 스카우트 클릭 → 후보 등장, 다음 달도 유지
state.staffScoutAvailable = false
state.scoutedStaffCandidate = { id: 's1', proposedHireCost: 15000, proposedSalary: 20000 }
state.staffScoutCooldown = 3
for (let m = 1; m <= 6; m++) monthEnd()
check(state.scoutedStaffCandidate != null, '후보 대기 중 새 오퍼 미생성(영입 전 유지)')

// 영입 → 쿨다운 3 후 재등장
state.scoutedStaffCandidate = null
state.hiredStaffIds = ['s1']
state.staffScoutCooldown = 3
for (let m = 1; m <= 4; m++) monthEnd()
check(state.staffScoutAvailable === true, '영입 후 4개월 내 다음 스탭 오퍼 등장')

// 거절 → 후보 정리 + 쿨다운 3 → 새 후보 등장 (회귀 수정 검증)
state.staffScoutAvailable = false
state.scoutedStaffCandidate = { id: 's2', proposedHireCost: 15000, proposedSalary: 20000 }
state.staffScoutCooldown = 3
// handleStaffScoutPass() 동작 복제
state.scoutedStaffCandidate = null
state.staffScoutCooldown = 3
for (let m = 1; m <= 4; m++) monthEnd()
check(state.staffScoutAvailable === true, '거절 후 4개월 내 새 스탭 오퍼 등장')

process.exit(failed ? 1 : 0)
