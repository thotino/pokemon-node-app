import { createLogger, format, transports } from "winston";

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

export const logger = createLogger({
    levels,
    level: process.env.LOG_LEVEL ?? "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
    ),
    transports: [new transports.Console()],
});
