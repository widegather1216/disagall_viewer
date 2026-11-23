# 🏛️ [viewer-immersion] Architecture & Dependency Blueprint

## 1. 데이터 및 상태 흐름도 (Mermaid Flow)

```mermaid
flowchart TD
    UserMouse["사용자 마우스/키보드 이벤트"] -->|mousemove / keydown| Controller["viewer_controller.js"]
    Controller -->|타이머 리셋 / 유휴 감지| Timer["Idle Timer (2500ms)"]
    Controller -->|H / F 및 몰입 상태 위임| ImmersionHandler["immersion_controller.js"]
    
    Timer -->|만료 시 (2.5초)| ImmersionHandler
    ImmersionHandler -->|클래스 토글 (.disagall-idle)| Overlay["#disagall-viewer-overlay"]
    ImmersionHandler -->|전체화면 요청/종료| FullscreenAPI["Browser Fullscreen API"]
    
    Storage["chrome.storage / GM_storage"] -->|autoHideUi 설정 로드| State["state.js (autoHideUi)"]
    Popup["popup.html / popup.js"] -->|설정 변경| Storage
    State -->|자동 숨김 활성화 여부 참조| ImmersionHandler
```

## 2. 도메인 파일 트리 및 단일 책임 (File Tree & SRP)

- **설정 및 상태 레이어**:
  - `[기존]` `src/config.js`: `UI_IDLE_TIMEOUT`(2500), `STORAGE_KEY_AUTO_HIDE_UI`, `STORAGE_KEY_AUTO_FULLSCREEN` 상수 정의
  - `[기존]` `src/state.js`: `idleTimer`, `autoHideUi`, `autoFullscreen`, `isUiHidden`, `isFullscreenMode` 상태 관리 및 초기화
- **사용자 제어 및 비즈니스 레이어**:
  - `[기존]` `src/controller/immersion_controller.js`: 마우스 유휴 타이머 시작/리셋, 호버/드래그/슬라이더 가드레일, `H` 수동 토글, `F`/버튼 전체화면 토글 및 `fullscreenchange` 동기화·자동 전체화면 폴백, `defaultPadding`/`autoHideUi`/`autoFullscreen` 3키 통합 초기화(`loadInitialSettings`)·`onChanged` 실시간 동기화(자기 에코/로컬 편집/비동기 레이스 방어 포함), UI 숨김/복귀/패딩 변경 시 `syncFittingIfUnzoomed()` 호출
  - `[기존]` `src/controller/viewer_controller.js`: 뷰어 생명주기(`openViewer`/`closeViewer`), 이미지/게시글 탐색, 단축키/헤더 버튼 디스패치, 패딩 슬라이더 클램핑·디바운스/`change` 저장·에코 추적 및 `immersion_controller.js` re-export
  - `[기존]` `popup.html`: 몰입 모드(자동 숨김) 및 뷰어 열 때 자동 전체화면(`#auto-fullscreen-toggle`) 스위치 UI 마크업 및 2.5초/H/F 단축키 안내
  - `[기존]` `popup.js`: 스토리지 조회, `bindPopupSlider`(250ms 디바운스/`change` 저장·`NaN` 가드)·`bindPopupToggle`(자동 숨김/자동 전체화면 공용)·`bindStorageSync`(`onChanged` 타입 가드) 동기화 처리
- **UI 및 프레젠테이션 레이어**:
  - `[기존]` `src/ui/overlay.js`: 헤더 전체화면 버튼(`#disagall-btn-fullscreen`), 하단 키힌트 바(`H UI숨김`, `F 전체화면`) 및 UI 숨김/전체화면(`effectivePadding = 0`) 연동 동적 피팅(`applyFittingAndPadding`, `.disagall-stage` 안전 패딩 동기화)
  - `[기존]` `src/ui/zoom_pan.js`: 줌/팬 제어 및 `1.0x` 복귀 시 현재 UI 상태에 맞춘 `applyFittingAndPadding()` 재동기화
  - `[기존]` `content.css`: `.disagall-header`/`.disagall-footer` 절대 위치 오버레이, `.disagall-stage` 상하 패딩 트랜지션, `.disagall-idle`/`.disagall-ui-hidden` 페이드아웃·커서 숨김(드래그 커서 유지 포함) 정의
- **테스트 레이어**:
  - `[기존]` `tests/immersion.test.js`: 유휴 타이머, 토글 로직, 단축키 디스패치, CSS/오버레이/팝업 통합 단위 테스트

## 3. 타 도메인 참조 및 경계 계약 (Cross-Domain Dependencies)
- **참조 계약 (Inbound)**:
  - `src/ui/zoom_pan.js`: 이미지 드래그 팬(`state.zoom.isDragging`) 진행 상태를 조회하여 드래그 중 커서 유지 및 타이머 멈춤 처리
  - `src/config.js`, `src/state.js`: 뷰어의 활성화 상태(`overlayEl.classList.contains('active')`)를 검사하여 비활성 시 타이머 미작동
- **외부 노출 계약 (Outbound)**:
  - 다른 모듈(`post_navigator`, `recommend_controller`)의 동작을 방해하지 않고 독립적인 UI 클래스 토글만 수행

## 4. 계층 의존성 및 전역 제약 바인딩
- 전역 헌법([`00_core_foundation/architecture.md`](../00_core_foundation/architecture.md)) 준수:
  - 뷰어가 닫힐 때(`closeViewer`) 타이머를 반드시 해제(`clearTimeout(state.idleTimer)`)
  - 전체화면 상태에서 뷰어가 닫힐 경우 `document.exitFullscreen()`을 안전하게 호출하여 브라우저 화면 복원
