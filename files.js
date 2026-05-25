function saveFile() {
    let output = Globals.atomList.map((a) => {
        let [name, namespace] = a.atomType.split("__");
        return `${namespace}:${name} ${a.q} ${a.r}`;
    }).join("\n")
        + "\n~~~~~\n"
        + Globals.bondList.map((b) => `${b.bondType} ${b.q1} ${b.r1} ${b.q2} ${b.r2}`).join("\n");
    Elements.saveLink.href = "data:text/plain;charset=utf-8," + encodeURIComponent(output);
    Elements.saveLink.click();
}

function loadFile() {
    let file = Elements.fileInput.files[0];
    if (!file) {
        return;
    }
    file.text().then((t) => {
        let atomsEnd = t.indexOf("~");
        let atomString = t;
        let bondString = "";
        if (atomsEnd != -1) {
            atomString = t.substring(0, atomsEnd);
            let bondsStart = t.indexOf("\n", atomsEnd);
            if (bondsStart != -1) {
                bondString = t.substring(bondsStart + 1);
            }
        }
        atomString = atomString.trim();
        bondString = bondString.trim();

        let atoms = atomString.split("\n")
            .map((s) => {
                let [v, q, r] = s.split(" ");
                let [ns, an] = v.split(":");
                return {
                    namespace: ns,
                    atomType: an,
                    q: BigInt(q),
                    r: BigInt(r)
                };
            });
        let bonds = bondString.split("\n").map((s) => {
            let [bt, q1, r1, q2, r2] = s.split(" ");
            return {
                bondType: bt,
                q1: BigInt(q1),
                r1: BigInt(r1),
                q2: BigInt(q2),
                r2: BigInt(r2)
            };
        });

        setState(atoms, bonds);
        atomInputUpdate();
        bondInputUpdate();
    });
}

function exportImage() {
    let svgFrag = "<svg xmlns=\"http://www.w3.org/2000/svg\" "
    let { xMin, yMin, xMax, yMax } = getAtomBoundingBox();
    svgFrag += `viewBox="${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}" >\n<defs>`
    let atomsUsed = new Set();
    for (let atom of Globals.atomList) {
        atomsUsed.add(atom.atomType);
    }
    let bondsUsed = new Set();
    for (let bond of Globals.bondList) {
        bondsUsed.add(bond.bondType);
    }
    
    for (let atomType of atomsUsed) {
        svgFrag += "\n" + Elements.atomCollage.querySelector(`:scope #OMA_A_${atomType}`).outerHTML.replaceAll(/\n\s+/g,"\n");;
    }
    for (let bondType of bondsUsed) {
        svgFrag += "\n" + Elements.bondCollage.querySelector(`:scope #${bondType}_bond`).outerHTML.replaceAll(/\n\s+/g,"\n");;
    }
    svgFrag += "\n</defs>";
    if (atomsUsed.has("repeat__opus_magnum")) {
        svgFrag += "\n<circle r=\"40\" fill=\"none\" stroke=\"#ddd\" stroke-width=\"3\" />"
    }
    for (let atom of Globals.atomList) {
        let [x, y] = HexIndex.toXY(atom.q, atom.r);
        x -= 30;
        y -= 30;
        svgFrag += `\n<use href="#OMA_A_${atom.atomType}" transform="translate(${x}, ${y})" />`
    }
    for (let bond of Globals.bondList) {
        let [x1, y1] = HexIndex.toXY(bond.q1, bond.r1);
        let [x2, y2] = HexIndex.toXY(bond.q2, bond.r2);

        let angle = 180 * (Math.atan2(y2 - y1, x2 - x1) / Math.PI);
        svgFrag += `\n<use href="#${bond.bondType}_bond" transform="translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) rotate(${angle}) translate(-12, -5)" />`;
    }
    svgFrag += "\n</svg>";
    Elements.exportLink.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFrag);
    Elements.exportLink.click();
}