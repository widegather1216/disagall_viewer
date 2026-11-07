# 🏛️ [core-viewer] Architecture & Dependency Blueprint

## 1. 데이터 및 인터랙션 흐름도 (Mermaid Flow)

```mermaid
flowchart TD
    UserRightClick["우클릭 (image/page)"] --> Background["background.js (contextMenus)"]
    Background -->|chrome.tabs.sendMessage ('open_viewer')| Extension["src/extension.js"]
    UserKeyV["'V' 단축키 / 자동 오픈"] --> Userscript["src/userscript.js"]
    
    Extension --> Controller["src/controller/viewer_controller.js"]
    Userscript --> Controller
    
    Controller -->|지연 로딩 트리거 & 수집| Parser["src/parser/image_parser.js"]
    Parser -->|본문 이미지 배열 추출| State["src/state.js (postImages)"]
    
    Controller -->|오버레이 마운트| Overlay["src/ui/overlay.js"]
    Controller -->|가용 영역 및 배율 계산| FitMath["applyFittingAndPadding()"]
    
    UserGesture["마우스 휠 / 드래그 / 더블클릭"] --> ZoomPan["src/ui/zoom_pan.js"]
    ZoomPan -->|RAF 렌더링 최적화| MainImg["#disagall-main-img (Transform)"]
    
    Slider["패딩 슬라이더 (0~100px)"] --> Controller
    Controller -->|동기화 저장| Storage["chrome.storage.sync / GM_storage"]
```

## 2. 도메인 파일 트리 및 단일 책임 (File Tree & SRP)

- **백그라운드 & 엔트리**:
  - `background.js`: 확장 프로그램 컨텍스트 메뉴 등록 및 탭 메시지 라우팅
  - `src/extension.js`: Chrome Extension 런타임 수신 및 초기화
  - `src/userscript.js`: Tampermonkey/Safari 유저스크립트 전역 단축키(`V`) 및 CSS 주입 초기화
- **파서 & 데이터 추출**:
  - `src/parser/image_parser.js`: 15종 컨테이너 탐색, 21종 비본문 제외, 디시콘 필터링, 다운스케일 쿼리 제거
- **UI 및 제스처 엔진**:
  - `src/ui/overlay.js`: 오버레이 DOM 빌더, 슬라이더/버튼/토스트 바인딩, 종횡비 피팅 계산
  - `src/ui/zoom_pan.js`: 1.0x~5.0x 마우스 휠 줌, 트랙패드 핀치, 드래그 팬, 더블클릭 리셋, RAF 렌더러
- **컨트롤러 및 상태**:
  - `src/controller/viewer_controller.js`: 뷰어 열기/닫기, 이전/다음 탐색, 리사이즈 디바운스, 단축키 처리
  - `src/state.js`: 뷰어 런타임 상태(이미지 목록, 인덱스, 줌, DOM 캐시) 관리
  - `src/config.js`: 기본 패딩, 딜레이, 스토리지 키 관리

## 3. 타 도메인 참조 및 경계 계약 (Cross-Domain Dependencies)
- **외부 도메인과의 협업**:
  - `post-navigation`: 뷰어 내 `ArrowUp`/`ArrowDown` 입력 시 `post_navigator.js`를 호출하여 이전/다음 글 전환
  - `post-recommend`: 뷰어 헤더의 개추 버튼 및 `R`/`C` 키 입력 시 `recommend_controller.js` 호출
  - `viewer-immersion`: 유휴 상태 감지 시 오버레이에 `.disagall-idle`을 토글하여 헤더/푸터 페이드아웃
- **상태 무결성 보장**:
  - 뷰어가 닫힐 때(`closeViewer`) `document.body.style.overflow`를 반드시 뷰어 오픈 전 상태로 복원

## 4. 계층 의존성 및 전역 제약 준수
- 전역 아키텍처 헌법([`00_core_foundation/architecture.md`](../00_core_foundation/architecture.md)) 준수:
  - 줌앤팬 드래그 연산 시 매 이벤트마다 DOM을 직접 건드리지 않고 `requestAnimationFrame`을 통해 1프레임 1렌더링 보장
  - 리사이즈 이벤트 시 `resizeRafId`를 통한 디바운싱 적용
