import {
    type CSSProperties,
    type PointerEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface Rotation {
    x: number;
    y: number;
}

const REST: Rotation = { x: 0, y: 0 };

export function useTilt(maxDegrees = 10) {
    const reduceMotion = usePrefersReducedMotion();
    const [rotation, setRotation] = useState<Rotation>(REST);
    const frame = useRef<number | null>(null);

    const cancelFrame = useCallback(() => {
        if (frame.current !== null) {
            cancelAnimationFrame(frame.current);
            frame.current = null;
        }
    }, []);

    useEffect(() => cancelFrame, [cancelFrame]);

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLElement>) => {
            if (reduceMotion || event.pointerType !== "mouse") {
                return;
            }
            const box = event.currentTarget.getBoundingClientRect();
            const offsetX = (event.clientX - box.left) / box.width - 0.5;
            const offsetY = (event.clientY - box.top) / box.height - 0.5;

            cancelFrame();
            frame.current = requestAnimationFrame(() => {
                frame.current = null;
                setRotation({
                    x: offsetY * 2 * maxDegrees,
                    y: -offsetX * 2 * maxDegrees,
                });
            });
        },
        [reduceMotion, maxDegrees, cancelFrame],
    );

    const onPointerLeave = useCallback(() => {
        cancelFrame();
        setRotation(REST);
    }, [cancelFrame]);

    const style: CSSProperties | undefined = reduceMotion
        ? undefined
        : {
              transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              transition:
                  "transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)",
          };

    return { style, onPointerMove, onPointerLeave };
}
