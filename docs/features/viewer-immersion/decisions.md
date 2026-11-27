# ⚖️ [viewer-immersion] Architecture Decision Records (ADR)

### [ADR-01] 마우스 유휴 대기 시간 2.5초 및 CSS 클래스 기반 페이드아웃 (2026-11-07)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 사진 감상 시 상단 헤더, 패딩 슬라이더, 개추 버튼 등이 화면을 가리는 문제를 해결하기 위해 UI 자동 숨김 기능이 필요함. 사용자가 사진을 보며 머무는 시간과 UI를 조작하기 위해 머뭇거리는 시간 사이의 최적 균형점이 필요했음.
- **결정 내용 (Decision)**:
  - 유휴 대기 시간을 `2500ms`(2.5초)로 확정
  - JS로 개별 요소의 인라인 스타일을 변경하는 대신, 최상위 컨테이너에 `.disagall-idle` 클래스를 부여하고 CSS `opacity: 0; pointer-events: none; transition: opacity 0.3s ease;`를 통해 부드럽고 가볍게 페이드아웃
  - 슬라이더 드래그나 헤더 호버 시에는 숨김을 유예하는 안전장치 마련
- **결과 및 트레이드오프 (Consequences)**: CSS 하드웨어 가속 트랜지션으로 렌더링 성능이 우수하고, 마우스 이동 감지 시 지연 없이 즉각 복원됨.

---

### [ADR-02] 수동 숨김(`H`) 및 브라우저 전체화면(`F`) 단축키 도입 (2026-11-07)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 2.5초를 기다리지 않고 즉시 사진만 깨끗하게 보고 싶거나, 브라우저 주소창/탭바까지 완전히 감춘 채 모니터 전체에 사진을 채우고 싶은 고급 사용자 요구사항 존재.
- **결정 내용 (Decision)**:
  - `H` (Hide UI): 수동으로 UI 표시 여부를 즉시 토글
  - `F` (Fullscreen): 브라우저 Fullscreen API(`requestFullscreen` / `exitFullscreen`) 호출
- **결과 및 트레이드오프 (Consequences)**: 단축키 직관성이 높고 기존 방향키(`←`/`→`/`↑`/`↓`), 개추(`R`), 확대 제스처와 충돌하지 않음.

---

### [ADR-03] 팝업창(`popup.html`) 자동 숨김 On/Off 옵션 제공 및 스토리지 연동 (2026-11-07)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: UI가 저절로 사라지는 동작을 선호하지 않고 UI가 항시 고정되어 있기를 원하는 사용자를 위한 설정 지원 필요.
- **결정 내용 (Decision)**:
  - `popup.html`에 토글 스위치 UI 추가
  - 스토리지 키 `autoHideUi`(기본값: `true`)를 정의하여 Chrome(`chrome.storage.sync`) 및 Userscript(`GM_storage`) 공통 지원
- **결과 및 트레이드오프 (Consequences)**: 사용자 취향에 맞게 자동 숨김을 끄더라도 수동 단축키(`H`)는 언제든 활용 가능하여 접근성을 보장함.

---

### [ADR-04] 마우스 이동(`mousemove`) 및 단축키(`H`) 전용 UI 복귀 정책 (2026-11-18)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 코드 감사(`REFACTOR-01`) 중 키보드 탐색(`←`/`→`, `↑`/`↓`, `R`, `F`)이나 클릭 시에도 UI가 다시 나타나야 하는지, 아니면 마우스를 움직이기 전까지는 숨김 상태를 유지해야 하는지 스펙-코드 간 트레이드오프가 식별됨.
- **결정 내용 (Decision)**:
  - 사용자가 마우스를 움직이지 않고 키보드(`←`/`→` 등)로 연속 사진을 감상하거나 클릭할 때는 몰입 방해를 막기 위해 UI 숨김 상태(`.disagall-idle` 및 수동 `.disagall-ui-hidden`)를 계속 유지함.
  - UI 복귀는 마우스 이동(`mousemove`), 슬라이더/헤더 조작, 또는 단축키 `H` 토글 시에만 수행하도록 `spec.md`를 역갱신 확정함.
- **결과 및 트레이드오프 (Consequences)**: 키보드만으로 연속 감상하는 동안 UI가 깜빡이며 시야를 가리지 않아 몰입감이 극대화되며, 마우스를 살짝 움직이면 즉시 UI가 복원됨.

---

