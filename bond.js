class Bond {
    static bondTypes = [];

    constructor(bondType, q1, r1, q2, r2) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements.bondContainer.appendChild(this.elem);
        this.setBondType(bondType);
        this.setPosition(q1, r1, q2, r2);
        this.elem.classList.add("glide");
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
        if (this.q1 == q1 && this.r1 == r1 && this.q2 == q2 && this.r2 == r2) {
            return;
        }

        this.q1 = q1;
        this.r1 = r1;
        this.q2 = q2;
        this.r2 = r2;

        let [x1, y1] = HexIndex.toXY(this.q1, this.r1);
        let [x2, y2] = HexIndex.toXY(this.q2, this.r2);

        let angle = 180 * (Math.atan2(y2 - y1, x2 - x1) / Math.PI);

        this.elem.setAttribute("transform", `translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) rotate(${angle}) translate(-12, -5)`);
    }

    remove() {
        this.elem.remove();
    }

}