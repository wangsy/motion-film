---
name: motion-film
description: 코드만으로 모션 그래픽 영상(쇼릴·제품 소개·런치 스토리·설명 영상)을 기획→오디오→프레임 렌더→독립 비평 루프→납품까지 만든다. HTML canvas + 헤드리스 Chrome(puppeteer) + ffmpeg 파이프라인. 트리거 — "/motion-film", "모션 그래픽 만들어", "쇼릴 영상", "제품 소개 영상 코드로", "motion graphic", "explainer 영상".
---

# motion-film

모션 디렉터 프롬프트(`references/director-prompt.md`)를 실행 가능한 파이프라인으로 묶은 스킬.
**규칙의 원문은 그 문서다. 시작할 때 반드시 전부 읽는다.** 이 파일은 실행 방법과 실전에서 배운 함정만 다룬다.

## 입력: 자유 문장 → brief는 내부 정리표

사용자는 brief 양식을 모른다고 가정한다. **양식을 보여주거나 채워오라고 요구하지 않는다.**
입력은 아무 형태나 된다: 한 문장("우리 앱 30초 소개 영상"), URL 하나, 폴더/파일, 이전 대화 맥락, 또는 인자 없음.

1. **추론** — 입력과 주변 맥락(작업 디렉터리의 README·package.json·로고·색상, 주어진 URL 페이지)에서 brief 14항목을 최대한 채운다.
   - URL이 있으면 직접 열어 제품명·핵심 기능 문장·로고·색·폰트를 수집 → `facts`/`brand`/`assets`가 자동으로 채워진다.
   - mode 추론: URL/제품 → product, "어떻게 작동하는지" → explainer, 캐릭터·출시 이야기 → launch-story, 대상 없음 → showreel.
2. **꼭 필요한 것만 질문** — 추론으로 못 채우고 결과를 크게 바꾸는 항목만, `AskUserQuestion` 한 번에 최대 3–4개, 선택지형으로:
   - 무엇에 관한 영상인가 (입력이 비었을 때만) — 선택지: 제품/서비스 소개 · 개념 설명 · 출시 이야기 · 내 작업 쇼릴
   - 누가 보고, 끝나고 뭘 하길 원하나 — 추론한 안을 첫 선택지로(Recommended)
   - 길이·비율 — 15초 16:9 (Recommended) · 30초 16:9 · 30초 16:9 + 9:16 세로
   - 음악 — 직접 합성 (Recommended) · 내가 파일 줄게 · 무음
   나머지(frame rate, style, toolchain, sign-off, 색·폰트 등)는 묻지 않고 기본값/추론으로 정한다.
3. **확인 한 번** — 채운 brief를 사람이 읽는 말로 5–7줄 요약해 보여준다("이렇게 만들 거예요: …"). 각 줄 끝에 (추론)/(기본값) 표시. 사용자가 고치거나 "좋아"하면 진행. `docs/brief.md`에는 14항목 표 + 이유를 기록.
4. 사용자가 이미 brief 양식을 채워 왔으면 1–3을 건너뛰고 그대로 쓴다.

- `autonomy` 기본값: **gated** — ◆ 지점(스토리보드, 스타일 프레임, 오디오)마다 보여주고 멈춘다. 사용자가 "알아서 끝까지"류로 말하면 unattended.
- 사실 출처(URL·문서)가 끝내 없으면, 화면에 넣을 수 있는 주장이 없어 자기지시적 영상이 된다는 점을 확인 단계에서 한 줄로 알린다.

## 프로젝트 구조 (작업 디렉터리 기준)

```
src/audio.mjs     ← scripts/audio.mjs 복사 후 수정 (음악+sfx 합성, timing.json 생성)
src/scene.html    ← 씬 코드. window.setTiming(t), window.renderFrame(f) 를 노출해야 함
src/render.mjs    ← scripts/render.mjs 그대로 복사
timing.json, facts.json
docs/ brief.md storyboard.md style-bible.md ledger.md quality-bar.md
out/frames/%04d.png, out/<name>.mp4, out/<name>_music-only.m4a, out/contact-sheet.png
```

## 셋업 (최초 1회 / 프로젝트당)

```bash
export PATH="$HOME/.local/share/mise/shims:$PATH"
pnpm init && pnpm add puppeteer
pnpm exec puppeteer browsers install chrome-headless-shell   # pnpm이 postinstall을 막아서 수동 설치 필요
```

## 절차

