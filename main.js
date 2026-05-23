class Atom {
    static atomTypes = new Map();

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
        if (q1 > q2 || (q1 == q2 && r1 > r2)) {
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
        this.atomError = document.getElementById("atomError");
        this.bondCollage = document.getElementById("bondCollage");
        this.bondContainers = document.getElementById("bonds");
        this.bondInput = document.getElementById("bondInput");
        this.camera = document.getElementById("camera");
        this.collage = document.getElementById("collage");
    }

    static atomContainers;
    static atomInput;
    static atomError;
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

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
    Elements.init();
    let atomSymbols = document.getElementById("atomSymbols");
    let symbols = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let bases = document.createElementNS("http://www.w3.org/2000/svg", "g");
    atomSymbols.appendChild(symbols);
    atomSymbols.appendChild(bases);
    Promise.all([
        import("https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/symbols/atomSymbolsExpand.js"),
        import("https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/bases/atomBasesExpand.js"),
        import("https://cdn.jsdelivr.net/gh/ErikHaag/Opus-Magnum-Assets/combining/atomMerge.js")
    ]).then((v) => Promise.all([
        v[0].expandAtomSymbols(symbols, { mode: 2 }),
        v[1].expandAtomBases(bases, { mode: 0 })
    ]).then(() => {
        v[2].atomMerge(Elements.collage, symbols, bases, { mode: 1 });
        for (let e of Elements.collage.children) {
            let namespaceStart = e.id.indexOf("__");
            let namespace = e.id.substring(namespaceStart + 2);
            let atomName = e.id.substring(6, namespaceStart);
            let l = Atom.atomTypes.get(atomName);
            if (l == undefined) {
                Atom.atomTypes.set(atomName, [namespace]);
            } else {
                l.push(namespace);
            }
        }
    })
    ).then(() => {
        symbols.remove();
        bases.remove();
        atomSymbols.remove();
        console.log(Elements.collage.children.length + " atoms loaded.");
    })

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
    document.getElementById("cleanup").addEventListener("click", () => cleanup());
    document.getElementById("turnCCW").addEventListener("click", () => turn(false));
    document.getElementById("turnCW").addEventListener("click", () => turn(true));

    window.setInterval(displayUpdate, 1000);
}

function atomInputUpdate() {
    let error = "";

    let i = Elements.atomInput.value
        .split("\n")
        .map((s) => s.replaceAll(/[_ ]+/g, "_"))
        .map((s) => {
            try {
                let r = /^_?(?:(?<namespace>[\s\S]*):)?(?<name>[\s\S]*)_(?<q>-?\d+)_(?<r>-?\d+)_?$/g.exec(s).groups;
                let namespace = r.namespace?.toLowerCase();
                if (namespace == undefined) {
                    [namespace, namespaceList] = inferNamespace(r.name);
                    if (namespace == null) {
                        if (namespaceList != null) {
                            error ||= "The atom \"" + r.name + "\" is ambiguous, please prepend one of the following namespaces, followed by a colon (:)\n" + namespaceList.join(",\n");
                        }
                        return s.replaceAll("_", " ");
                    }
                }
                return [namespace, r.name.toLowerCase(), BigInt(r.q), BigInt(r.r)];
            } catch {
                return s.replaceAll("_", " ");
            }
        });
    Elements.atomError.innerText = error;
    Elements.atomInput.value = i.map((v) => typeof (v) == "string"
        ? v
        : (inferNamespace(v[1])[0] == null
            ? v[0] + ":" : ""
        ) + v[1] + " " + v[2] + " " + v[3])
        .join("\n");

    Globals.desiredAtomList = i.filter((i) => typeof (i) != "string");
    Globals.modified = true;
}

function inferNamespace(atomName) {
    let nsl = Atom.atomTypes.get(atomName);
    if (nsl == undefined) {
        return [null, null];
    }

    if (nsl.length > 1) {
        return [null, nsl];
    }

    return [nsl[0], null]
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
            Globals.atomList.push(new Atom(Globals.desiredAtomList[i][1] + "__" + Globals.desiredAtomList[i][0], Globals.desiredAtomList[i][2], Globals.desiredAtomList[i][3]));
            continue;
        }
        Globals.atomList[i].setAtomType(Globals.desiredAtomList[i][1] + "__" + Globals.desiredAtomList[i][0]);
        Globals.atomList[i].setPosition(Globals.desiredAtomList[i][2], Globals.desiredAtomList[i][3]);
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

