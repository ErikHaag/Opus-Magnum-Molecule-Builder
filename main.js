class Elements {
    static init() {
        this.bondCollage = document.getElementById("bondCollage");
        this.atomCollage = document.getElementById("atomCollage");
        this.camera = document.getElementById("camera");
        this.atomContainer = document.getElementById("atoms");
        this.bondContainer = document.getElementById("bonds");

        this.atomInput = document.getElementById("atomInput");
        this.atomError = document.getElementById("atomError");
        this.bondInput = document.getElementById("bondInput");

        this.cleanupButton = document.getElementById("cleanup");
        this.rotateCCWButton = document.getElementById("turnCCW");
        this.rotateCWButton = document.getElementById("turnCW");
        this.translateButtons = ["NE", "E", "SE", "SW", "W", "NW"].map((v) => document.getElementById(`move${v}`));

        this.saveButton = document.getElementById("save");
        this.saveLink = document.getElementById("downloadText");
        this.exportPNGButton = document.getElementById("exportPNG");
        this.exportSVGButton = document.getElementById("exportSVG");
        this.exportLink = document.getElementById("downloadImage");
        this.loadButton = document.getElementById("load");
        this.fileInput = document.getElementById("loadInput");

        this.canvas = document.getElementById("canvas");
        this.canvasSrc = document.getElementById("canvasSrc");

        this.atomList = document.getElementById("atomList");
    }

    static atomCollage;
    static bondCollage;
    static camera;
    static atomContainer;
    static bondContainer;

    static atomInput;
    static atomError;
    static bondInput;

    static cleanupButton;
    static rotateCCWButton;
    static rotateCWButton;
    static translateButtons;


    static saveButton;
    static saveLink;
    static exportPNGButton;
    static exportSVGButton;
    static exportLink;
    static loadButton;
    static fileInput;

    static canvas;
    static canvasSrc;

    static atomList
}

class Globals {
    static desiredAtomList = [];
    static desiredBondList = [];
    static modified = false;

    static atomList = [];
    static bondList = [];

    static canvasBlobURL;
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
    ]).then(async (v) => {
        await Promise.all([
            v[0].expandAtomSymbols(symbols, { mode: 3 }),
            v[1].expandAtomBases(bases, { mode: 1 })
        ]);
        v[2].atomMerge(Elements.atomCollage, symbols, bases, { mode: 1 });
        for (let e of Elements.atomCollage.children) {
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
        generateAtomList();

        {
            let bS = document.getElementById("bondSymbols");
            for (let elem of Array.from(bS.children)) {
                Elements.bondCollage.appendChild(elem);
            }
            bS.remove();
        }

        {
            for (let elem of Elements.bondCollage.children) {
                Bond.bondTypes.push(elem.id.substring(0, elem.id.length - 5));

                for (let component of Array.from(elem.children)) {
                    if (component.tagName == "use") {
                        let useEl = document.getElementById(component.getAttribute("href").substring(1));
                        for (let c of useEl.children) {
                            elem.appendChild(c.cloneNode());
                        }
                        component.remove();
                    } else if (component.tagName == "line" || component.tagName == "path") {
                        let styles = window.getComputedStyle(component);
                        component.setAttribute("stroke", v[0].colorToHex(styles.stroke));
                    }
                }
            }
        }
    }
    ).then(() => {
        symbols.remove();
        bases.remove();
        atomSymbols.remove();
        console.log(Elements.atomCollage.children.length + " atoms loaded.");
    })


    Elements.atomInput.addEventListener("focusout", () => atomInputUpdate(true));
    Elements.bondInput.addEventListener("focusout", () => bondInputUpdate(true));
    
    Elements.cleanupButton.addEventListener("click", () => cleanup());
    Elements.rotateCCWButton.addEventListener("click", () => turn(false));
    Elements.rotateCWButton.addEventListener("click", () => turn(true));
    Elements.translateButtons[0].addEventListener("click", () => translate(0n, 1n));
    Elements.translateButtons[1].addEventListener("click", () => translate(1n, 0n));
    Elements.translateButtons[2].addEventListener("click", () => translate(1n, -1n));
    Elements.translateButtons[3].addEventListener("click", () => translate(0n, -1n));
    Elements.translateButtons[4].addEventListener("click", () => translate(-1n, 0n));
    Elements.translateButtons[5].addEventListener("click", () => translate(-1n, 1n));


    Elements.loadButton.addEventListener("click", () => loadFile());
    Elements.saveButton.addEventListener("click", () => saveFile());
    Elements.exportPNGButton.addEventListener("click", () => exportImagePNG());
    Elements.exportSVGButton.addEventListener("click", () => exportImageSVG());
    window.setInterval(displayUpdate, 1000);
}

