# Verification & Defect Log - Post Recommend

### [DEFECT-REC-01] 추천 1회 실행 시 디시인사이드 "추천은 1일 1회만 가능합니다" 알림 발생
- **현재 상태**: 🟢 RESOLVED (수정 완료)
- **발생 위치**: `content.js` 내 `dispatchRecommendClick(btn)`
- **증상**: 
  - 뷰어 내에서 단축키 `R` 또는 [개추] 버튼을 한 번만 눌렀음에도 디시인사이드에서 `"추천은 1일 1회만 가능합니다"` 알림 팝업이 뜨며 추천이 거부되거나 경고가 노출됨.
- **근본 원인**:
  - `dispatchRecommendClick(btn)` 내부에서 `btn.click()` 실행 후 바로 다음 줄에서 `btn.dispatchEvent(mouseEvt)`를 무조건 순차 실행하는 2중 디스패치 구조였음.
  - 이로 인해 이벤트 리스너가 수 마이크로초 간격으로 2회 연속 트리거되어 디시 내부의 1일 1회 중복 방지 방어벽에 걸림.
- **해결 내역**:
  - `btn.click()` 실행 후 성공 시 즉시 `return true`로 종료.
  - 네이티브 클릭이 실패하거나 지원되지 않는 환경에서만 `dispatchEvent`를 fallback으로 단일 실행하도록 변경.
  - `tests/recommend.test.js`에 [Test 7: Single-dispatch 검증] 추가 및 100% 통과.

---

### [DEFECT-REC-02] 미추천 게시글인데도 "이미 추천을 했다"고 뜨며 추천 실행이 차단되는 현상
- **현재 상태**: 🟢 RESOLVED (수정 완료)
- **발생 위치**: `content.js` 내 `triggerPostRecommend()`의 `isAlreadyVoted` 검사 로직
- **증상**:
  - 사용자가 해당 글에 추천을 누른 적이 전혀 없는데도 뷰어에서 `R` 키나 버튼을 누르면 "이미 개념글 추천을 완료한 게시글입니다. 👍" 토스트가 뜨며 실제 추천이 실행되지 않음.
  - 뷰어를 닫고 디시 웹페이지의 추천 버튼을 직접 클릭하면 정상적으로 추천이 반영됨.
- **근본 원인**:
  - 디시인사이드 데스크톱 실제 마크업(`<button type="button" class="btn_recom_up on">`) 분석 결과, 디시 데스크톱 본문 추천 버튼에는 **처음부터 기본 클래스로 `on`이 포함**되어 있음.
  - 기존 로직의 `const isAlreadyVoted = btn.classList.contains('on') || ...` 사전 가드에 의해 모든 미추천 글이 이미 추천된 글로 오판단되어 조기 리턴됨.
- **해결 내역**:
  - 사전 `isAlreadyVoted` 검사식에서 `btn.classList.contains('on')` 가드 제거.
  - 세션 기반 플래그 `hasVotedCurrentPost`를 도입하여, 현재 글에서 추천 후 카운트가 실제로 증가했을 때(`afterCount > beforeCount`)에만 추천 완료 상태로 전환.
  - 뷰어 오픈(`openViewer`) 시 아직 투표하지 않은 글에 대해 버튼의 `voted` 클래스를 리셋.
  - `tests/recommend.test.js`의 `dc_sample.html` 통합 검증([Test 6]) 및 단위 검증([Test 3])을 통해 클래스 `on`이 있어도 미추천 상태에서 정상 디스패치됨을 확인.
