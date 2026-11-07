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
