To install and launch: 

npm install 
npm run dev

## Chatbot configuration

The `POST /battles` route calls the VirtualBrain chatbot. Provide its credentials through the environment:

| Variable | Default | Purpose |
|---|---|---|
| `CHATBOT_URL` | `https://chatbot-api.getvirtualbrain.com` | VirtualBrain API URL |
| `CHATBOT_API_KEY` | *(empty)* | API key (`vb_ak_...`), never commit it |
| `CHATBOT_RETRY_LIMIT` | `3` | Retries on 429 / 503 |
| `CHATBOT_MAX_RETRY_AFTER_MS` | `10000` | Longest `Retry-After` wait accepted; beyond it, give up at once |
| `CHATBOT_BACKOFF_LIMIT_MS` | `5000` | Longest delay between retries without `Retry-After` |

## `POST /battles`

Body: 2 to 6 distinct Pokémon ids.

```bash
curl -N -X POST http://localhost:3001/battles \
  -H "Content-Type: application/json" \
  -d '{"pokemonIds": ["25", "6"]}'
```

Success: `200`, `text/plain; charset=utf-8`, the battle narration streamed as it is generated. The `X-Session-Id` header carries the chatbot session id, for follow-up questions.

Errors are JSON `{ "code", "message", "value" }`:

| Status | `code` | When |
|---|---|---|
| 400 | `ERR_INVALID_BATTLE_REQUEST` | Invalid `pokemonIds` |
| 404 | `ERR_POKEMON_NOT_FOUND` | Unknown Pokémon; `value` lists their ids |
| 429 | `ERR_CHATBOT_RATE_LIMITED` | Chatbot rate limit; `value` and `Retry-After` give the wait in seconds |
| 502 | `ERR_CHATBOT_UNAVAILABLE` | The chatbot failed or timed out |
| 500 | `ERR_INTERNAL` | Any other error |

If the client disconnects, the chatbot request is aborted.

