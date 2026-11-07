# 📜 [modular-bundler-migration] Full-Stack Specification

## 1. 빌드 규격 및 환경 스키마 (Build Config & Schema)

### 🟢 [As-Is 기구현]
- **번들러 엔진**: `esbuild ^0.28.2`
- **컴파일 타겟**: `chrome100`, `firefox100`, `safari15`
- **번들 포맷**: `iife` (Immediately Invoked Function Expression)
- **엔트리 및 산출물 매핑**:
  - `src/extension.js` ➔ `content.js` (Chrome Extension Content Script)
  - `src/userscript.js` + `content.css` ➔ `disagall_viewer.user.js` (Tampermonkey Userscript)

## 2. 유저스크립트 메타데이터 배너 규격 (Userscript Banner Contract)
```javascript
// ==UserScript==
// @name         디시 사진 뷰어 (Disagall Viewer - Safari / Tampermonkey)
// @namespace    https://gall.dcinside.com/
// @version      1.1.0
// @description  디시인사이드 게시글 사진을 화면에 맞춰 원본 화질 그대로 감상하는 유저스크립트 (Safari 지원)
// @author       Beomjun Kim
// @match        https://gall.dcinside.com/*
// @match        https://*.dcinside.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==
```

## 3. CSS 인라인 주입 규격 (Inlined CSS Contract)
- `build.js`에서 `content.css` 파일을 UTF-8로 읽어들임
- `esbuild` 옵션의 `define` 필드를 통해 컴파일 타임 치환:
  `define: { '__INJECTED_CSS__': JSON.stringify(cssContent) }`
- `src/userscript.js` 런타임에서 `GM_addStyle(__INJECTED_CSS__)` 또는 `<style>` 태그 삽입을 통해 외부 CSS 파일 없이 단일 파일로 동작

## 4. 빌드 및 패키징 스크립트 규격
- **`npm run build`**: `node build.js` 실행, 100ms 이내 번들 생성 완료
- **`npm run pack`**: 빌드 후 Chrome 웹스토어 업로드용 `disagall_viewer.zip` 자동 생성 (manifest, background, content.js, content.css, popup, icon 일체 패키징)
- **`npm test`**: `node tests/module_import.test.js && node tests/post_navigation.test.js && node tests/recommend.test.js` 순차 실행

## 5. 예외 처리 및 엣지 케이스 정책 (Edge Cases & Fallbacks)
- **`content.css` 부재 시 방어**: CSS 파일이 없을 경우 빈 문자열(`''`)로 폴백하여 빌드 크래시 방지
- **IIFE 래핑**: 모듈 번들링 시 변수가 디시 웹사이트의 전역 윈도우 스코프(`window.*`)를 오염시키지 않도록 자체 클로저 보장
