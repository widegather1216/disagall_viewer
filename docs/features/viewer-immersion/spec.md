# 📜 [viewer-immersion] Full-Stack Specification

## 1. 데이터 모델 및 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- `CONFIG.DEFAULT_PADDING`: `24`
- `CONFIG.STORAGE_KEY_PADDING`: `'defaultPadding'`
- `CONFIG.STORAGE_KEY_AUTO_OPEN`: `'disagall_auto_open'`
- `CONFIG.UI_IDLE_TIMEOUT`: `2500` (ms, 마우스 유휴 판단 대기 시간)
- `CONFIG.STORAGE_KEY_AUTO_HIDE_UI`: `'autoHideUi'` (boolean, 기본값 `true`)
- `CONFIG.STORAGE_KEY_AUTO_FULLSCREEN`: `'autoFullscreen'` (boolean, 기본값 `false`)
- `state.idleTimer`: `NodeJS.Timeout | number | null` (마우스 유휴 타이머 ID)
- `state.autoHideUi`: `boolean` (설정 저장소에서 로드된 자동 숨김 활성화 여부, 기본 `true`)
- `state.autoFullscreen`: `boolean` (뷰어 열 때 자동 전체화면 설정 여부, 기본 `false`)
- `state.isUiHidden`: `boolean` (현재 수동 UI 숨김 상태 여부 플래그, 기본 `false`)
- `state.isFullscreenMode`: `boolean` (OS 전체화면 또는 `autoFullscreen` 폴백 꽉 채움 활성 상태, 기본 `false`)
- `state.elements.stageEl`: `HTMLElement | null` (`#disagall-stage` 캐시 참조)
- `state.elements.fullscreenBtnEl`: `HTMLButtonElement | null` (`#disagall-btn-fullscreen` 캐시 참조)
- **UI 숨김 연동 동적 피팅 (`src/ui/overlay.js`, `content.css`)**:
  - `applyFittingAndPadding()`에서 `isUiHiddenState(overlayEl)` 검사 후 UI 숨김 상태(`.disagall-idle` / `.disagall-ui-hidden` / `state.isUiHidden`)이면 `headerHeight = 0`, `footerHeight = 0`으로 확장 계산 (`state.currentPadding`은 그대로 유지)
  - `.disagall-header` (`position: absolute; top: 0; left: 0;`) 및 `.disagall-footer` (`position: absolute; bottom: 0; left: 0;`)를 오버레이 배치하고, `.disagall-stage`에 `height: 100%; transition: padding-top 0.25s ease, padding-bottom 0.25s ease;` 및 동적 `paddingTop`/`paddingBottom` 적용
- **줌 연동 보호 (`src/controller/immersion_controller.js`, `src/ui/zoom_pan.js`)**:
  - `showUi()` / `hideUi()` 상태 전이 시 `state.zoom.scale <= 1.001`일 때만 `applyFittingAndPadding()` 호출 (확대 중 크기 고정)
  - `resetZoom()` 및 휠 축소로 `1.0x` 복귀 시 `applyFittingAndPadding()` 호출하여 현재 UI 상태에 맞춰 즉시 리피팅
- **전체화면 모드 & 자동 진입 폴백 (`popup.html`, `popup.js`, `overlay.js`, `immersion_controller.js`, `viewer_controller.js`)**:
  - 헤더 `#disagall-btn-fullscreen` 버튼 + `F` 단축키 + `fullscreenchange`/`webkitfullscreenchange` 동기화
  - `state.isFullscreenMode === true` 동안 `state.currentPadding` 저장값을 훼손하지 않고 임시 `effectivePadding = 0` 및 `hideUi(true)` 적용, 해제 시 원래 여백 및 UI 복구
  - `openViewer()` 시 `state.autoFullscreen === true`이면 `requestFullscreen()` 시도 및 차단 시 `0px`+UI 숨김 폴백 적용 + 토스트 안내

### 🟡 [To-Be 신규/마이그레이션 대상]
- 현재 예정된 추가 변경사항 없음

## 2. 저장소 및 통신 계약 (Storage & Communication Contracts)
- **Chrome Extension Storage**:
  - 키: `autoHideUi`, `autoFullscreen`
  - 읽기: `chrome.storage.sync.get({ autoHideUi: true, autoFullscreen: false }, callback)`
  - 쓰기: `chrome.storage.sync.set({ autoHideUi: value })`, `chrome.storage.sync.set({ autoFullscreen: value })`
- **Tampermonkey / Userscript Storage**:
  - 읽기: `GM_getValue('autoHideUi', true)`, `GM_getValue('autoFullscreen', false)`
  - 쓰기: `GM_setValue('autoHideUi', value)`
- **동기화 시점**: 뷰어 초기화 시 스토리지 값을 읽어 `state.autoHideUi`·`state.autoFullscreen`에 저장. 팝업에서 변경 시 `onChanged`로 실시간 동기화.

