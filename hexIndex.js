class HexIndex {
    static compare(q1, r1, q2, r2) {
        let diff = q1 - q2;
        if (diff != 0n) {
            return diff > 0n ? 1 : -1;
        }
        diff = r1 - r2;
        if (diff != 0n) {
            return diff > 0n ? 1 : -1;
        }
        return 0;
    }

    static toXY(q, r) {
        return [82 * Number(q) + 41 * Number(r), -Math.sqrt(3) * 41 * Number(r)]
    }
}