### [ADR-05] UI 숨김 시 헤더·푸터 영역 회수 확장 및 사용자 여백·줌 고정 정책 (2026-11-19)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: UI가 자동(`.disagall-idle`) 또는 수동(`.disagall-ui-hidden`)으로 사라져도 `.disagall-header`(~52px)와 `.disagall-footer`(~38px)가 `flex` 높이를 계속 점유하고 `applyFittingAndPadding()`이 이를 차감해 상하 약 90px의 빈 검은 여백이 남았음. 반면 UI 숨김 시 사용자 설정 여백(`state.currentPadding`)까지 `0px`으로 풀면 큰 모니터에서 여백을 넓게(`50~60px`) 두고 감상하려는 사용자 의도가 2.5초마다 깨지는 문제가 있음.
- **결정 내용 (Decision)**:
  - **헤더·푸터 높이만 회수하고 사용자 설정 여백(`state.currentPadding`)은 유지**: UI 숨김 시 `headerHeight = 0`, `footerHeight = 0`으로 재계산해 사진 크기를 확장하되, `state.currentPadding`은 그대로 존중함(`0px` 설정 사용자는 완전 풀블리드, `24px` 등 설정 사용자는 일관된 테두리 여백 유지).
  - **절대 위치 오버레이 + 스테이지 안전 패딩 전환**: `.disagall-header`와 `.disagall-footer`를 `position: absolute`로 분리하고 `.disagall-stage`의 `padding-top`/`padding-bottom`을 UI 표시 상태(`headerHeight`/`footerHeight`)와 숨김 상태(`0px`)로 동적 전환하여, 여백 `0px`에서도 UI와 겹치지 않고 숨김 시 뷰포트 정중앙으로 부드럽게 확장됨.
  - **확대(`scale > 1.001`) 중 크기 고정**: 줌/드래그 중에는 UI 숨김/복귀 시 리피팅을 보류하여 팬 위치(`panX`, `panY`)가 틀어지지 않게 보호하고, 1.0배율 복귀(`resetZoom()` 또는 휠 축소) 시 현재 UI 상태에 맞춰 즉시 리피팅함.
- **결과 및 트레이드오프 (Consequences)**: 세로 사진 및 높이 제한 이미지의 화면 활용도와 몰입감이 극대화되며, 여백 설정과 확대 감상 안정성을 해치지 않음.

---

### [ADR-06] 전체화면 모드 UX 강화, 여백 0px 임시 전환 및 자동 전체화면 폴백 정책 (2026-11-19)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 기존 `F` 단축키 기반 전체화면은 상단 헤더에 시각적 버튼/상태 표시가 없고, 전체화면 진입 시에도 기존 여백(`24px` 등)과 UI가 남아 즉각적인 몰입감이 떨어졌음. 또한 팝업에서 "뷰어 열 때 자동 전체화면" 옵션을 켤 경우, 브라우저 보안 정책상 확장 프로그램 우클릭 컨텍스트 메뉴(`chrome.runtime.onMessage`)나 게시글 이동(`autoOpen`) 직후에는 페이지 내 User Gesture가 없어 `requestFullscreen()`이 차단됨.
- **결정 내용 (Decision)**:
  - **헤더 토글 버튼 및 `fullscreenchange` 동기화**: `.disagall-header-right`에 `#disagall-btn-fullscreen` 버튼을 추가하고, `document` `fullscreenchange` / `webkitfullscreenchange` 이벤트를 구독해 `F` 키·버튼·`ESC` 네이티브 해제 모두 일관되게 동기화.
  - **전체화면 시 여백 `0px` 임시 적용 + UI 즉시 숨김**: `state.isFullscreenMode === true` 동안 `state.currentPadding` 저장값은 건드리지 않고 피팅 계산에서만 임시 여백 `0px`을 사용하며 `hideUi(true)`로 UI를 즉시 숨김. 전체화면 해제 시 `state.currentPadding`과 UI를 원래대로 복원.
  - **팝업 `autoFullscreen` 설정 및 꽉 채움 폴백**: `popup.html`/`popup.js`에 `autoFullscreen`(기본 `false`) 토글을 추가하고 `openViewer()` 시 `requestFullscreen()`을 시도하되, 브라우저가 User Gesture 부재로 차단(reject)하면 `state.isFullscreenMode = true` 뷰어 꽉 채움(`여백 0px + UI 숨김`) 폴백을 즉시 적용하고 토스트로 `F` 키/버튼 OS 전체화면 전환을 안내함.
- **결과 및 트레이드오프 (Consequences)**: 유저스크립트 클릭/`V` 키 및 뷰어 내 `F`/버튼 조작에서는 즉시 OS 전체화면으로 진입하며, 확장 프로그램 우클릭·연속 게시글 이동 시에도 차단 에러 없이 동일한 꽉 찬 화면을 제공함.

