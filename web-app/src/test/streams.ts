export function textStream(
    chunks: Array<string | Uint8Array>,
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            chunks.forEach(chunk =>
                controller.enqueue(
                    typeof chunk === "string" ? encoder.encode(chunk) : chunk,
                ),
            );
            controller.close();
        },
    });
}

export function pendingStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
        },
    });
}