## 3. 클라이언트 상태 계약 (Client State & Lifecycle)
- **`resetIdleTimer()`**:
  1. `state.idleTimer` 존재 시 `clearTimeout` 호출
  2. `mousemove` 또는 슬라이더 조작 등으로 호출되며, UI가 숨겨져 있던 상태(`.disagall-idle` 또는 `state.isUiHidden === true`)라면 즉시 UI 복원 및 커서 복원
  3. `state.autoHideUi`가 `true`이고 오버레이가 `active` 상태인 경우, `CONFIG.UI_IDLE_TIMEOUT` 후 `hideUi(false)`를 실행하는 신규 타이머 등록 (단, `keydown`·비종료 `click` 입력 시에는 숨김 상태를 유지하며 타이머를 강제 복원하지 않음)
- **`hideUi(isManual = false)`**:
  - 상단 헤더(`.disagall-header`), 하단 푸터(`.disagall-footer`), 좌우 내비게이션 버튼(`.disagall-nav-btn`)에 페이드아웃 적용
  - 마우스 커서 숨김 (`cursor: none`)
  - `isManual === true`인 경우 `state.isUiHidden = true`, 자동 숨김인 경우 최상위 엘리먼트에 `.disagall-idle` 토글
- **`toggleUiManual()`**:
  - 단축키 `H` 또는 `h` 입력 시 호출
  - 현재 숨김 상태(`state.isUiHidden` 또는 `.disagall-idle`)이면 `showUi()`, 보이는 상태이면 `hideUi(true)`
- **`toggleFullscreen()`**:
  - 단축키 `F`/`f`(`e.code === 'KeyF'`, 한글 IME `'ㄹ'` 포함) 또는 헤더 `#disagall-btn-fullscreen` 클릭 시 호출
  - `document.fullscreenElement` 검사: 활성화 시 `document.exitFullscreen()`, 비활성화 시 `state.elements.overlayEl.requestFullscreen()` 안전 호출 (거부 시 `0px`+UI 숨김 창 전체 채움 폴백 토글)

## 4. UI/UX 상태 전이 및 디자인 규칙 (UI States & Design Rules)
- **Idle 자동 숨김 및 수동 숨김 상태 (`.disagall-idle`, `.disagall-ui-hidden`)**:
  - `#disagall-viewer-overlay.disagall-idle, #disagall-viewer-overlay.disagall-ui-hidden`: `cursor: none;` (드래그 중 `style*="grabbing"` 예외 외 하위 요소 커서 포함 숨김)
  - `#disagall-viewer-overlay.disagall-idle .disagall-header, #disagall-viewer-overlay.disagall-ui-hidden .disagall-header, #disagall-viewer-overlay.disagall-idle .disagall-footer, #disagall-viewer-overlay.disagall-ui-hidden .disagall-footer, #disagall-viewer-overlay.disagall-idle .disagall-nav-btn, #disagall-viewer-overlay.disagall-ui-hidden .disagall-nav-btn`:
    `opacity: 0; pointer-events: none; transition: opacity 0.3s ease;`
- **조작 복귀 상태**:
  - `mousemove` 발생(또는 단축키 `H` 수동 토글) 시 `.disagall-header`, `.disagall-footer`, `.disagall-nav-btn` 기본 트랜지션(`opacity 0.15s ease`)으로 `opacity: 1; pointer-events: auto;` 복귀 (`keydown`·비종료 `click` 입력 시에는 마우스를 움직이기 전까지 UI 숨김 상태 유지)
- **오버레이 키힌트 바 (`src/ui/overlay.js`)**:
  - `.disagall-keyhints` 내 `H UI숨김`, `F 전체화면` 배지 렌더링
- **팝업 설정 (`popup.html`) 디자인**:
  - 카드 UI 내 스위치 토글 행: `몰입 모드 (UI 자동 숨김)` + 체크박스 토글 스위치 (Accent Color `#3b82f6`) 및 2.5초/`H`/`F` 단축키 안내 표기

## 5. 예외 처리 및 엣지 케이스 정책 (Edge Cases & Fallbacks)
- **슬라이더 조작 및 헤더 호버**: 슬라이더를 마우스로 드래그 중이거나 헤더 버튼 위에 마우스가 위치한 경우 타이머 숨김 유예
- **이미지 드래그 팬(Pan)**: 1.0배율 초과 확대 시 드래그 중(`isDragging === true`)에는 마우스 커서(`grabbing`) 유지 및 자동 숨김 방지
- **전체화면(`F`) 상태에서 ESC 키 입력**: 브라우저 기본 동작으로 Fullscreen이 먼저 해제되며, 뷰어 자체는 열려 있는 상태를 유지
- **토글 비활성화(`autoHideUi === false`)**: 유휴 자동 숨김은 작동하지 않으나, 단축키 `H`를 통한 수동 숨김은 언제든 사용 가능
- **한글 IME 및 슬라이더 포커스 보호**: `KEY_ACTIONS[e.key]` 외 `CODE_ACTIONS[e.code]` 폴백을 지원하여 한글 입력기(`ㄹ`/`ㅗ`/`ㄱ` 등)에서도 단축키가 동작하며, `<input type="range">` 등 비텍스트 입력 컨트롤 포커스 시 단축키를 차단하지 않음
