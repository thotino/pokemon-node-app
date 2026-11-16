import { BaseConnectorInterface } from "../types/connector.js";
import { Client } from "@elastic/elasticsearch";

export default class PokeStoreConnector implements BaseConnectorInterface {
    readonly client: Client;
    constructor() {
        this.client = new Client({
            node: "http://localhost:9200"
        })
    }
    async connect() {
        await this.client.ping()
    }
    async close() {
        await this.client.close()
    }
}
