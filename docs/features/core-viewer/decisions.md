# ⚖️ [core-viewer] Architecture Decision Records (ADR)

### [ADR-01] 브라우저 우클릭 컨텍스트 메뉴(contextMenus)를 기본 진입점으로 채택 (2026-08-01)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 웹서핑 도중 게시판 UI를 해치지 않으면서, 사용자가 원하는 사진을 선택했을 때 즉각적이고 자연스럽게 뷰어로 전환할 수 있는 직관적인 진입점이 필요했음.
- **결정 내용 (Decision)**:
  - Chrome Context Menu API를 활용하여 `["image", "page"]` 컨텍스트에 `"📷 디시 사진 뷰어로 화면 맞춤 보기"` 메뉴 등록.
  - 마우스 우클릭 시 `document.addEventListener('contextmenu', ..., true)` 캡처 단계에서 타겟 이미지를 사전 보관하여 정확한 인덱스를 오픈.
- **결과 및 트레이드오프 (Consequences)**: 웹사이트 본래 UI와 충돌하지 않으면서도 유저가 원할 때만 활성화할 수 있는 깔끔한 UX 확보.

---

### [ADR-02] 가용 뷰포트 기반 동적 종횡비 피팅 수학 공식 적용 (2026-08-01)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 원본 사진의 비율이 제각각(극단적 세로 파노라마, 16:9 가로, 정방형 등)인 상황에서 사진이 잘리거나 화면 밖으로 넘치지 않게 해야 함.
- **결정 내용 (Decision)**:
  - 브라우저 창 크기에서 상단 헤더, 하단 푸터 및 유저 설정 패딩(기본 24px)을 제외한 가용 너비/높이를 계산.
  - `Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight)` 비율을 적용해 `maxWidth`/`maxHeight`를 픽셀 단위로 산출.
- **결과 및 트레이드오프 (Consequences)**: 어떤 해상도와 모니터에서도 사진의 본래 비율을 왜곡 없이 100% 한눈에 감상 가능.

---

### [ADR-03] RequestAnimationFrame 기반 줌앤팬 엔진 및 1.001x 리셋 가드 (2026-08-01)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 고해상도 이미지를 마우스 휠이나 드래그로 조작할 때 고빈도 이벤트로 인한 브라우저 리플로우 및 렌더링 렉(Stuttering) 발생 위험.
- **결정 내용 (Decision)**:
  - 모든 줌/팬 좌표 변환은 `transformRafId`를 통한 1프레임 1렌더링 구조로 일원화.
  - 부동소수점 오차로 배율이 1.001 이하로 떨어질 경우 원점 `(0, 0)` 및 `scale(1)`로 강제 리셋하여 오프셋 누적 방지.
- **결과 및 트레이드오프 (Consequences)**: 60fps~144fps 모니터에서 매끄러운 확대/축소 및 드래그 체감 성능 보장.

---

### [ADR-04] 다운스케일 파라미터(`s`, `type`) 제거 및 원본 CDN URL 복원 (2026-08-01)
- **상태**: Accepted
- **배경 및 문제 상황 (Context)**: 디시인사이드는 본문 렌더링 시 서버 부하를 줄이기 위해 썸네일 축소 쿼리 파라미터(`?s=...`)를 주입하여 저화질 이미지를 노출함.
- **결정 내용 (Decision)**:
  - URL 파서(`getCleanOriginalUrl`)에서 `s`와 `type` 파라미터를 강제 제거하여 원본 고화질 파일로 복원.
- **결과 및 트레이드오프 (Consequences)**: 추가적인 서버 요청 없이도 디시 CDN의 최고 화질 원본 사진 감상 가능.
