import { BaseConnectorInterface } from "../types/connector";
import { Client } from "@elastic/elasticsearch";
type IndexScrollParams = {
    index: string;
    body: object;
    size?: number;
    scroll?: string;
};
export type PokeStoreConnectorParams = {
    url: string
}
const POKE_STORE_URL = process.env.POKE_STORE_URL ?? "http://localhost:9200";
export default class PokeStoreConnector implements BaseConnectorInterface {
    readonly client: Client;
    #params: PokeStoreConnectorParams
    constructor(params: PokeStoreConnectorParams) {
        this.#params = params
        this.client = new Client({
            node: this.#params.url,
        });
    }
    async connect() {
        await this.client.ping();
    }
    async close() {
        await this.client.close();
    }

    async *scroll(params: IndexScrollParams) {
        const searchParams = { ...params, scroll: params.scroll ?? "5m" };
        let response = await this.client.search(searchParams);
        try {
            while (response.hits.hits.length > 0) {
                yield* response.hits.hits;
                if (response._scroll_id == null) {
                    break;
                }
                response = await this.client.scroll({
                    scroll: searchParams.scroll,
                    scroll_id: response._scroll_id,
                });
            }
        } finally {
            if (response._scroll_id != null) {
                await this.client.clearScroll({
                    scroll_id: [response._scroll_id],
                });
            }
        }
    }
}
