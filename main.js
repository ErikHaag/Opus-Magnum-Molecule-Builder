class Elements {
    static init() {
        this.bondCollage = document.getElementById("bondCollage");
        this.atomCollage = document.getElementById("atomCollage");
        this.camera = document.getElementById("camera");
        this.atomContainer = document.getElementById("atoms");
        this.ghostAtomContainer = document.getElementById("ghostAtoms");
        this.bondContainer = document.getElementById("bonds");
        this.ghostBondContainer = document.getElementById("ghostBonds");
        this.misOutput = document.getElementById("misOutput");

        this.atomInput = document.getElementById("atomInput");
        this.atomError = new ErrorDisplayer(document.getElementById("atomError"));
        this.bondInput = document.getElementById("bondInput");
        this.bondError = new ErrorDisplayer(document.getElementById("bondError"));

        this.cleanupButton = document.getElementById("cleanup");
        this.rotateCCWButton = document.getElementById("turnCCW");
        this.rotateCWButton = document.getElementById("turnCW");
        this.translateButtons = ["NE", "E", "SE", "SW", "W", "NW"].map((v) => document.getElementById(`move${v}`));
        this.mirrorButton = document.getElementById("mirror");

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
    static ghostAtomContainer;
    static bondContainer;
    static ghostBondContainer;
    static misOutput;

    static atomInput;
    static atomError;
    static bondInput;
    static bondError;

    static cleanupButton;
    static rotateCCWButton;
    static rotateCWButton;
    static translateButtons;
    static mirrorButton;

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
    static ghostRepetitions = 3;

    static desiredAtomList = [];
    static desiredBondList = [];
    static modified = false;
    static ghosts = false;
    static repeatAtomIndex = -1;
    static repeatOffset = new HexIndex(0n, 0n);

    static atomList = [];
    static ghostAtomList = [];
    static bondList = [];
    static ghostBondList = [];

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
            v[0].expandAtomSymbols(symbols, { mode: 3, allowOutlines: true }),
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
        {
            for (let symbol of Array.from(symbols.children)) {
                atomSymbols.appendChild(symbol);
                // remove outline
                if (symbol.classList.contains("outline")) {
                    let elements = symbol.childElementCount >> 1;
                    for (let i = 0; i < elements; i++) {
                        symbol.children[elements].remove();
                    }
                    symbol.classList.remove("outline");
                }
                for (let component of symbol.children) {
                    let fill = component.getAttribute("fill");
                    if (fill != "none") {
                        component.setAttribute("fill", "#000000")
                    }
                    let stroke = component.getAttribute("stroke");
                    if (stroke != "none") {
                        component.setAttribute("stroke", "#000000");
                    }
                }
            }
        }
    }
    ).then(() => {
        symbols.remove();
        bases.remove();
        console.log(Elements.atomCollage.children.length + " atoms loaded.");
    });

    Elements.atomInput.addEventListener("focusout", () => atomInputUpdate(true));
    Elements.bondInput.addEventListener("focusout", () => bondInputUpdate(true));

    Elements.cleanupButton.addEventListener("click", () => cleanup());
    Elements.rotateCCWButton.addEventListener("click", () => turn(false));
    Elements.rotateCWButton.addEventListener("click", () => turn(true));
    Elements.translateButtons[0].addEventListener("click", () => translate(new HexIndex(0n, 1n)));
    Elements.translateButtons[1].addEventListener("click", () => translate(new HexIndex(1n, 0n)));
    Elements.translateButtons[2].addEventListener("click", () => translate(new HexIndex(1n, -1n)));
    Elements.translateButtons[3].addEventListener("click", () => translate(new HexIndex(0n, -1n)));
    Elements.translateButtons[4].addEventListener("click", () => translate(new HexIndex(-1n, 0n)));
    Elements.translateButtons[5].addEventListener("click", () => translate(new HexIndex(-1n, 1n)));
    Elements.mirrorButton.addEventListener("click", () => mirror());

    Elements.loadButton.addEventListener("click", () => loadFile());
    Elements.saveButton.addEventListener("click", () => saveFile());
    Elements.exportPNGButton.addEventListener("click", () => exportImagePNG());
    Elements.exportSVGButton.addEventListener("click", () => exportImageSVG());

    window.setInterval(displayUpdate, 1000);
}