---

### [ADR-07] 통합 스토리지 동기화, 비동기 초기화 지연 보정 및 `defaultPadding` 에코/삭제 방어 정책 (2026-11-23)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: `DEFECT-03` 추적(`Tracer A/B`) 결과, `src/extension.js`와 `src/userscript.js`가 `defaultPadding`을 개별 로드하고 `immersion_controller.js` `onChanged`가 `defaultPadding`을 무시하여 팝업→뷰어 실시간 리피팅이 단절됨. 또한 비동기 `chrome.storage.sync.get` 응답 전에 `openViewer()`가 먼저 실행되면 `defaultPadding` 리피팅 및 `autoFullscreen` 진입이 누락되고, 지연된 초기 `get`·역순 `onChanged`·슬라이더 디바운스 자기 에코가 사용자 조작을 덮어쓸 수 있었음.
- **결정 내용 (Decision)**:
  - **컨트롤러 단일 통합 (`Option A`)**: `src/extension.js`·`src/userscript.js`의 독립 `defaultPadding` 로드를 제거하고, `immersion_controller.js`의 `loadInitialSettings()`·`bindImmersionStorageListener()`에서 `defaultPadding`, `autoHideUi`, `autoFullscreen` 3개 키를 단일 `chrome.storage.sync.get`/`GM_getValue`/`onChanged`로 통합 관리해 `00_core_foundation` 단방향 레이어 규칙(`Entry -> Controllers -> UI -> State`)을 준수함.
  - **초기 지연 `get` 한정 소급 진입**: 지연된 초기 `storage.sync.get` 콜백에서만 아직 열려 있고 수동 `F` 조작(`hasUserToggledFullscreenInSession`)이 없는 세션에 `enterAutoFullscreenOnOpen()`을 소급 실행하며, 팝업 `onChanged` `autoFullscreen: true`는 다음 `openViewer()`부터 적용함.
  - **`defaultPadding` 클램핑·삭제 무시·자기 에코 방어**: `onChanged`의 `newValue === undefined` 삭제 이벤트는 `popup.js`와 동일하게 무시(현재 값 유지)하고, 유한 숫자는 `0~100` 정수로 클램핑하며, 슬라이더 드래그/디바운스 대기/역전된 자기 에코(`pendingSelfPaddingWrites`)·로컬 선편집·선도착 `onChanged`로부터 사용자 조작을 보호함.
- **결과 및 트레이드오프 (Consequences)**: 스토리지 IPC를 2회→1회로 축소하고 확장·유저스크립트·팝업 간 3개 설정 동기화 및 초기화 레이스 방어를 일원화함.

---

### [ADR-08] 전체화면 임시 0px 표시 동기화 및 슬라이더 조작 시 오버라이드 즉시 해제·저장 정책 (2026-11-27)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: `ADR-06`에서 전체화면 진입 시 `state.isFullscreenMode ? 0 : state.currentPadding`을 무조건 강제 적용했으나, 상단 헤더의 `#disagall-slider` UI는 활성화된 상태로 노출되어 사용자가 전체화면 중 슬라이더를 드래그해도 숫자·스토리지만 바뀌고 실제 사진 여백에는 반영되지 않는 UX 모순이 발생함.
- **결정 내용 (Decision)**:
  - **임시 `0px` 플래그 분리 (`state.isFullscreenPaddingZero`)**: 전체화면 진입 시 `state.isFullscreenPaddingZero = true`로 설정하여 `state.currentPadding`·스토리지를 훼손하지 않고 임시 `0px`을 적용하되, UI 표시는 `getEffectivePadding()`/`syncPaddingSliderUi()`로 실화면과 동일하게 `0` / `'0px'`로 동기화함.
  - **슬라이더 조작 시 즉시 오버라이드 해제·저장**: 전체화면 상태에서 사용자가 `#disagall-slider`를 조작(`applySliderPaddingInput`)하면 `state.isFullscreenPaddingZero = false`로 즉시 해제하여 조절한 여백을 실시간 리피팅하고 `defaultPadding` 스토리지에도 저장함(전체화면 해제 후 유지, 다음 전체화면 진입 시에는 다시 임시 `0px`으로 시작). 조작 없이 전체화면을 해제하면 기존 `state.currentPadding`으로 복원함.
- **결과 및 트레이드오프 (Consequences)**: 전체화면 진입 시 즉각적인 풀블리드 몰입감(`ADR-06`)을 유지하면서도, 전체화면 도중 여백 조절이 필요한 사용자의 슬라이더 조작과 화면 표시가 100% 일치함.
