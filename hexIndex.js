function abs(v) {
    return v >= 0n ? v : -v;
}

export class HexIndex {
    constructor(q, r) {
        this.q = q;
        this.r = r;
    }

    get s() {
        return -(this.q + this.r);
    }

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

    static polymerCollision(h1, h2, rO) {
        if (rO.q == 0n && rO.r == 0n) {
            return { collides: (h1.q == h2.q) && (h1.r == h2.r), deltaMonomer: 0n }
        }
        const qDiff = h2.q - h1.q;
        const rDiff = h2.r - h1.r;
        if (rO.q == 0n) {
            if (qDiff == 0n && rDiff % rO.r == 0n) {
                return { collides: true, deltaMonomer: rDiff / rO.r };
            }
        } else if (rO.r == 0n) {
            if (rDiff == 0n && qDiff % rO.q == 0n) {
                return { collides: true, deltaMonomer: qDiff / rO.q };
            }
        } else if (qDiff % rO.q == 0n) {
            if (h1.r + (qDiff / rO.q) * rO.r == h2.r) {
                return { collides: true, deltaMonomer: qDiff / rO.q };
            }
        }
        return { collides: false, deltaMonomer: 0n };
    }

    static offsets = [
        new HexIndex(0n, -1n),
        new HexIndex(1n, -1n),
        new HexIndex(1n, 0n),
        new HexIndex(0n, 1n),
        new HexIndex(-1n, 1n),
        new HexIndex(-1n, 0n),
    ]

    copy() {
        return new HexIndex(this.q, this.r);
    }

    equals(other) {
        return this.q == other.q && this.r == other.r;
    }

    increment(other) {
        this.q += other.q;
        this.r += other.r;
    }

    distance(other) {
        return (abs(other.q - this.q) + abs(other.r - this.r) + abs(other.s - this.s)) / 2n;
    }

    mirror() {
        this.q = this.s;
    }

    scale(f) {
        this.q *= f;
        this.r *= f;
    }

    rotateClockwise() {
        let s = this.s;
        this.r = -this.q
        this.q = -s;
    }

    rotateCounterClockwise() {
        let s = this.s;
        this.q = -this.r;
        this.r = -s;
    }

    toString() {
        return `${this.q} ${this.r}`;
    }

    toXY() {
        return [82 * Number(this.q) + 41 * Number(this.r), -Math.sqrt(3) * 41 * Number(this.r)];
    }
}