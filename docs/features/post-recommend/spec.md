# 📜 [post-recommend] Full-Stack Specification

## 1. 데이터 모델 및 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- `RECOMMEND_THROTTLE_MS`: `1500` (ms, 추천 중복 입력 방어 쓰로틀 시간)
- `COUNT_REFRESH_DELAYS`: `[500, 1200]` (ms, 디시 서버 반영 후 추천 수 재조회 주기)
- `RecommendInfo`: `{ button: HTMLElement | null, count: number, canVote: boolean, isVoted: boolean }`

## 2. DOM 탐색 및 제어 계약 (`recommend_parser.js`)

### 2.1 본문 추천 버튼 셀렉터
- **데스크톱**: `button.btn_recom_up`, `.btn_recom_up`, `button[data-action="recommend"]`, `.btn_recommend_up`
- **모바일**: `.btn-recom`, `.btn_recom`, `button.btn-recom`

### 2.2 추천 수 추출 셀렉터
- **데스크톱**: `button.btn_recom_up .recom_num`, `.btn_recom_up em`, `button.btn_recom_up span`
- **모바일**: `.btn-recom .recom-num`, `.btn-recom em`
- **폴백**: 숫자 정규식 `/\d+/` 매칭 후 정수 변환 (실패 시 0 반환)

## 3. 추천 디스패치 및 피드백 계약 (`recommend_controller.js`)

### 3.1 `triggerPostRecommend()`
- **동작 가드**:
  1. 뷰어가 비활성(`!active`) 상태이거나 쓰로틀링 중(`Date.now() - lastVoteTime < 1500`)이면 조기 리턴
  2. 이미 현재 글에서 추천을 성공하여 카운트가 올랐다면 토스트 `"이미 개념글 추천을 완료한 게시글입니다. 👍"` 출력
- **단일 클릭 디스패치 (Single Dispatch)**:
  - `btn.click()` 1회 단독 실행 (성공 시 즉시 반환, 중복 이벤트 발송 엄격 차단)
- **2단계 카운트 갱신 (Count Refresh)**:
  - `500ms`, `1200ms` 후 `getPostRecommendCount()`를 비동기 호출
  - 추천 수 증가(`afterCount > beforeCount`) 감지 시:
    - 버튼 클래스에 `.voted` 추가
    - 텍스트를 `👍 개추 (N)`으로 업데이트
- **토스트 피드백**:
  - 디스패치 성공 즉시 `showToast("개념글 추천을 눌렀습니다! 👍")` 노출

## 4. UI 및 단축키 바인딩 규칙
- **UI 마크업**: 상단 헤더 우측(`.disagall-header-right`)에 `#disagall-btn-recommend` 버튼 렌더링
- **키 매핑**: `r`, `R`, `c`, `C` 키 입력 시 `triggerPostRecommend()` 실행
- **하단 키힌트**: `.disagall-keyhints`에 `<kbd>R</kbd> 개추` 배지 표기
