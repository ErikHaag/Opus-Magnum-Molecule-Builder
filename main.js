class Atom {
    static atomTypes = [];

    constructor(atomType, q, r) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements.atomContainers.appendChild(this.elem);
        this.setAtomType(atomType);
        this.setPosition(q, r);
        this.elem.classList.add("glide");
    }

    setAtomType(atomType) {
        if (this.atomType == atomType) {
            return;
        }
        this.atomType = atomType;
        this.elem.setAttribute("href", `#${this.atomType}_atom`);
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

class Bond {
    static bondTypes = [];

    constructor(bondType, q1, r1, q2, r2) {
        this.elem = document.createElementNS("http://www.w3.org/2000/svg", "use");
        Elements.bondContainers.appendChild(this.elem);
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
        if (q1 > q2 || (2n * q1 + r1 == 2n * q2 + r2 && r1 > r2)) {
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

class Elements {
    static init() {
        this.atomContainers = document.getElementById("atoms");
        this.atomInput = document.getElementById("atomInput");
        this.bondCollage = document.getElementById("bondCollage");
        this.bondContainers = document.getElementById("bonds");
        this.bondInput = document.getElementById("bondInput");
        this.camera = document.getElementById("camera");
        this.collage = document.getElementById("collage");
    }

    static atomContainers;
    static atomInput;
    static bondCollage;
    static bondContainers;
    static bondInput;
    static camera;
    static collage;
}

class Globals {
    static desiredAtomList = [];
    static desiredBondList = [];
    static modified = false;

    static atomList = [];
    static bondList = [];
}

class HexIndex {
    static toXY(q, r) {
        return [82 * Number(q) + 41 * Number(r), -Math.sqrt(3) * 41 * Number(r)]
    }
}

finishFunction = initialize;

function initialize() {
    Elements.init();
    let elements = Elements.collage.children.length;
    for (let i = 0; i < elements; i++) {
        let e = Elements.collage.children[0];
        Atom.atomTypes.push(e.children[0].id.substring(0, e.children[0].id.length - 5));
        Elements.collage.appendChild(e.children[0]);
        e.remove();
    }

    {
        let bS = document.getElementById("bondSymbols");
        for (let elem of Array.from(bS.children)) {
            Elements.bondCollage.appendChild(elem);
        }
        bS.remove();
    }

    for (let elem of Elements.bondCollage.children) {
        Bond.bondTypes.push(elem.id.substring(0, elem.id.length - 5));

        for (let component of Array.from(elem.children)) {
            if (component.tagName == "use") {
                let useEl = document.getElementById(component.getAttribute("href").substring(1));
                for (let c of useEl.children) {
                    elem.appendChild(c.cloneNode());
                }
                component.remove();
            }
        }
    }


    Elements.atomInput.addEventListener("focusout", atomInputUpdate);
    Elements.bondInput.addEventListener("focusout", bondInputUpdate);
    window.setInterval(displayUpdate, 1000);
}

function atomInputUpdate() {
    let i = Elements.atomInput.value
        .split("\n")
        .map((s) => s.replaceAll("_", " ").replaceAll(/ +/g, " "))
        .map((s) => {
            try {
                let r = /^ *(?<name>[\s\S]*) +(?<q>-?\d+) +(?<r>-?\d+) *$/g.exec(s).groups;
                return [r.name.toLowerCase().replaceAll(" ", "_"), BigInt(r.q), BigInt(r.r)];
            } catch {
                return s;
            }
        });

    Elements.atomInput.value = i.map((v) => typeof (v) == "string" ? v : v.join(" ")).join("\n").replaceAll("_", " ");

    Globals.desiredAtomList = i.filter((i) => typeof (i) != "string");
    Globals.modified = true;
}

function bondInputUpdate() {
    let i = Elements.bondInput.value
        .split("\n")
        .map((s) => s.replaceAll("_", " ").replaceAll(/ +/g, " "))
        .map((s) => {
            try {
                let r = /^ *(?<name>[\s\S]*) +(?<q1>-?\d+) +(?<r1>-?\d+) +(?<q2>-?\d+) +(?<r2>-?\d+) *$/g.exec(s).groups;
                return [r.name.toLowerCase().replaceAll(" ", "_"), BigInt(r.q1), BigInt(r.r1), BigInt(r.q2), BigInt(r.r2)];
            } catch {
                return s;
            }
        });

    Elements.bondInput.value = i.map((v) => typeof (v) == "string" ? v : v.join(" ")).join("\n").replaceAll("_", " ");

    Globals.desiredBondList = i.filter((i) => typeof (i) != "string");
    Globals.modified = true;
}

function displayUpdate() {
    if (!Globals.modified) {
        return;
    }
    Globals.modified = false;

    // atoms
    while (Globals.atomList.length > Globals.desiredAtomList.length) {
        Globals.atomList.pop().remove();
    }

    for (let i = 0; i < Globals.desiredAtomList.length; i++) {
        if (Globals.atomList[i] == undefined) {
            Globals.atomList.push(new Atom(...Globals.desiredAtomList[i]));
            continue;
        }
        Globals.atomList[i].setAtomType(Globals.desiredAtomList[i][0]);
        Globals.atomList[i].setPosition(Globals.desiredAtomList[i][1], Globals.desiredAtomList[i][2]);
    }

    // bonds
    while (Globals.bondList.length > Globals.desiredBondList.length) {
        Globals.bondList.pop().remove();
    }

    for (let i = 0; i < Globals.desiredBondList.length; i++) {
        if (Globals.bondList[i] == undefined) {
            Globals.bondList.push(new Bond(...Globals.desiredBondList[i]));
            continue;
        }
        Globals.bondList[i].setBondType(Globals.desiredBondList[i][0]);
        Globals.bondList[i].setPosition(Globals.desiredBondList[i][1], Globals.desiredBondList[i][2], Globals.desiredBondList[i][3], Globals.desiredBondList[i][4]);
    }

    let xMin = Number.POSITIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;

    if (Globals.atomList.length == 0) {
        xMin = -250;
        yMin = -250;
        xMax = 250;
        yMax = 250;
    } else {
        for (let a of Globals.atomList) {
            let [x, y] = HexIndex.toXY(a.q, a.r);
            xMin = Math.min(xMin, x - 45);
            yMin = Math.min(yMin, y - 45);
            xMax = Math.max(xMax, x + 45);
            yMax = Math.max(yMax, y + 45);
        }
    }

    let centerX = (xMin + xMax) / 2;
    let centerY = (yMin + yMax) / 2;
    let spanX = xMax - xMin;
    let spanY = yMax - yMin;
    let scale = 500 / Math.max(500, spanX, spanY);

    Elements.camera.setAttribute("transform", `translate(250, 250) scale(${scale}) translate(${-centerX}, ${-centerY})`);
}