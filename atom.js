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
        if (this.pos?.q == q && this.pos?.r == r) {
            return;
        }
        this.pos = new HexIndex(q, r);
        let [x, y] = this.pos.toXY();
        x -= 30;
        y -= 30;
        this.elem.setAttribute("transform", `translate(${x}, ${y})`);
    }

    remove() {
        this.elem.remove();
    }
}