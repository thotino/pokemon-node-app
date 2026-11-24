import type { Server } from "node:http";
import * as connectors from "./connectors";

async function startConnectors() {
    await Promise.all(
        Object.values(connectors).map(connector => connector.connect()),
    );
}

async function stopConnectors() {
    await Promise.all(
        Object.values(connectors).map(connector => connector.close()),
    );
}

function startServer(server: Server, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
            server.off("listening", onListening);
            reject(error);
        };
        const onListening = () => {
            server.off("error", onError);
            resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port);
    });
}

function stopServer(server: Server, delayMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => server.closeAllConnections(), delayMs);
        server.close(error => {
            clearTimeout(timer);
            if (error != null) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

export async function start(server: Server, port: number) {
    await startConnectors();
    await startServer(server, port);
}

export async function shutdown(server: Server, delayMs: number) {
    await stopServer(server, delayMs);
    await stopConnectors();
}