function cleanup() {
    modified = true;
    displayUpdate();
    let { atoms, bonds } = getState();

    removeOverlapping(atoms, bonds);

    reorderEntries(atoms, bonds);

    setState(atoms, bonds);
    atomInputUpdate();
    bondInputUpdate();
}

function turn(clockwise = false) {
    let { atoms, bonds } = getState();
    for (let a of atoms) {
        let q = clockwise ? a.q + a.r : -a.r;
        let r = clockwise ? -a.q : a.q + a.r;
        a.q = q;
        a.r = r;
    }
    for (let b of bonds) {
        let q1 = clockwise ? b.q1 + b.r1 : -b.r1;
        let r1 = clockwise ? -b.q1 : b.q1 + b.r1;
        let q2 = clockwise ? b.q2 + b.r2 : -b.r2;
        let r2 = clockwise ? -b.q2 : b.q2 + b.r2;
        if (q1 > q2 || (q1 == q2 && r1 > r2)) {
            b.q1 = q2;
            b.r1 = r2;
            b.q2 = q1;
            b.r2 = r1;
        } else {
            b.q1 = q1;
            b.r1 = r1;
            b.q2 = q2;
            b.r2 = r2;
        }
    }
    setState(atoms, bonds);
    atomInputUpdate();
    bondInputUpdate();
}


function getState() {
    let atoms = Globals.atomList.map((a) => {
        let nsS = a.atomType.indexOf("__");
        return {
            namespace: a.atomType.substring(nsS + 2),
            atomType: a.atomType.substring(0, nsS),
            q: a.q,
            r: a.r
        };
    });
    let bonds = Globals.bondList.map((b) => {
        return {
            bondType: b.bondType,
            q1: b.q1,
            r1: b.r1,
            q2: b.q2,
            r2: b.r2
        };
    });
    return { atoms, bonds };
}

function removeOverlapping(atoms, bonds) {
    if (atoms != null) {
        outer: for (let i = 0; i < atoms.length - 1; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                if (atoms[j].q == atoms[i].q && atoms[j].r == atoms[i].r) {
                    // another atom is covering this one.
                    atoms.splice(i--, 1);
                    continue outer;
                }
            }
        }
    }

    if (bonds != null) {
        outer: for (let i = 0; i < bonds.length - 1; i++) {
            for (let j = i + 1; j < bonds.length; j++) {
                if (bonds[j].q1 == bonds[i].q1 && bonds[j].r1 == bonds[i].r1 && bonds[j].q2 == bonds[i].q2 && bonds[j].r2 == bonds[i].r2) {
                    // bonds connect the same atoms, and therefore overlap
                    bonds.splice(i--, 1);
                    continue outer;
                }
            }
        }
    }
}

function reorderEntries(atoms, bonds) {
    if (atoms != null) {
        atoms.sort((a, b) => {
            let diff = a.q - b.q;
            if (diff != 0n) {
                return diff > 0n ? 1 : -1;
            }
            diff = a.r - b.r;
            return diff > 0n ? 1 : -1;
        });
    }
    if (bonds != null) {
        bonds.sort((a, b) => {
            let diff = a.q1 - b.q1;
            if (diff != 0n) {
                return diff > 0n ? 1 : -1;
            }
            diff = a.r1 - b.r1;
            if (diff != 0n) {
                return diff > 0n ? 1 : -1;
            }
            diff = a.q2 - b.q2;
            if (diff != 0n) {
                return diff > 0n ? 1 : -1;
            }
            diff = a.r2 - b.r2;
            return diff > 0n ? 1 : -1;
        });
    }
}

function setState(atoms, bonds) {
    if (atoms != null) {

        Elements.atomInput.value = atoms.map((a) => `${(inferNamespace(a.atomType)[0] == null
            ? a.namespace + ":" : ""
        ) + a.atomType.replaceAll("_", " ")} ${a.q} ${a.r}`)
            .join("\n");
    }
    if (bonds != null) {
        Elements.bondInput.value = bonds.map((b) => `${b.bondType} ${b.q1} ${b.r1} ${b.q2} ${b.r2}`).join("\n");
    }
}