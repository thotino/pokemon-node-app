import { BaseConnectorInterface } from "../types/connector.js";
import ky from "ky";

const POKE_API_URL = process.env.POKE_API_URL;
export default class PokeAPIConnector implements BaseConnectorInterface {
    readonly client;
    constructor() {
        this.client = ky.create({ prefix: POKE_API_URL });
    }
    async connect() {}
    async close() {}
}