function atomInputUpdate(userUpdate = false) {
    Elements.atomError.reset();
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
                        Elements.atomError.setError("The atom \"" + g.name + "\" is ambiguous, please prepend one of the following namespaces, followed by a colon (:)\n" + namespaceList.join("\n"));
                    }
                    return s.replaceAll("_", " ");
                }
            }
            return [namespace, g.name.toLowerCase(), BigInt(g.q), BigInt(g.r)];
        });
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
    Elements.bondError.reset();
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
        Globals.atomList.pop()?.remove();
    }

    for (let i = 0; i < Globals.desiredAtomList.length; i++) {
        if (!(Globals.atomList[i] instanceof Atom)) {
            Globals.atomList[i] = new Atom();
        }
        Globals.atomList[i].setAtomType(Globals.desiredAtomList[i][1] + "__" + Globals.desiredAtomList[i][0]);
        Globals.atomList[i].setPosition(Globals.desiredAtomList[i][2], Globals.desiredAtomList[i][3]);
    }

    // bonds
    while (Globals.bondList.length > Globals.desiredBondList.length) {
        Globals.bondList.pop().remove();
    }

    for (let i = 0; i < Globals.desiredBondList.length; i++) {
        if (!(Globals.bondList[i] instanceof Bond)) {
            Globals.bondList[i] = new Bond();
        }
        Globals.bondList[i].setBondType(Globals.desiredBondList[i][0]);
        Globals.bondList[i].setPosition(Globals.desiredBondList[i][1], Globals.desiredBondList[i][2], Globals.desiredBondList[i][3], Globals.desiredBondList[i][4]);
    }


    polymerValidation();

    // ghost atoms
    {
        let gAC = Globals.ghosts ? Globals.ghostRepetitions * (Globals.desiredAtomList.length - 1) : 0;
        while (Globals.ghostAtomList.length > gAC) {
            Globals.ghostAtomList.pop()?.remove();
        }

        if (Globals.ghosts) {
            const reps = BigInt(Globals.ghostRepetitions);
            let k = 0;
            let offset = new HexIndex(0n, 0n);
            for (let i = 0n; i < reps; i++) {
                offset.increment(Globals.repeatOffset);
                for (let j = 0; j < Globals.atomList.length; j++) {
                    if (j == Globals.repeatAtomIndex) {
                        continue;
                    }
                    if (!(Globals.ghostAtomList[k] instanceof Atom)) {
                        Globals.ghostAtomList[k] = new Atom(true);
                    }
                    Globals.ghostAtomList[k].setAtomType(Globals.atomList[j].atomType);
                    let p = offset.copy();
                    p.increment(Globals.atomList[j].pos);
                    Globals.ghostAtomList[k].setPosition(p.q, p.r);
                    k++;
                }
            }
        }
    }

    // ghost bonds
    {
        let gBC = Globals.ghosts ? Globals.ghostRepetitions * Globals.desiredBondList.length : 0;
        while (Globals.ghostBondList.length > gBC) {
            Globals.ghostBondList.pop()?.remove();
        }

        if (Globals.ghosts) {

            const reps = BigInt(Globals.ghostRepetitions);
            let k = 0;
            let offset = new HexIndex(0n, 0n);
            for (let i = 0; i < Globals.ghostRepetitions; i++) {
                offset.increment(Globals.repeatOffset);
                for (let j = 0; j < Globals.desiredBondList.length; j++) {
                    if (!(Globals.ghostBondList[k] instanceof Bond)) {
                        Globals.ghostBondList[k] = new Bond(true);
                    }
                    Globals.ghostBondList[k].setBondType(Globals.desiredBondList[j][0]);
                    let start = new HexIndex(Globals.desiredBondList[j][1], Globals.desiredBondList[j][2]);
                    let end = new HexIndex(Globals.desiredBondList[j][3], Globals.desiredBondList[j][4]);
                    start.increment(offset);
                    end.increment(offset)
                    Globals.ghostBondList[k].setPosition(start.q, start.r, end.q, end.r);
                    k++;
                }

            }
        }
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

    updateUI();
    try {
        startMIS();
    } catch (e) {
        if (!(e instanceof ReferenceError)) {
            throw e;
        }
    }
}

function updateUI() {
    Elements.atomError.update();
    Elements.bondError.update();

    let errored = Elements.atomError.hasError || Elements.bondError.hasError;
    Elements.exportPNGButton.disabled = errored;
    Elements.exportSVGButton.disabled = errored;
}

