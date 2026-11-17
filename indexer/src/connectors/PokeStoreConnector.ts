import { BaseConnectorInterface } from "../types/connector";
import { Client } from "@elastic/elasticsearch";

export default class PokeStoreConnector implements BaseConnectorInterface {
    readonly client: Client;
    constructor() {
        this.client = new Client({
            node: process.env.POKE_STORE_URL
        })
    }
    async connect() {
        await this.client.ping()
    }
    async close() {
        await this.client.close()
    }
}
