# 구현 상태 — 1·2단계

완료 기준: 디자인을 얹을 수 있는 데이터·검증 기반. 화면 디자인과 출시 준비 완료를 의미하지 않습니다.

## 기존 상태와 작업 범위

현재 지정 프로젝트 루트는 소스/package.json/lockfile/Git이 없는 빈 작업 공간이었습니다. 루트와 상위 경로에 적용할 AGENTS.md가 없음을 확인했습니다. CODEX_START_PHASE_1_2.md와 참고 dasissum_day1_technical_spec.md를 읽고 사용자가 요청한 1·2단계 범위를 구현했습니다. 1·2단계 구현 당시에는 Git 초기화·commit·push를 하지 않았습니다. 이후 사용자 요청으로 기존 GitHub 저장소 kwakina12/RE-PLAY의 main 이력을 이어 현재 구현을 커밋할 준비를 했습니다.

1단계 완료: React/TypeScript strict/Vite/Router/Tailwind 중립 토큰, @/ 별칭, ESLint, npm scripts와 lockfile, 공개 환경변수 안내, 환경별 DB 이름, 명시적 preview/production 빌드 검사, 7개 임시 페이지+NotFound 및 오류 경계.

1단계 검증 후 2단계 진행: typecheck/lint/preview build 성공. Vite 개발 서버 시작 확인. 내장 브라우저에서 HomePage 표시와 홈 링크를 통한 `/records/new/expense`의 ExpensePage 이동 확인. 다른 임시 경로를 전부 브라우저에서 검증한 것은 아닙니다.

2단계 완료: 도메인/초안 strict Zod 검증, 금액 정규화, 판단 전환 제안, Dexie DB factory와 3개 테이블, 모든 내부 API, 트랜잭션/멱등성/revision 충돌, JSON export, 설정 기본값/업데이트, 원자적 전체 삭제, 오류 변환, 단위 및 DB 통합 테스트. UI와 DB 플로우는 다음 단계입니다.

## 이번 추가 요청 변경 파일

- src/features/records/text-validation.ts: `validateTextLength` 공통 함수와 필드별 제한. trim 후 명시적 JS string.length(UTF-16 코드 단위).
- src/features/records/schema.ts: 제목·다음 소비 기준이 공통 검증 함수를 사용. 제목 1–40, 다음 기준 0–100, 선택 빈값은 null. unsure 계약 유지.
- tests/unit/text-validation.test.ts: 제목 39/40/41, 다음 기준 99/100/101을 각각 일반 한글 및 이모지 혼합으로 확인. trim, 빈값, 😀=2, 가족 이모지=11, 결합문자 사례. helper와 실제 스키마 결과를 모두 검증.
- README.md, docs/api-contract.md, docs/design-handoff.md: 동일 길이 기준과 향후 글자 수 UI에서 함수의 length/max 및 검증 상태를 재사용할 계약.
- docs/implementation-status.md: 실행 결과 및 미확인 범위.

이전 도메인 테스트에 있던 제목/다음 규칙 이모지 회귀 사례도 유지합니다. 모든 직접 의존성의 실제 버전은 docs/dependency-versions.md에 기록했습니다. 주요 버전: React 19.3.0, TypeScript 6.0.3, Vite 8.3.1, Router 7.18.4, Tailwind 4.3.3, Dexie 4.4.6, Zod 4.6.5, Vitest 5.0.2, fake-indexeddb 6.2.5.

## 최종 검증 — 2026-09-26

사용 런타임: Node 24.19.0 / npm 9.7.2. 아래 모든 명령은 프로젝트 루트에서 실행했고 종료 코드 0입니다.

| 명령 | 결과 |
|---|---|
| npm run typecheck | 통과 |
| npm run lint | 통과 |
| npm run test -- tests/unit | 2개 파일, 83개 통과 |
| npm run test -- tests/integration | 1개 파일, 18개 통과 |
| npm run test | 전체 3개 파일, 101개 통과 |
| VITE_APP_ENV=preview npm run build | 통과 |

테스트는 mock repository 대신 실제 Dexie+fake-indexeddb를 사용합니다. 각 테스트 DB는 고유 이름으로 만들고 종료 후 삭제합니다. 실패 주입은 Dexie 테이블 hook에서 수행하고 최종 DB 상태로 롤백을 검증합니다. 신규 동시 저장, 수정 경합, 오래된 초안, 삭제 후 재시도, AND 필터/정렬, 설정 기본 무쓰기, export 구조, clear 원자성, close/reopen 유지 등을 확인했습니다.

## 해결한 실행 문제

- 시스템 Node 20.4.0이 현재 도구 요구사항보다 낮아 번들 Node 24.19.0 사용. engines=24.x, .nvmrc=24.19.0.
- 최초 npm install이 네트워크 ENOTFOUND로 실패. 네트워크 권한 승인 후 실제 설치 성공.
- 기본 npm 캐시 접근 EPERM 발생. 시스템 캐시 권한 변경 없이 npm_config_cache=./work/npm-cache를 사용.
- 시스템 python3는 CommandLineTools 누락으로 실행 불가. 번들 Python 사용.
- TypeScript 6의 baseUrl 폐기 경고 해결: baseUrl 제거, paths의 상대 경로 사용.
- 최초 문자열 테스트에서 Zod 기본 max가 명세의 UTF-16 길이와 달랐음. 명시적인 공통 string.length 검증으로 수정하고 회귀/경계 테스트 통과.
- 테스트의 이종 Result 배열 제네릭 타입 오류 수정. 현재 검증 실패 없음.

## 남은 제한과 다음 단계

- 글자 수 UI는 아직 없으며 구현 시 validateTextLength의 length/max/valid를 재사용해야 합니다. 별도 grapheme 계산으로 대체하지 않습니다.
- 실제 모바일 Safari/Chrome의 IndexedDB 영속성·저장 용량·브라우저 데이터 제거·기기 호환성은 미검증입니다. fake-indexeddb 통과가 실기기 보장을 뜻하지 않습니다.
- Figma 핵심 3화면은 소비 입력 / 판단 입력 / 결과·상세 카드. docs/design-handoff.md와 docs/visual-concept.md가 기준입니다.
- 실제 화면 흐름, 폼/카드, 300ms 자동저장 hook, 타이머 flush/취소 및 UI 상태 초기화, 분석 SDK, E2E, 배포는 요청 범위 밖이며 수행하지 않았습니다. 없는 SDK/캐시를 초기화한 것으로 보고하지 않습니다.
- 현재 프로젝트 원본은 루트에 있으며 outputs 문서들은 검토용 복사본입니다.
