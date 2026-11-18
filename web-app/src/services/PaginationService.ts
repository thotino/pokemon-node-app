export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

export class PaginationService {
    static readonly DEFAULT_SIBLINGS = 1;

    static clamp(page: number, totalPages: number): number {
        if (!Number.isFinite(page)) {
            return 1;
        }
        return Math.min(Math.max(Math.trunc(page), 1), Math.max(totalPages, 1));
    }

    static rangeOf(start: number, end: number): number[] {
        return Array.from(
            { length: end - start + 1 },
            (_, index) => start + index,
        );
    }

    static items(
        page: number,
        totalPages: number,
        siblings: number = PaginationService.DEFAULT_SIBLINGS,
    ): PaginationItem[] {
        if (totalPages <= 0) {
            return [];
        }

        const visibleSlots = siblings * 2 + 5;
        if (totalPages <= visibleSlots) {
            return PaginationService.rangeOf(1, totalPages);
        }

        const current = PaginationService.clamp(page, totalPages);
        const left = Math.max(current - siblings, 2);
        const right = Math.min(current + siblings, totalPages - 1);
        const showStartEllipsis = left > 3;
        const showEndEllipsis = right < totalPages - 2;
        const edgeCount = siblings * 2 + 3;

        if (!showStartEllipsis) {
            return [
                ...PaginationService.rangeOf(1, edgeCount),
                "ellipsis-end",
                totalPages,
            ];
        }
        if (!showEndEllipsis) {
            return [
                1,
                "ellipsis-start",
                ...PaginationService.rangeOf(
                    totalPages - edgeCount + 1,
                    totalPages,
                ),
            ];
        }
        return [
            1,
            "ellipsis-start",
            ...PaginationService.rangeOf(left, right),
            "ellipsis-end",
            totalPages,
        ];
    }
}
