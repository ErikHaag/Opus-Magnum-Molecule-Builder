class Bond {
    static bondTypes = [];

    constructor(ghost = false) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements[ghost ? "ghostBondContainer" : "bondContainer"].appendChild(this.elem);
        this.setBondType("");
        this.setPosition(0n, 0n, 0n, 0n);
        this.elem.classList.add("glide");
        if (ghost) {
            this.elem.classList.add("ghost");
        }
    }

    setBondType(bondType) {
        if (this.bondType == bondType) {
            return;
        }
        this.bondType = bondType;
        this.elem.setAttribute("href", `#${this.bondType}_bond`);
    }

    setPosition(q1, r1, q2, r2) {
        if (HexIndex.compare(q1, r1, q2, r2) > 0) {
            // swap (q1, r1) with (q2, r2)
            let temp = q1;
            q1 = q2;
            q2 = temp;
            temp = r1;
            r1 = r2;
            r2 = temp;
        }
        if (this.start?.q == q1 && this.start?.r == r1 && this.end?.q == q2 && this.end?.r == r2) {
            return;
        }

        this.start = new HexIndex(q1, r1);
        this.end = new HexIndex(q2, r2);

        let [x1, y1] = this.start.toXY();
        let [x2, y2] = this.end.toXY();

        let angle = 180 * (Math.atan2(y2 - y1, x2 - x1) / Math.PI);

        this.elem.setAttribute("transform", `translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) rotate(${angle}) translate(-12, -5)`);
    }

    remove() {
        this.elem.remove();
    }

    toString() {
        return `${this.bondType.replace("_", " ")} ${this.start} ${this.end}`;
    }
}