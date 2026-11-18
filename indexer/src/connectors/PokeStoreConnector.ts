import { BaseConnectorInterface } from "../types/connector";
import { Client } from "@elastic/elasticsearch";
export type PokeStoreConnectorParams = {
    url: string;
};
export default class PokeStoreConnector implements BaseConnectorInterface {
    readonly client: Client;
    #params: PokeStoreConnectorParams;
    constructor(params: PokeStoreConnectorParams) {
        this.#params = params;
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
}
