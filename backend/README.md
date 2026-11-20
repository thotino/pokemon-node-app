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

Errors follow the [shared format](#errors):

| Status | `code` | When |
|---|---|---|
| 400 | `ERR_INVALID_REQUEST` | Invalid body; `validationErrors` tells what is wrong |
| 404 | `ERR_POKEMON_NOT_FOUND` | Unknown Pokémon; `value` lists their ids |
| 429 | `ERR_CHATBOT_RATE_LIMITED` | Chatbot rate limit; `value` and `Retry-After` give the wait in seconds |
| 502 | `ERR_CHATBOT_UNAVAILABLE` | The chatbot failed or timed out |
| 500 | `ERR_INTERNAL` | Any other error |

If the client disconnects, the chatbot request is aborted.

## Request validation

Every route validates its input with [ajv](https://ajv.js.org/) JSON schemas before reaching the controller:

| Route | Input | Rules |
|---|---|---|
| `GET /pokemons` | query | `q`: at most 100 characters; `types`: 1 to 18 distinct, non blank values (`?types=fire&types=water`); `from`: integer ≥ 0, default `0`; `size`: integer from 1 to 100, default `20`; no other parameter |
| `GET /pokemons/:id` | params | `id`: positive integer, no leading zero |
| `GET /contents/:pokemonId` | params | `pokemonId`: positive integer, no leading zero |
| `POST /battles` | body | `pokemonIds`: 2 to 6 distinct ids, as strings or integers; no other key |

Query strings are converted (`size=5` becomes `5`, a single `types` becomes an array) and defaults applied. Invalid input is rejected with `400 ERR_INVALID_REQUEST`, listing every problem at once.

To validate a new route, add a schema in `src/controllers/schemas/` and declare it with `validateRequest`. The controller reads the converted values from `res.locals.validated`:

```ts
PokemonController.get(
    "/:id",
    validateRequest({ params: PokemonSchemas.idParams }),
    async (_req: Request, res: Response<unknown, ValidatedLocals<PokemonIdParams>>) => {
        const { id } = res.locals.validated.params;
        // ...
    },
);
```

## Errors

All errors are JSON, built by the `handleError` middleware from the error thrown by the services:

```json
{
  "code": "ERR_INVALID_REQUEST",
  "message": "Request validation failed",
  "value": null,
  "validationErrors": [
    { "location": "query", "path": "/size", "keyword": "maximum", "message": "must be <= 100" }
  ]
}
```

- `validationErrors` is only present on `400 ERR_INVALID_REQUEST`. `location` is `params`, `query` or `body`, and `path` is a JSON Pointer to the invalid value.
- A body Express cannot read (malformed JSON, too large) also answers `ERR_INVALID_REQUEST`, with the Express status (`400`, `413`, `415`).

| Status | `code` | When |
|---|---|---|
| 400 | `ERR_INVALID_REQUEST` | Invalid params, query or body |
| 404 | `ERR_POKEMON_NOT_FOUND` | Unknown Pokémon; `value` lists their ids |
| 429 | `ERR_CHATBOT_RATE_LIMITED` | Chatbot rate limit; `value` and `Retry-After` give the wait in seconds |
| 502 | `ERR_CHATBOT_UNAVAILABLE` | The chatbot failed or timed out |
| 500 | `ERR_INTERNAL` | Any other error, logged by the server |

To add an error, create a class in `src/errors/` implementing `ServiceErrorInterface` with its own `code`, throw it from a service, and map it to a status in `toWebserverError`.