function atomInputUpdate(userUpdate = false) {
    let error = "";

    let autobonds = [];

    let inp = Elements.atomInput.value.toLowerCase()
        .split(/\n|\|/)
        .map((s) => s.replaceAll(/[_ ]+/g, "_"))
        .map((s, i) => {
            let r = /^_?\(_(?<q>-?\d+)_(?<r>-?\d+)_?$/g.exec(s);
            if (r) {
                let g = r.groups;
                autobonds.push([i, -1, "line", BigInt(g.q), BigInt(g.r)]);
                return s.replaceAll("_", " ");
            }
            if (/^_?\)_?$/g.test(s)) {
                let j = autobonds.findLastIndex((v) => v[1] == -1 && v[2] == "line");
                if (j != -1) {
                    autobonds[j][1] = i;
                    return s;
                }
            }

            r = /^_?\[_(?<q>-?\d+)_(?<r>-?\d+)_?$/g.exec(s);
            if (r) {
                let g = r.groups;
                autobonds.push([i, -1, "spoke", BigInt(g.q), BigInt(g.r)]);
                return s.replaceAll("_", " ");
            }
            if (/^_?\]_?$/g.test(s)) {
                let j = autobonds.findLastIndex((v) => v[1] == -1 && v[2] == "spoke");
                if (j != -1) {
                    autobonds[j][1] = i;
                    return s;
                }
            }

            r = /^_?(?:(?<namespace>[\s\S]*):)?(?<name>[\s\S]*)_(?<q>-?\d+)_(?<r>-?\d+)_?$/g.exec(s)
            if (!r) {
                return s.replaceAll("_", " ");
            }
            let g = r.groups;
            let namespace = g.namespace?.toLowerCase();
            if (namespace == undefined) {
                [namespace, namespaceList] = inferNamespace(g.name);
                if (namespace == null) {
                    if (namespaceList != null) {
                        error ||= "The atom \"" + g.name + "\" is ambiguous, please prepend one of the following namespaces, followed by a colon (:)\n" + namespaceList.join("\n");
                    }
                    return s.replaceAll("_", " ");
                }
            }
            return [namespace, g.name.toLowerCase(), BigInt(g.q), BigInt(g.r)];
        });
    Elements.atomError.innerText = error;
    if (userUpdate && autobonds.length) {
        let newBonds = [];
        let linesToRemove = [];
        for (let ab of autobonds) {
            if (ab[1] == -1) {
                continue;
            }
            linesToRemove.push(ab[0], ab[1]);
            let lastQ = ab[3];
            let lastR = ab[4];
            for (let i = ab[0] + 1; i < ab[1]; i++) {
                if (typeof (inp[i]) != "string") {
                    newBonds.push(`normal ${lastQ} ${lastR} ${inp[i][2]} ${inp[i][3]}`);
                    if (ab[2] == "line") {
                        lastQ = inp[i][2];
                        lastR = inp[i][3];
                    }
                }
            }
        }
        linesToRemove.sort((a, b) => b - a);
        for (let i of linesToRemove) {
            inp.splice(i, 1);
        }
        if (newBonds.length) {
            Elements.bondInput.value = (newBonds.join("\n") + "\n" + Elements.bondInput.value).trim();
            bondInputUpdate();
        }
    }

    Elements.atomInput.value = inp.map((v) => typeof (v) == "string"
        ? v
        : (inferNamespace(v[1])[0] == null
            ? v[0] + ":" : ""
        ) + v[1] + " " + v[2] + " " + v[3])
        .join("\n");

    Globals.desiredAtomList = inp.filter((v) => typeof (v) != "string");
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
    let i = Elements.bondInput.value.toLowerCase()
        .split(/\n|\|/)
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

    let { xMin, yMin, xMax, yMax } = getAtomBoundingBox();

    if (xMin >= -250 && yMin >= -250 && xMax <= 250 && yMax <= 250) {
        xMin = -250;
        yMin = -250;
        xMax = 250;
        yMax = 250;
    }

    let centerX = (xMin + xMax) / 2;
    let centerY = (yMin + yMax) / 2;
    let spanX = xMax - xMin;
    let spanY = yMax - yMin;
    let scale = 500 / Math.max(500, spanX, spanY);

    Elements.camera.setAttribute("transform", `translate(250, 250) scale(${scale}) translate(${-centerX}, ${-centerY})`);
}

function getAtomBoundingBox() {
    let xMin = Number.POSITIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;

    if (Globals.atomList.length == 0) {
        xMin = 0;
        yMin = 0;
        xMax = 0;
        yMax = 0;
    } else {
        for (let a of Globals.atomList) {
            let [x, y] = HexIndex.toXY(a.q, a.r);
            xMin = Math.min(xMin, x - 45);
            yMin = Math.min(yMin, y - 45);
            xMax = Math.max(xMax, x + 45);
            yMax = Math.max(yMax, y + 45);
        }
    }
    return { xMin, yMin, xMax, yMax };
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
        if (HexIndex.compare(q1, r1, q2, r2) > 0) {
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

function translate(delQ, delR) {
    let { atoms, bonds } = getState();
    for (let a of atoms) {
        a.q += delQ;
        a.r += delR;
    }
    for (let b of bonds) {
        b.q1 += delQ;
        b.r1 += delR;
        b.q2 += delQ;
        b.r2 += delR;
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
            let x = HexIndex.compare(a.q1, a.r1, b.q1, b.r1);
            return (x != 0) ? x : HexIndex.compare(a.q2, a.r2, b.q2, b.r2);
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