# 🏛️ [00_core_foundation] Global Architecture & Engineering Constitution

## 1. 기술 스택 및 디렉토리 구조 (Tech Stack & Layout)
- **Runtime & Extensions**: Chrome Extension (Manifest V3), Safari / Tampermonkey Userscript, Vanilla JavaScript (ES Modules)
- **Bundler**: esbuild (`build.js`) — `src/extension.js` ➔ `content.js`, `src/userscript.js` ➔ `disagall_viewer.user.js`
- **Testing**: Node.js built-in assertion tests (`tests/module_import.test.js`, `tests/post_navigation.test.js`, `tests/recommend.test.js`)
- **디렉토리 레이아웃**:
  - `src/config.js`: 불변 설정 상수 및 스토리지 키 관리
  - `src/state.js`: 뷰어 런타임 상태 단일 저장소 (Single Source of Truth)
  - `src/parser/`: DOM 크롤링 및 파서 모듈 (`image_parser`, `post_navigator`, `recommend_parser`)
  - `src/ui/`: 뷰어 오버레이 마크업 생성, 스타일, 제스처 제어 (`overlay.js`, `zoom_pan.js`)
  - `src/controller/`: 사용자 인터랙션, 키보드/마우스 이벤트 디스패치 (`viewer_controller.js`, `recommend_controller.js`)
  - `popup.html`, `popup.js`: 확장 프로그램 팝업 설정 UI

## 2. 단방향 레이어 의존성 헌법 (Unidirectional Layer Rules)
- **허용 흐름**: `Entry (extension.js / userscript.js)` ➔ `Controllers` ➔ `UI Modules / Parsers` ➔ `State / Config`
- **절대 금지 규칙**:
  1. `state.js` 또는 `config.js`에서 DOM을 직접 조작하거나 상위 컨트롤러를 역참조하는 행위 금지
  2. UI 모듈(`overlay.js`)에서 직접 네트워크/페이지 이동 로직을 수행하지 않고 `controller`에 위임
  3. `content.js` 또는 `disagall_viewer.user.js`를 직접 수정 금지 — 반드시 `src/` 수정 후 `npm run build`를 통해 번들링

## 3. 동시성·타이머·리소스 제약사항 (Concurrency & Resource Constraints)
- **타이머 수명주기**: `setTimeout`, `setInterval`, `requestAnimationFrame` 생성 시 반드시 `state`에 ID를 등록하고, 뷰어 종료(`closeViewer`) 시 전량 해제(`clearTimeout`)하여 메모리 누수 및 백그라운드 유령 콜백 방지
- **이벤트 리스너 오버헤드**: `mousemove`, `wheel` 등의 고빈도 이벤트는 과도한 연산을 방지하고, 뷰어가 닫힌 상태(`!active`)에서는 즉시 early-return
- **스토리지 I/O 최소화**: 슬라이더 이동 등 연속적인 입력 발생 시 무분별한 `chrome.storage` 쓰기 방지 (필요 시 디바운스 적용)

## 4. 표준 검증 및 빌드 명령어 (Standard Verification Commands)
- **단위 및 통합 테스트**: `npm test`
- **스크립트 빌드 및 번들링**: `npm run build`
- **패키징 (ZIP 배포본 생성)**: `npm run pack`
