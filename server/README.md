# pillcheck OCR API

영양제 성분표 사진을 읽어 성분·함량을 뽑아주는 Cloudflare Worker.

앱(`src/ocr.ts`)이 `openCamera`로 찍은 사진을 base64로 보내면, 앱이 아는 성분 목록 안에서만
골라 `{ key, amount }` 배열로 돌려준다.

## 배포

```bash
cd server
npm install

# 1) 하루 호출 한도를 세는 KV 생성 → 출력된 id를 wrangler.jsonc 의 PLACEHOLDER_KV_ID 에 넣는다
npx wrangler kv namespace create RATE

# 2) Anthropic API 키 등록 (번들에는 들어가지 않는다)
npx wrangler secret put ANTHROPIC_API_KEY

# 3) 배포
npx wrangler deploy
```

배포 후 주소가 `https://pillcheck-api.<계정>.workers.dev` 와 다르면
앱의 `src/ocr.ts` → `OCR_ENDPOINT` 를 맞춰준다.

## 확인

```bash
curl https://pillcheck-api.<계정>.workers.dev/health
# → {"ok":true,"model":"claude-opus-5","hasKey":true}
```

`hasKey:false` 면 secret 이 등록되지 않은 것이다.

## 엔드포인트

### `POST /ocr`

```jsonc
{
  "image": "<base64, data URI 접두사 없이>",
  "mediaType": "image/jpeg",
  "ingredients": [{ "key": "vitD", "name": "비타민 D", "unit": "㎍" }],
  "deviceId": "<익명 id — 기기별 한도 계산용>"
}
```

응답:

```jsonc
{
  "readable": true,           // 성분표를 읽을 수 있었는지
  "items": [{ "key": "vitD", "amount": 25 }],
  "productName": "",          // 제품명이 보이면
  "note": ""                  // 불확실한 부분 안내
}
```

## 비용

모델은 `src/index.ts` 의 `MODEL` 한 줄로 바꾼다.

| 모델 | 사진 1장당 대략 비용 |
|---|---|
| `claude-opus-5` (현재) | 약 30원 |
| `claude-haiku-4-5` | 약 6원 |

영양제 등록은 자주 하는 일이 아니라 호출량 자체는 적지만, 정확도와 비용을 견줘
`MODEL` 을 정하면 된다. 성분표는 작은 글씨에 단위(㎍/mg/IU)가 섞여 있어
싼 모델일수록 오인식이 늘어난다.

## 남용 방지

- 기기당 하루 20회, 앱 전체 하루 2,000회 (KV 카운터, 26시간 TTL)
- 이미지 4MB 상한
- 모델이 목록 밖 성분이나 비정상 수치를 내면 서버가 걸러낸다

## 오인식을 줄이려고 넣은 규칙 (`src/index.ts` 시스템 프롬프트)

- `%영양성분기준치(%DV)`를 함량으로 쓰지 않는다 — 성분표에서 가장 헷갈리는 값이다
- IU 표기는 환산한다 (비타민D 1 IU = 0.025㎍, 비타민E 1 IU = 0.67mg)
- 단위를 앱 사전 기준으로 맞춘다 (1000㎍ → mg 성분이면 1)
- 흐리거나 잘려서 확신이 없으면 그 성분을 빼고 `note` 로 알린다
- 추측해서 채우지 않는다