1. **facts.json** — 화면/음성의 모든 주장과 출처 문장·URL. 없는 숫자·후기·고객 로고는 금지.
2. **컨셉** — 방향 2–3개, 하나 선택, 시그니처 모먼트 3개(효과 이름 쓰지 않기) → style-bible.md.
3. **storyboard.md** — 시간 / 화면 / 목적 / 오디오 큐 / 퇴장 / 이어지는 것. ◆
4. **오디오 먼저** — `src/audio.mjs` 수정·실행 → `out/music.raw.wav`, `out/sfx.raw.wav`, `timing.json`.
   - 음악 파일이 제공되면 합성 대신 그 파일의 비트를 검출해 timing.json 작성(ffmpeg `ebur128`/onset 또는 aubio). 음악 품질이 결과 체감을 가장 크게 좌우한다.
   - 씬 경계·클릭·임팩트는 모두 비트 프레임으로. 씬 코드는 숫자를 하드코딩하지 말고 `T.events.*`를 읽는다. ◆
5. **씬 코드** — `examples/one-dot-scene.html`을 참고 구조로 쓴다(토큰·이징·spring·씬 함수·4 서브프레임 모션블러). 모든 값은 `f`의 함수.
6. **테스트 렌더** — `node src/render.mjs 0 180 8` → 3초 인코딩 확인 후 전체.
7. **마감** — `bash ~/.claude/skills/motion-film/scripts/finish.sh <name> <fps> <frames>` (믹스 −14 LUFS, 인코딩, 음악 전용본, 접촉 시트, QA 수치 출력).
8. **비평 루프** — 아래. ship 나올 때까지(최대 3라운드 기본, 사용자 지정 시 따름).
9. **납품** — deliverables 목록 + quality-bar.md + "사람이 눈·귀로 확인할 것".

## 비평 루프

빌더(나)는 판정하지 않는다. 매 전체 렌더마다 **새** general-purpose 서브에이전트를 띄운다(SendMessage로 이전 비평가 재사용 금지). 프롬프트 템플릿:

> You are a brutal motion-design critic who has seen none of the building. Review <mp4 path> (<W>x<H>, <fps>fps). Reference bar: <brief의 style/references, 없으면 top-tier studio reels>. Using ffmpeg into <scratchpad>/critic-rN/: (1) silent 2 fps contact sheet → retell the story in 3 sentences from pictures only; (2) frames every 0.2 s plus every 2 frames around each scene boundary <timing.json sceneFrames 초 단위 나열>, tile them and inspect with Read; (3) check frame one, text readability/collisions/safe margins, same-pixel handoffs, stills >0.5 s, anything assembled/slow/generic; (4) check key actions against <timing.json path>; (5) every on-screen word against <facts.json path>. **Judge text size at full resolution (crop a 1:1 region), not from downscaled sheets.** Return ranked problems with timestamps + concrete fixes, the retelling, then "ship" or "one more pass". Under 400 words.

- 가장 큰 문제부터 고치고 재렌더, ledger.md에 라운드·문제·before/after 수치 기록.
- 비평가 지적은 검증 후 반영(축소 이미지로 글자 크기를 오판한 전례 있음).

## 함정 (실전에서 겪은 것)

- `pnpm add puppeteer`만으로는 Chrome이 안 받아진다 → `puppeteer browsers install chrome-headless-shell`.
- PATH 문제: mise shims PATH export 후 pipe 오른쪽 명령이 안 잡힘 → 서브셸로 감싸거나 pipe 피하기.
- 폰트: 시스템 폰트(Avenir Next 등)는 렌더 전 `document.fonts.ready` 대기. 브랜드 폰트는 `@font-face`로 로컬 파일 고정.
- metaball 등 픽셀 필드는 다운스케일 2× 이하 + 좁은 threshold 밴드(≈0.035)여야 가장자리가 흐리지 않다.
- 홀드 구간도 미세 움직임(±5px 부유, 호흡)이 없으면 freezedetect(0.5 s)에 걸린다.
- 핸드오프: 이전 씬 마지막 프레임의 캐리어 위치·크기를 다음 씬 첫 프레임과 수치로 일치시킨다(크로스페이드로 때우면 비평가가 "assembled"로 잡는다).
- 9:16은 크롭 금지, 레이아웃 재구성. 상하 플랫폼 UI 영역(대략 상 220px / 하 420px @1080×1920) 비우기.
- 1920×1080, 60fps, 900프레임 렌더는 8 worker로 수십 초면 끝난다 — 반복을 아끼지 말 것.
