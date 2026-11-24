# Decisions (ADR) - Post Navigation

### [ADR-001] 단축키 동작 범위 및 스크롤 충돌 방지
- **배경**: 브라우저 기본 위/아래 방향키는 페이지 스크롤 기능을 수행함. 뷰어가 닫혀 있을 때 위/아래 키로 글 이동을 가로채면 사용자가 본문을 스크롤해서 읽는 기본 동작을 방해할 수 있음.
- **결정**: 뷰어가 활성화(`overlayEl.classList.contains('active')`)된 상태에서만 `↑`/`↓` 키로 이전/다음 글 이동을 수행함. (방법 1 채택)
- **영향**: 뷰어 감상 시에는 스크롤 걱정 없이 쾌적하게 글을 넘길 수 있고, 일반 웹서핑 시 본문 스크롤에 전혀 간섭하지 않음.

### [ADR-002] 연속 감상 모드 상태 전달 방식
- **배경**: 글 이동 시 페이지 전체 리로드(`window.location.href`)가 발생하므로, 새 페이지에서도 뷰어가 자동으로 열려야 연속 감상이 유지됨.
- **결정**: URL 쿼리 파라미터 대신 `sessionStorage`를 활용 (`disagall_auto_open: '1'`).
- **영향**:
  - URL이 지저분해지지 않고 링크 복사/공유 시 불필요한 파라미터가 남지 않음.
  - 현재 브라우저 탭 세션 내에서만 동작하므로 안전함.
  - 새 페이지 로드 즉시 소비(`removeItem`)하여 뒤로가기나 리프레시 시 원치 않는 재오픈 방지.

### [ADR-003] 하단 목록 테이블 DOM 탐색 전략
- **배경**: 디시인사이드는 데스크톱 게시판에서 `table.gall_list tbody tr.ub-content`를 사용하며, 공지, 설문, AD 광고 행이 혼재되어 있음.
- **결정**:
  - `td.gall_num`이 숫자가 아니거나, `td.gall_subject`가 공지/설문/AD인 행을 필터링하여 유효 게시글 목록 배열 생성.
  - `tr.crt`, `tr:has(.crt_icon)`, 또는 URL의 `no` 파라미터 매칭을 통해 현재 행 인덱스를 찾음.
  - 인덱스 기준 -1(위쪽 최신글), +1(아래쪽 이전글)로 이동.

### [ADR-004] 사진 탭 부재(일반/전체글 목록) 대비 스마트 사진 글 우선 탐색 및 세션 복구 배너
- **배경**:
  - 디사갤의 `search_head=10`(사진 탭)이 없는 일반 갤러리나 전체글 목록에서는 텍스트 글과 사진 글이 혼재되어 있음.
  - 무조건 인접 행으로 이동하면 텍스트 글(사진 0개)로 넘어가 뷰어 자동 오픈이 실패하고 연속 감상이 중단됨.
- **결정**:
  - `hasPhotoAttachment(row)` 판별식을 도입하여 말머리('사진') 및 사진 첨부 아이콘(`.icon_pic`, `.icon_recomimg`, `.sp-lst-img`) 식별.
  - `getAdjacentPostUrl(direction, preferPhotos = true)`: 사진 글이 있을 경우 텍스트 글을 자동으로 스킵하고 다음 사진 글로 우선 이동. 사진 글이 없을 경우 일반 행으로 안전 폴백.
  - 연속 감상 중 사진이 없는 글에 도착한 경우: 뷰어가 조용히 종료되는 대신 상단 플로팅 배너(`disagall-no-photo-notice`)를 표시하고 키보드 `↑`/`↓`/`w`/`s` 및 버튼 액션을 유지하여 연속 감상 흐름을 끊김 없이 복구.
- **영향**: 사진 탭이 존재하지 않는 모든 디시 갤러리에서도 끊김 없는 사진 연속 감상 경험 보장.

### [ADR-005] `getAdjacentPostUrl` 하위 호환 확장형 Discriminated Result 계약 (Option A)
- **배경**: 기존 `getAdjacentPostUrl()`은 목록 없음/현재 글 미발견 시 `null`, 경계 도달 시 `{ error, message }`, 성공 시 `{ url, title, hasPhoto }` 등 3가지 이질적 반환 타입을 사용해 호출부가 `if (!result)`와 `if (result.error)`를 이중 분기해야 했음(`REFACTOR-05`).
- **결정**: 기존 테스트(`tests/post_navigation.test.js` Test 9의 `.error`/`.message`/`.url` 단언)와의 하위 호환성을 유지하면서 반환 타입 다형성을 제거하기 위해 **Option A(하위 호환 확장형 Discriminated Result)** 채택:
  - `null` 반환을 제거하고 모든 분기에서 `ok: boolean` 및 `status: 'found' | 'boundary' | 'unavailable'` 판별자를 포함.
  - 성공 시 `{ ok: true, status: 'found', url, title, hasPhoto }`, 경계 시 `{ ok: false, status: 'boundary', error: 'top' | 'bottom', message }`, 불가 시 `{ ok: false, status: 'unavailable', error: 'no_list' | 'current_not_found' | 'unsafe_url', message }` 반환.
- **영향**: `viewer_controller.js`의 `navigatePost()`는 `!result || !result.ok || result.status !== 'found'` 단일 분기로 단순화되며, 기존 `.url`/`.error`/`.message` 호출 계약도 100% 보존됨.
