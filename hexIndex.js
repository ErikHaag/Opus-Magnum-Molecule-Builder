function abs(v) {
    return v >= 0n ? v : -v;
}

class HexIndex {
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

    toXY() {
        return [82 * Number(this.q) + 41 * Number(this.r), -Math.sqrt(3) * 41 * Number(this.r)]
    }
}