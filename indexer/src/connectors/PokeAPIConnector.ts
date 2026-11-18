import { BaseConnectorInterface } from "../types/connector";
import ky from "ky";

export type PokeAPIConnectorParams = {
    url: string;
};
export default class PokeAPIConnector implements BaseConnectorInterface {
    readonly client;
    #params: PokeAPIConnectorParams;
    constructor(params: PokeAPIConnectorParams) {
        this.#params = params;
        this.client = ky.create({ prefix: this.#params.url });
    }
    async connect() {}
    async close() {}
}
