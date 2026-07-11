class Atom {
    /** @type {Map<string, string[]>} */
    static atomTypes = new Map();

    constructor(ghost = false) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements[ghost ? "ghostAtomContainer" : "atomContainer"].appendChild(this.elem);
        this.setAtomType("");
        this.setPosition(0n, 0n);
        this.elem.classList.add("glide");
        if (ghost) {
            this.elem.classList.add("ghost");
        }
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

    toString() {
        let [name, namespace] = this.atomType.split("__");
        let inferred = typeof(inferNamespace(name)[0]) == "string";
        if (inferred) {
            return `${name.replaceAll("_", " ")} ${this.pos}`;
        }
        return `${namespace}:${name.replaceAll("_", " ")} ${this.pos}`;

    }
}