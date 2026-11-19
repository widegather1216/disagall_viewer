# 🧪 [modular-bundler-migration] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`1건 OPEN DEFECT` — `deep-bug-hunter` 실증 등록)
- **인수 조건 통과율**: `3 / 3 (Safari 패키징 및 Userscript 런처 스타일 누락 1건 발견)`
- **미해결 티켓**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 0건`

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
| `TC-HP-01` | Happy | `npm run build` 실행 시 content.js 및 disagall_viewer.user.js 동시 생성 | `AC-01` | `FAIL` | [`DEFECT-01`](#defect-01-safari-%ED%99%95%EC%9E%A5-%EB%B2%88%EB%93%A4-v100-%EC%9E%A5%EA%B8%B0-%EB%AF%B8%EB%8F%99%EA%B8%B0%ED%99%94-%EB%B0%8F-userscript-%EB%9F%B0%EC%B2%98-css-%EB%88%84%EB%9D%BD) (Safari 리소스 동기화 및 `#disagall-quick-launcher` CSS 누락) |
| `TC-HP-02` | Happy | `npm test` 실행 시 3개 단위 테스트 스위트 전원 통과 | `AC-02` | `PASS` | - |
| `TC-HP-03` | Happy | `npm run pack` 실행 시 무결한 배포 ZIP 생성 | `AC-03` | `FAIL` | [`DEFECT-01`](#defect-01-safari-%ED%99%95%EC%9E%A5-%EB%B2%88%EB%93%A4-v100-%EC%9E%A5%EA%B8%B0-%EB%AF%B8%EB%8F%99%EA%B8%B0%ED%99%94-%EB%B0%8F-userscript-%EB%9F%B0%EC%B2%98-css-%EB%88%84%EB%9D%BD) (`disagall_viewer.zip` 미갱신 및 Safari 미동기화) |
| `TC-BD-01` | Boundary | `content.css` 비어있거나 특수문자 포함 시 인라인 JSON 문자열 처리 | `AC-01` | `PASS` | - |
| `TC-NG-01` | Negative | 모듈 문법 에러 발생 시 esbuild 에러 출력 및 비정상 종료(exit code 1) | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] Safari 확장 번들 v1.0.0 장기 미동기화 및 Userscript 런처 CSS 누락
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`build.js`](../../../build.js), [`package.json`](../../../package.json), [`src/userscript.js#L36-L47`](../../../src/userscript.js#L36-L47), [`content.css`](../../../content.css), `safari_extension/.../Resources/`
- **원인 및 실증**: `safari_extension/.../Resources/`가 v1.0.0(`content.js` 45,952B vs 루트 63,396B, `popup.js` 911B vs 10,044B)에 정지해 몰입/전체화면·최신 파서가 전면 누락되었으며 `build.js`/`package.json`에 동기화 단계가 없음. 또한 `userscript.js`가 삽입하는 `#disagall-quick-launcher` 스타일 규칙이 `content.css`에 부재함(`Deterministic Trace Verified`).
- **최소 수정 설계**: `content.css`에 `#disagall-quick-launcher` 스타일 추가 및 `build.js`에 Safari `Resources/` 에셋 동기화 단계 통합.

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

*(현재 등록된 미해결 리팩토링 티켓 없음)*