function polymerValidation() {
    Globals.ghosts = false;
    if (Globals.atomList.findIndex((a) => a.pos.q == 0n && a.pos.r == 0n) == -1) {
        Elements.atomError.setError("There must be an atom in the center of the board.");
        return;
    }

    Globals.repeatAtomIndex = Globals.atomList.findIndex((a) => a.atomType == "repeat__opus_magnum");
    if (Globals.repeatAtomIndex == -1) {
        return;
    }
    Globals.repeatOffset = Globals.atomList[Globals.repeatAtomIndex].pos.copy();
    const secondaryRepeatIndex = Globals.atomList.findIndex((a, i) => i > Globals.repeatAtomIndex && a.atomType == "`repeat__opus_magnum");
    if (secondaryRepeatIndex != -1) {
        Elements.atomError.setError("You cannot have more than 1 repeat atom on the board.", secondaryRepeatIndex);
        return;
    }
    if (Globals.repeatOffset.q == 0n && Globals.repeatOffset.r == 0n) {
        Elements.atomError.setError("The repeat atom may not lie on the center of the board.");
        return;
    }

    Globals.ghosts = true;
    // test for overlapping atoms
    for (let i = 0; i < Globals.atomList.length - 1; i++) {
        if (i == Globals.repeatAtomIndex) {
            continue;
        }
        const atomI = Globals.atomList[i];
        for (let j = i + 1; j < Globals.atomList.length; j++) {
            if (j == Globals.repeatAtomIndex) {
                continue;
            }
            const atomJ = Globals.atomList[j];
            let info = polymerCollision(atomI.pos, atomJ.pos);
            if (info.collides) {
                Elements.atomError.setError(`The atoms \"${atomI}\" and \"${atomJ}\" will overlap in the polymer.`, j);
                return;
            }
        }
    }
    // test for overlapping bonds
    for (let i = 0; i < Globals.bondList.length - 1; i++) {
        const bondI = Globals.bondList[i];
        for (let j = i + 1; j < Globals.bondList.length; j++) {
            const bondJ = Globals.bondList[j];
            let startInfo = polymerCollision(bondI.start, bondJ.start);
            if (startInfo.collides) {
                let endInfo = polymerCollision(bondI.end, bondJ.end);
                if (endInfo.collides && startInfo.deltaMonomer == endInfo.deltaMonomer) {
                    Elements.bondError.setError(`The bonds \"${bondI}\" and \"${bondJ}\" will overlap in this polymer`, j);
                    return;
                }
            }
        }
    }
    // test for hanging bonds
    for (let i = 0; i < Globals.bondList.length; i++) {
        let bond = Globals.bondList[i];
        let startAtomIndex = Globals.atomList.findIndex((a) => a.pos.equals(bond.start));
        if (startAtomIndex == Globals.repeatAtomIndex) {
            startAtomIndex = -1;
        }
        let endAtomIndex = Globals.atomList.findIndex((a) => a.pos.equals(bond.end));
        if (endAtomIndex == Globals.repeatAtomIndex) {
            endAtomIndex = -1;
        }
        if (startAtomIndex == -1 && endAtomIndex == -1) {
            for (let j = 0; j < Globals.atomList.length; j++) {
                if (j == Globals.repeatAtomIndex) {
                    continue;
                }
                if ((polymerCollision(bond.start, Globals.atomList[j].pos)).collides || (polymerCollision(bond.end, Globals.atomList[j].pos)).collides) {
                    Elements.bondError.setError("The bond \"" + bond + "\" connect atoms in later monomers.", i);
                    return;
                }
            }
        }
    }

}

