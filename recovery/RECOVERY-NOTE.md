# 영양제 챙겨먹기 (pillcheck) — 백업 복구 노트

작성: 2026-08-24 / 원천: 아이폰 백업 `00008150-000A095921F8401C`

## 1. 결론 요약

- **소스 유실 아님.** `pill-check/`(최신, 커밋 `0a13a75` 2026-04-06)와 `pillcheck/`(구, `ce953c5` 2026-04-01) 두 폴더가 로컬에 있고, 각각 GitHub 원격(`youdongLee/pill-check`, `youdongLee/pillcheck`)에 연결돼 있음. 워킹트리 클린, stash 없음.
- **백업 데이터 완전 생존.** 배포 번들(.hbc)·실사용 mmkv 데이터 모두 추출 완료 → `pillcheck-recovery/`
- **소스(4/6) ≠ 배포본(4/23).** 약 17일치 미커밋 변경분이 배포본에만 있음. 아래 3항 참조.

## 2. 추출물 (`pillcheck-recovery/`)

| 파일 | 내용 |
|---|---|
| `pillcheck.hbc` | 배포 번들 993,588B |
| `pillcheck.hbc.meta.json` | deployedAt **20260423211823**, deploymentID `019dba46-067c-731c-8932-5403a8a9bfa6`, RN 0.84.0 |
| `mmkv.bin` | 컨테이너 `35adb77052ed6eb5…` 원본 16,384B |
| `mmkv_dump.txt` | 파싱된 실데이터 (28행까지 유효, 29행 이후는 MMKV append 잔여 조각) |
| `hbc_strings.txt` | 번들 ASCII 문자열 |
| `hbc_korean.txt` | 번들 한글 UI 문구 614종 (134행부터 유효, 앞은 UTF-16 오정렬 노이즈) |

## 3. 소스 ↔ 배포본 차이 (미커밋 변경분)

| 저장 키 | 소스(4/6) | 배포본(4/23) | 실데이터 |
|---|---|---|---|
| `@pillcheck/pills` | ✅ | ✅ | ✅ |
| `@pillcheck/record_<YYYY-MM-DD>` | ✅ | ✅ | ✅ 03-27 ~ 04-30 |
| `@pillcheck/maxSlots` | ✅ | ✅ | `3` |
| `@pillcheck/presets` | ✅ | ✅ | ✅ |
| `@pillcheck/maxPresets` | ✅ | ✅ | `1` |
| `@pillcheck/daySchedule` | ✅ | ✅ | `{}` |
| `@pillcheck/lastAutoLoad` | ✅ | ✅ | (없음) |
| `@pillcheck/stamps` | ✅ | ✅ | `[]` |
| `@pillcheck/streakMilestone` | ✅ | ❌ **제거됨** | `1` (구버전 잔재) |
| `@pillcheck/claimedDate` | ❌ | ✅ **추가됨** | `2026-04-23` |

→ 배포본은 소스의 **7일 연속 마일스톤(streakMilestone) 지급 → 하루 1회 지급(claimedDate)** 으로 보상 구조를 바꾼 버전. 번들 문자열에 `PILLCHECK_STREAK_7`·`milestone`이 없고 `claimedDate`가 있는 것으로 확인.

**광고 ID는 소스=배포본 일치**: 리워드 `ait.v2.live.7848babf27974479`, 배너 `ait.v2.live.a0ee7a06ab474249`.

## 4. 데이터 스키마 (실데이터 확정)

```jsonc
// @pillcheck/pills
[{"name":"종합 비타민","emoji":"💊","color":"#22C55E",
  "times":["08:00","12:00","18:00"],"id":"bguddcfpmokapo7y"}]

// @pillcheck/record_2026-04-10
{"date":"2026-04-10","intakes":[
  {"pillId":"surp49gjmnq17c4q","pillName":"종합 비타민","time":"08:00","taken":true}]}

// @pillcheck/presets
[{"id":"efjw7xeamokat1xo","name":"ㅡㄹㄹ",
  "pills":[{"name":"비타민 C","emoji":"💊","color":"#22C55E",
            "times":["08:00","12:00","18:00"]}],"savedAt":"2026-04-30"}]

// @pillcheck/daySchedule  → {}  (요일별 자동 제안, 미사용 상태)
// @pillcheck/maxSlots 3 / @pillcheck/maxPresets 1 / @pillcheck/stamps []
// @pillcheck/claimedDate "2026-04-23"  (문자열, 따옴표 없음)
```

실사용 흔적: 03-27 최초 기록, 04-08~04-23 거의 매일 체크(종합 비타민 3회/일 + 비타민C·칼슘·비타민B), 04-24 이후 중단.

## 5. 복구/재개 시 유의점

1. **마이그레이션 불필요** — 구버전 키를 그대로 재사용하면 기존 사용자 기록이 이어짐.
2. 소스 재개 시 `pill-check/`(docs/terms.html 포함된 쪽)를 기준으로 할 것. `pillcheck/`는 한 커밋 뒤처짐 — 정리 시 삭제 후보.
3. 소스에 없는 배포본 변경분(claimedDate 기반 일 1회 지급)은 재구현 대상. 현행 표준인 **목돈식 지급 분리**(광고→스탬프→탭 지급)로 다시 짜는 편이 나음.
4. 배포본 UI 문구 전체는 `hbc_korean.txt`에서 회수 가능(플랜 슬롯, 광고 보고 슬롯 추가, 미션 도장 등).
5. `granite.config.ts` appName **`pillcheck`** 고정, displayName `영양제 챙겨먹기`, primaryColor `#22C55E`, 아이콘 URL(28423 슬롯) 유지.
