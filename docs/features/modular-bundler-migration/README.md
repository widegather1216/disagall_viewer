# Feature Wiki: 모듈화 및 esbuild 번들러 파이프라인 구축 (modular-bundler-migration)

## 📌 목표 및 배경
- **문제점**: [content.js](file:///Users/kimbeomjun/disagall_viewer/content.js)(1,288줄)와 [disagall_viewer.user.js](file:///Users/kimbeomjun/disagall_viewer/disagall_viewer.user.js)(1,753줄)가 단일 파일에 비대하게 뭉쳐 있어 유지보수성, 가독성, 테스트 용이성이 크게 저하되고 수동 동기화 비용이 발생함.
- **해결책**:
  1. 초경량 초고속 번들러인 **esbuild** 도입.
  2. 단일 책임을 갖는 계층별 ES Module 구조(`src/`)로 코드 분리.
  3. `npm run build` 한 번으로 Chrome Extension(`content.js`)과 유저스크립트(`disagall_viewer.user.js`)를 단일 소스에서 자동 생성.
  4. 기존 Node 단위 테스트([tests/](file:///Users/kimbeomjun/disagall_viewer/tests))가 분리된 모듈의 순수 함수를 직접 검증하도록 갱신.

---

## 🗺️ 로드맵 및 진행 단계

- [x] **Step 1: 환경 구성 및 빌드 파이프라인 수립**
  - `package.json` 초기화 및 `esbuild` 설치
  - `build.js` 빌드 스크립트 작성 (Chrome 확장 + 유저스크립트 배너 및 CSS 자동 주입)
  - 빌드 검증 스크립트(`npm run build`, `npm test`) 동작 확인

- [x] **Step 2: 핵심 상수 및 상태 계층 추출 (`src/config.js`, `src/state.js`)**
  - 전역 상수 `CONFIG` 분리
  - 뷰어의 런타임 반응형 상태/스토어 캡슐화

- [x] **Step 3: 도메인 파서 및 순수 함수 계층 추출 (`src/parser/`)**
  - `src/parser/image_parser.js`: 본문 이미지 필터링 및 원본 URL 추출
  - `src/parser/post_navigator.js`: 게시판 tr/li 분석 및 사진 글 탐색
  - `src/parser/recommend_parser.js`: 추천 버튼, 로그인 여부, 추천 수 파싱
  - 기존 단위 테스트 연동 및 PASS 확인

- [x] **Step 4: 인터랙션 및 UI 계층 분리 (`src/ui/`)**
  - `src/ui/zoom_pan.js`: 줌/팬 드래그 연산 및 RAF 렌더러
  - `src/ui/overlay.js`: 오버레이 DOM 생성, 슬라이더, 토스트 UI

- [x] **Step 5: 컨트롤러 및 엔트리포인트 통합 (`src/controller/`, `src/extension.js`, `src/userscript.js`)**
  - `src/controller/viewer_controller.js`: 네비게이션, 키보드 단축키, 뷰어 열기/닫기
  - `src/controller/recommend_controller.js`: 추천 비동기 디스패치 및 UI 피드백
  - Chrome Extension 엔트리 및 Userscript 엔트리 통합 빌드
  - 기존 빌드 결과물과의 동작 동등성 최종 검증 및 모듈 단위 테스트 PASS