function polymerCollision(h1, h2, rO = Globals.repeatOffset) {
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

function* getRepeatAtomPositions() {
    o: for (let bond of Globals.bondList) {
        let startAtomIndex = Globals.atomList.findIndex((a) => a.pos.equals(bond.start));
        if (startAtomIndex == Globals.repeatAtomIndex) {
            startAtomIndex = -1;
        }
        let endAtomIndex = Globals.atomList.findIndex((a) => a.pos.equals(bond.end));
        if (endAtomIndex == Globals.repeatAtomIndex) {
            endAtomIndex = -1;
        }
        if (startAtomIndex == -1 && endAtomIndex != -1) {
            for (let i = 0; i < Globals.atomList.length; i++) {
                if (i == Globals.repeatAtomIndex) {
                    continue;
                }
                if ((polymerCollision(bond.start, Globals.atomList[i].pos)).collides) {
                    yield bond.start.copy();
                    continue o;
                }
            }
        } else if (startAtomIndex != -1 && endAtomIndex == -1) {
            for (let i = 0; i < Globals.atomList.length; i++) {
                if (i == Globals.repeatAtomIndex) {
                    continue;
                }
                if ((polymerCollision(bond.end, Globals.atomList[i].pos)).collides) {
                    yield bond.end.copy();
                    continue o;
                }
            }
        }
    }
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
            let [x, y] = a.pos.toXY();
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

function mirror() {
    let { atoms, bonds } = getState();
    for (let a of atoms) {
        a.pos.mirror();
    }
    for (let b of bonds) {
        b.start.mirror();
        b.end.mirror();
    }
    setState(atoms, bonds);
    atomInputUpdate();
    bondInputUpdate();
}

function translate(del) {
    let { atoms, bonds } = getState();
    for (let a of atoms) {
        a.pos.increment(del);
    }
    for (let b of bonds) {
        b.start.increment(del);
        b.end.increment(del);
    }
    setState(atoms, bonds);
    atomInputUpdate();
    bondInputUpdate();
}

function turn(clockwise = false) {
    let { atoms, bonds } = getState();
    for (let a of atoms) {
        if (clockwise) {
            a.pos.rotateClockwise();
        } else {
            a.pos.rotateCounterClockwise();
        }
    }
    for (let b of bonds) {
        if (clockwise) {
            b.start.rotateClockwise();
            b.end.rotateClockwise();
        } else {
            b.start.rotateCounterClockwise();
            b.end.rotateCounterClockwise();
        }
        if (HexIndex.compare(b.start.q, b.start.r, b.end.q, b.end.r) > 0) {
            [b.start, b.end] = [b.end, b.start];
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
            pos: a.pos.copy()
        };
    });
    let bonds = Globals.bondList.map((b) => {
        return {
            bondType: b.bondType,
            start: b.start.copy(),
            end: b.end.copy()
        };
    });
    return { atoms, bonds };
}

/**
 * 
 * @param {Atom[]} atoms 
 * @param {Bond[]} bonds 
 */
function removeOverlapping(atoms, bonds) {
    if (atoms != null) {
        outer: for (let i = 0; i < atoms.length - 1; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                if (atoms[i].pos.equals(atoms[j].pos)) {
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
                if (bonds[i].start.equals(bonds[j].start) && bonds[i].end.equals(bonds[j].end)) {
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
            return HexIndex.compare(a.pos.q, a.pos.r, b.pos.q, b.pos.r);
        });
    }
    if (bonds != null) {
        bonds.sort((a, b) => {
            let x = HexIndex.compare(a.start.q, a.start.r, b.start.q, b.start.r);
            return (x != 0) ? x : HexIndex.compare(a.end.q, a.end.r, b.end.q, b.end.r);
        });
    }
}

function setState(atoms, bonds) {
    if (atoms != null) {
        Elements.atomInput.value = atoms.map((a) => `${(inferNamespace(a.atomType)[0] == null ? a.namespace + ":" : "") + a.atomType.replaceAll("_", " ")} ${a.pos.q} ${a.pos.r}`).join("\n");
    }
    if (bonds != null) {
        Elements.bondInput.value = bonds.map((b) => `${b.bondType} ${b.start.q} ${b.start.r} ${b.end.q} ${b.end.r}`).join("\n");
    }
}

function getSetStateString() {
    let s = getState();
    return `setState([${s.atoms.map((a) => `{namespace: '${a.namespace}', atomType: '${a.atomType}', pos: new HexIndex(${a.pos.q}n, ${a.pos.r}n)}`).join(", ")}], [${s.bonds.map((b) => `{bondType: '${b.bondType}', start: new HexIndex(${b.start.q}n, ${b.start.r}n), end: new HexIndex(${b.end.q}n, ${b.end.r}n)}`)}]);`
}

function updateLabel() {
    let data = MISGenerator.bestScore;
    for (let e of Array.from(Elements.misOutput.children)) {
        e.remove();
    }
    let rightEdge = 0;
    for (let i = 0; i < data.length; i++) {
        let element;
        if (typeof (data[i]) == "string") {
            element = document.createElementNS("http://www.w3.org/2000/svg", "text");
            Elements.misOutput.appendChild(element);
            element.textContent = data[i];
            element.setAttribute("x", rightEdge);
            element.setAttribute("y", 30);
            rightEdge += element.getBBox().width;
        } else if (data[i].type == "atom") {
            element = document.createElementNS("http://www.w3.org/2000/svg", "use");
            element.setAttribute("href", `#OMA_S_${data[i].atomType}`);
            Elements.misOutput.appendChild(element);
            let boundingBox = element.getBBox();
            element.setAttribute("transform", `translate(${rightEdge}, 0) scale(0.5) translate(${1.5 - boundingBox.x},10)`)
            rightEdge += boundingBox.width * 0.5 + 4;
        } else if (data[i].type == "bond") {
            element = document.createElementNS("http://www.w3.org/2000/svg", "use");
            element.setAttribute("href", `#${data[i].bondType}_bond_drawn`);
            Elements.misOutput.appendChild(element);
            let boundingBox = element.getBBox();
            element.setAttribute("transform", `translate(${2 + rightEdge - boundingBox.x},20) scale(0.7) translate(0, -5)`)
            rightEdge += boundingBox.width * 0.7 + 5;
        } else {
            continue;
        }
    }
}