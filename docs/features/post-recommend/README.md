# Feature: 뷰어 내 개념글 추천(개추) 연동 (Post Recommend)

## 📌 기능 개요
디시 사진 뷰어로 사진을 감상하는 도중, 뷰어를 닫고 본문 하단으로 스크롤할 필요 없이 상단 헤더의 버튼이나 단축키(`r` / `c`)를 통해 현재 게시글에 개념글 추천(개추)을 누를 수 있는 편의 기능.

## 🧭 키 매핑 및 동작 규칙
- **UI 버튼**: 상단 헤더 우측(`disagall-header-right`)에 `👍 개추 (추천수)` 버튼 배치
- **단축키**: `r` (Recommend) 또는 `c` (개추)
- **동작 조건**: **뷰어가 활성화(`overlayEl.classList.contains('active')`)된 상태에서만 동작**
- **동작 방식**: 본문의 실제 디시 추천 버튼(`button.btn_recom_up` / 모바일 `.btn-recom`) 탐색 후 프로그래밍 방식의 `.click()` 호출

## 🏗️ 아키텍처 및 구현 레이어
1. **추천 DOM 탐색 및 제어 레이어 (`triggerPostRecommend()`, `getPostRecommendCount()`)**
   - 데스크톱/모바일 추천 버튼 엘리먼트 쿼리
   - 현재 추천 수 추출 및 반환
   - 버튼 클릭 이벤트 트리거 및 예외 방어
2. **UI 상태 및 실시간 동기화 레이어**
   - 뷰어 헤더에 `disagall-btn-recommend` 버튼 렌더링
   - 뷰어 오픈 시 최신 추천 수로 버튼 라벨 동기화
   - 추천 실행 시 뷰어 토스트 피드백 (`"개념글 추천을 눌렀습니다! 👍"`)
   - 500ms, 1200ms 후 추천 수 재조회하여 실시간 카운트 업 반영
3. **단축키 바인딩 레이어**
   - `handleKeyDown`에 `r`, `R`, `c`, `C` 핸들러 등록
   - 하단 단축키 바에 `<kbd>R</kbd> 개추` 추가

## 📋 구현 체크리스트
- [x] 1. `getPostRecommendCount()` 및 `triggerPostRecommend()` DOM 헬퍼 함수 구현
- [x] 2. `createOverlay()` 헤더에 추천 버튼 마크업 및 이벤트 리스너 추가
- [x] 3. `handleKeyDown`에 `r` / `c` 단축키 바인딩 및 하단 키 힌트 추가
- [x] 4. `content.css`에 추천 버튼 스타일링 (모던 블루 포인트, 호버/액티브 효과)
- [x] 5. 단위 및 통합 테스트 작성 (`tests/recommend.test.js`) 및 PASS 검증
- [x] 6. `disagall_viewer.user.js`, Safari extension, `disagall_viewer.zip` 리소스 동기화
