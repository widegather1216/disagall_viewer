# 🧪 [modular-bundler-migration] Verification & Ticket Logs

- **검증 상태**: `🟢 Sign-Off` (`0건 OPEN DEFECT` — `DEFECT-01` 해결 완료)
- **인수 조건 통과율**: `3 / 3 (100%)` · 테스트 매트릭스 `5 / 5 PASS`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (단일 소스 다중 플랫폼 빌드)**:
  - **Given** 개발자가 `src/` 하위 모듈과 `content.css`를 수정한 상태에서,
  - **When** `npm run build`를 실행하면,
  - **Then** 0.1초 이내에 `content.js`와 메타데이터 배너 및 CSS가 인라인 주입된 `disagall_viewer.user.js`가 정상 생성된다.
- **AC-02 (모듈 분리 무결성 및 단위 테스트 통과)**:
  - **Given** 모듈화된 `src/parser`, `src/ui`, `src/controller` 모듈들이 존재할 때,
  - **When** `npm test`를 실행하면,
  - **Then** 모듈 임포트, 게시글 내비게이션, 추천 테스트 3종이 오류 없이 100% 통과한다.
- **AC-03 (배포 ZIP 자동 패키징)**:
  - **Given** 빌드가 완료된 상태에서,
  - **When** `npm run pack`을 실행하면,
  - **Then** 필수 에셋과 매니페스트가 포함된 `disagall_viewer.zip`이 올바르게 갱신된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | `npm run build` 실행 시 content.js 및 disagall_viewer.user.js 동시 생성 | `AC-01` | `PASS (Fixed in DEFECT-01)` | [`DEFECT-01`](#defect-01-safari-%ED%99%95%EC%9E%A5-%EB%B2%88%EB%93%A4-v100-%EC%9E%A5%EA%B8%B0-%EB%AF%B8%EB%8F%99%EA%B8%B0%ED%99%94-%EB%B0%8F-userscript-%EB%9F%B0%EC%B2%98-css-%EB%88%84%EB%9D%BD) (Safari 리소스 동기화 및 `#disagall-quick-launcher` CSS 복구) |
| `TC-HP-02` | Happy | `npm test` 실행 시 3개 단위 테스트 스위트 전원 통과 | `AC-02` | `PASS` | - |
| `TC-HP-03` | Happy | `npm run pack` 실행 시 무결한 배포 ZIP 생성 | `AC-03` | `PASS (Fixed in DEFECT-01)` | [`DEFECT-01`](#defect-01-safari-%ED%99%95%EC%9E%A5-%EB%B2%88%EB%93%A4-v100-%EC%9E%A5%EA%B8%B0-%EB%AF%B8%EB%8F%99%EA%B8%B0%ED%99%94-%EB%B0%8F-userscript-%EB%9F%B0%EC%B2%98-css-%EB%88%84%EB%9D%BD) (`disagall_viewer.zip` 재생성 및 Safari 리소스 동기화 완료) |
| `TC-BD-01` | Boundary | `content.css` 비어있거나 특수문자 포함 시 인라인 JSON 문자열 처리 | `AC-01` | `PASS` | - |
| `TC-NG-01` | Negative | 모듈 문법 에러 발생 시 esbuild 에러 출력 및 비정상 종료(exit code 1) | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] Safari 확장 번들 v1.0.0 장기 미동기화 및 Userscript 런처 CSS 누락
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`build.js`](../../../build.js#L22-L87), [`content.css`](../../../content.css#L552-L581), [`src/userscript.js#L21-L39`](../../../src/userscript.js#L21-L39), `safari_extension/DisagallViewerSafari/DisagallViewerSafari Extension/Resources/`
- **원인 및 실증**: 모듈화 이전(`46774e1`) 인라인 유저스크립트 스타일에 있던 `#disagall-quick-launcher` 규칙이 `content.css` 분리 과정에서 누락되어 `disagall_viewer.user.js`의 런처 버튼 스타일이 실종되었으며, `build.js`가 루트 산출물(`content.js`, `disagall_viewer.user.js`)만 생성하고 `safari_extension/.../Resources/` 및 `disagall_viewer.zip`을 동기화하지 않아 Safari 확장 번들이 v1.0.0 상태에 정지해 있었음(`tests/module_import.test.js` Test 4 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`content.css`](../../../content.css#L552-L581), [`build.js`](../../../build.js#L22-L87), [`tests/module_import.test.js`](../../../tests/module_import.test.js#L1-L70) (+ 빌드/패키징 산출물 `content.js`, `disagall_viewer.user.js`, `disagall_viewer.zip`, `safari_extension/.../Resources/` 9종 동기화)
  - **원인 및 조치**: `content.css`에 `#disagall-quick-launcher` 및 `#disagall-quick-launcher:hover` 고정 플로팅 버튼 스타일(`-webkit-backdrop-filter` 포함)을 복구해 `build.js`의 `__INJECTED_CSS__` 인라인 주입에 반영함. 또한 `build.js`에 `EXTENSION_ASSETS` 9종(`manifest.json`, `background.js`, `content.js`, `content.css`, `popup.html`, `popup.js`, `icon16.png`, `icon48.png`, `icon128.png`)을 `safari_extension/DisagallViewerSafari/DisagallViewerSafari Extension/Resources/`로 자동 복사하는 `syncSafariResources()` 단계를 통합하고 `npm run pack`으로 `disagall_viewer.zip`을 최신화함.
  - **회귀 테스트 결과**: `node tests/module_import.test.js` (`4/4 PASS`), `npm test` (5개 스위트 전량 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `npm run pack` (`PASS`), `node --check` (`PASS`)

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

*(현재 등록된 미해결 리팩토링 티켓 없음)*
