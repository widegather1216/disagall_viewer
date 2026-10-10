# Architecture Decisions: modular-bundler-migration

### [ADR-01] 번들러로 esbuild 선정
- **배경**:
  - Chrome Extension과 Tampermonkey 유저스크립트는 복잡한 SPA 프레임워크(React, Vue 등)가 아닌 바닐라 JS 기반 DOM 스크립트임.
  - Webpack이나 Vite는 설정이 무겁거나 Userscript 배너/CSS 인라인 주입을 위해 추가 플러그인(`vite-plugin-monkey` 등)이 필요함.
- **결정**:
  - 단일 의존성으로 0.01초 내 빌드가 가능한 `esbuild`를 채택.
  - `build.js` 노드 스크립트 하나로 Extension용 번들링과 Userscript용 배너/CSS 삽입 번들링을 단일 소스에서 자동 생성.
- **영향**:
  - 외부 의존성 최소화(`esbuild` 1개).
  - 유지보수 시 단 하나의 소스 코드(`src/`)만 수정하면 Chrome과 Safari/Tampermonkey 스크립트가 동시에 최신 상태로 유지됨.

---

### [ADR-02] 단일 소스 분리 전략 (Layer-by-Layer Separation)
- **배경**:
  - 1,300줄의 [content.js](file:///Users/kimbeomjun/disagall_viewer/content.js)에 DOM 제어, 좌표 계산, 정규식 파싱, 추천 API 통신이 뒤섞여 있음.
- **결정**:
  - 계층 분리:
    1. `src/config.js` & `src/state.js`: 설정 및 캡슐화된 런타임 상태
    2. `src/parser/`: 순수 비즈니스 로직 (DOM 의존성을 최소화하여 단위 테스트 가능)
    3. `src/ui/`: DOM 조작 및 인터랙션 엔진 (줌/팬, 오버레이)
    4. `src/controller/`: 오케스트레이션 및 이벤트 바인딩
- **영향**:
  - 함수 단위 테스트 용이성 극대화.
  - 전역 스코프 변수 오염 제거 및 모듈 간 결합도 대폭 완화.

---

### [ADR-03] Chrome Extension 및 Userscript 이원화 빌드 자동화
- **배경**:
  - Chrome Extension과 Tampermonkey 스크립트는 90% 이상의 코드가 동일하지만, CSS 주입 방식(파일 링크 vs 인라인/`GM_addStyle`)과 스토리지/단축키(퀵런처) 바인딩에서 차이가 있음.
- **결정**:
  - `src/extension.js`와 `src/userscript.js`를 각각 별도의 엔트리로 두고, 공통 로직은 `src/` 하위 모듈들을 완전히 공유.
  - `build.js`에서 `content.css`를 읽어 유저스크립트 빌드 시 define을 통해 컴파일 타임에 인라인 주입하고 헤더 배너를 결합.
- **영향**:
  - 단 한 번의 `npm run build`로 두 플랫폼 산출물이 동시에 최신 상태로 유지되어 코드 불일치와 수동 동기화 문제 완벽 해결.

