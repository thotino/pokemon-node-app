import { BaseConnectorInterface } from "../types/connector.js";
import ky from "ky";

const POKEAPI_URL = "https://pokeapi.co/api/v2";
export default class PokeAPIConnector implements BaseConnectorInterface {
    readonly client;
    constructor() {
        this.client = ky.create({ prefix: POKEAPI_URL });
    }
    async connect() {}
    async close() {}
}
