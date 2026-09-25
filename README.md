# 다시씀 — RE:PLAY

개인 프로젝트 · 1·2단계 구현 완료

“같은 돈이면 다시 쓸래?”에 답하는 모바일 웹의 데이터·검증 기반입니다. React 화면은 제목과 안내, 홈 링크만 있는 임시 페이지입니다. 폼·카드·자동저장 hook·분석 SDK·E2E·배포는 아직 구현하지 않았습니다.

## 실행

프로젝트 루트에서 Node **24.19.0**을 사용합니다. 지원 범위는 Node 24.x (`engines`), npm과 package-lock.json을 사용합니다. 기본 시스템 Node 20.4.0으로 실행하지 마세요.

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

nvm이 없다면 Node 24를 설치한 뒤 실행하세요. 검증 환경은 Node 24.19.0 / npm 9.7.2입니다.

```sh
npm run typecheck
npm run lint
npm run test
npm run test:watch
VITE_APP_ENV=preview npm run build
npm run preview
# 실제 운영 산출물이 필요할 때만:
VITE_APP_ENV=production npm run build
```

`test`는 Vitest run으로 종료되며 빈 테스트를 통과시키지 않습니다. 환경값 없는 build와 development build는 실패하도록 구성했습니다. `preview` 명령은 이미 만들어진 dist를 제공하며 DB 환경을 바꾸지 않습니다. preview 환경으로 먼저 빌드하세요. dev 기본값은 development입니다.

| 환경 | DB 이름 |
|---|---|
| development | dasissum-dev |
| preview | dasissum-preview |
| production | dasissum |
| 테스트 | 매 테스트 test-UUID |

VITE_ 환경변수는 브라우저에 공개됩니다. 비밀키나 실제 사용자 데이터를 저장소에 커밋하지 마세요. `.env.example` 이외 .env 파일은 gitignore에 포함했습니다.

## 현재 기능과 구조

- src/app: 라우터·최상위 오류 경계. src/pages: 7개 임시 페이지 + NotFound.
- src/features/records: 코드·표시 문구·모티프, Zod 판별 유니온, 금액/판단 전환, 기록 service/repository.
- src/features/drafts: 미완성 값 검증, 초안 service/repository.
- src/features/settings: 분석 선택값, JSON export, 전체 삭제. SDK 없음.
- src/lib/db.ts: 이름 주입 Dexie factory. import 시 DB 생성/열기 없음.
- src/lib/services.ts: createServices(db, runtime)로 테스트/호출. createBrowserServices()는 환경을 검사해 지연 생성하며 현재 화면에는 연결하지 않았습니다.
- tests/unit, tests/integration: 순수 검증과 실제 Dexie/fake-indexeddb 트랜잭션 테스트.

모든 서비스 메서드는 Promise<Result<T>>를 반환합니다. API는 HTTP가 아닌 로컬 TypeScript 함수입니다. repository는 throw할 수 있으며 service에서 오류를 변환합니다. 자세한 호출 계약은 docs/api-contract.md를 참고하세요.

## 저장 한계

같은 브라우저·같은 사이트 주소의 IndexedDB에만 저장합니다. 브라우저 데이터 삭제 시 소실될 수 있고 동기화·자동 복구·JSON 가져오기는 없습니다. 로그인도 없습니다. 로컬 저장이 오프라인 앱 재실행을 보장하지 않습니다. 초기화/업그레이드 오류 시 자동 DB 삭제를 하지 않습니다. DB 스키마 변경은 후속 버전 마이그레이션으로 처리해야 합니다.

문자 길이는 JS string.length(UTF-16 코드 단위)이며 이모지는 두 자 이상일 수 있습니다. createdAt은 구매일이 아닌 기록일입니다.

## 디자인 시작점

- docs/design-handoff.md: 소비 입력 / 판단 입력 / 결과·상세 카드의 필드·분기·상태.
- docs/visual-concept.md: RE:PLAY 소비 리플레이 계약.
- docs/implementation-status.md: 검증 결과와 남은 제한.
- docs/api-contract.md: 서비스와 설계 판단.

완성된 디자인이나 출시 준비 상태가 아닙니다. 다음 단계는 Figma 핵심 3화면 디자인입니다.

## 공식 설정 참고

[Vite 시작 안내](https://vite.dev/guide/)의 Node 요구사항과 [Tailwind Vite 연결](https://tailwindcss.com/docs/installation/using-vite)을 확인하고 적용했습니다. 실제 설치 버전은 package-lock.json과 구현 보고서에 고정되어 있습니다.

글자 수 검증은 `src/features/records/text-validation.ts`의 `validateTextLength`를 공유합니다. 후속 글자 수 UI도 이 함수의 trim 후 UTF-16 length/max와 검증 결과를 재사용합니다. 제목 1–40, 다음 소비 기준 0–100이며 이모지 😀는 2 코드 단위입니다.
