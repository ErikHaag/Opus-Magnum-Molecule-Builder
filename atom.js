class Atom {
    static atomTypes = new Map();

    constructor(atomType, q, r) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements.atomContainer.appendChild(this.elem);
        this.setAtomType(atomType);
        this.setPosition(q, r);
        this.elem.classList.add("glide");
    }

    setAtomType(atomType) {
        if (this.atomType == atomType) {
            return;
        }
        this.atomType = atomType;
        this.elem.setAttribute("href", `#OMA_A_${this.atomType}`);
    }

    setPosition(q, r) {
        if (this.q == q && this.r == r) {
            return;
        }
        this.q = q;
        this.r = r;
        let [x, y] = HexIndex.toXY(this.q, this.r);
        x -= 30;
        y -= 30;
        this.elem.setAttribute("transform", `translate(${x}, ${y})`);
    }

    remove() {
        this.elem.remove();
    }
}