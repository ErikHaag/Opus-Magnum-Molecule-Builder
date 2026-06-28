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

function exportImageSVG() {
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
        svgFrag += "\n" + Elements.atomCollage.querySelector(`:scope #OMA_A_${atomType}`).outerHTML.replaceAll(/\n\s+/g, "\n");;
    }
    for (let bondType of bondsUsed) {
        svgFrag += "\n" + Elements.bondCollage.querySelector(`:scope #${bondType}_bond`).outerHTML.replaceAll(/\n\s+/g, "\n");;
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
    Elements.exportLink.setAttribute("download", "molecule.svg");
    Elements.exportLink.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFrag);
    Elements.exportLink.click();
}

function exportImagePNG() {
    let { xMin, yMin, xMax, yMax } = getAtomBoundingBox();
    Elements.canvasSrc.setAttribute("viewBox", `0 0 ${xMax - xMin} ${yMax - yMin}`);
    Elements.canvasSrc.setAttribute("width", xMax - xMin);
    Elements.canvasSrc.innerHTML = "";
    Elements.canvas.width = Math.ceil(xMax - xMin);
    Elements.canvas.height = Math.ceil(yMax - yMin);
    // src setup
    function cloneAndFlatten(root, transform) {
        for (let c of root.children) {
            let t = (transform + " " + (c.getAttribute("transform") ?? "")).trimEnd();
            if (c.tagName == "g") {
                cloneAndFlatten(c, t);
                continue;
            }
            let cClone = c.cloneNode();
            cClone.setAttribute("transform", t);
            Elements.canvasSrc.appendChild(cClone);
        }
    }

    if (Globals.atomList.findIndex((a) => a.atomType == "repeat__opus_magnum") != -1) {
        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", "40");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "#ddd");
        circle.setAttribute("stroke-width", "3");
        circle.setAttribute("transform", `translate(${-xMin}, ${-yMin})`);
        Elements.canvasSrc.appendChild(circle);
    }

    for (let atom of Globals.atomList) {
        let ref = Elements.atomCollage.querySelector(`:scope #OMA_A_${atom.atomType}`);
        if (!ref) {
            continue;
        }

        let [x, y] = HexIndex.toXY(atom.q, atom.r);
        x -= xMin + 30;
        y -= yMin + 30;
        cloneAndFlatten(ref, `translate(${x}, ${y})`);
    }
    for (let bond of Globals.bondList) {
        let ref = Elements.bondCollage.querySelector(`:scope #${bond.bondType}_bond`);
        if (!ref) {
            continue;
        }
        let [x1, y1] = HexIndex.toXY(bond.q1, bond.r1);
        let [x2, y2] = HexIndex.toXY(bond.q2, bond.r2);

        let angle = 180 * (Math.atan2(y2 - y1, x2 - x1) / Math.PI);

        x1 -= xMin;
        y1 -= yMin;
        x2 -= xMin;
        y2 -= yMin

        cloneAndFlatten(ref, `translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2}) rotate(${angle}) translate(-12, -5)`);
    }
    // canvas copying
    let ctx = Elements.canvas.getContext("2d");
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    outer: for (let action of Elements.canvasSrc.children) {
        ctx.setTransform(action.getCTM());
        let path = new Path2D();
        switch (action.tagName) {
            case "circle":
                let cx = Number.parseFloat(action.getAttribute("cx") ?? "0");
                let cy = Number.parseFloat(action.getAttribute("cy") ?? "0");
                let r = Number.parseFloat(action.getAttribute("r") ?? "0");
                path.arc(cx, cy, r, 0, 2 * Math.PI);
                break;
            case "line":
                let x1 = Number.parseFloat(action.getAttribute("x1") ?? "0");
                let y1 = Number.parseFloat(action.getAttribute("y1") ?? "0");
                let x2 = Number.parseFloat(action.getAttribute("x2") ?? "0");
                let y2 = Number.parseFloat(action.getAttribute("y2") ?? "0");
                path.moveTo(x1, y1);
                path.lineTo(x2, y2);
                break;
            case "path":
                let d = action.getAttribute("d") ?? "";
                path = new Path2D(d);
                break;
            default:
                console.log(`unknown tag: "${action.tagName}", skipping!`);
                continue outer;
        }
        let fill = action.getAttribute("fill") ?? "black";
        if (fill != "none") {
            ctx.fillStyle = fill;
            ctx.fill(path);
        }
        let stroke = action.getAttribute("stroke") ?? "none";
        if (stroke != "none") {
            ctx.strokeStyle = stroke;
            ctx.lineCap = action.getAttribute("stroke-linecap") ?? "butt";
            ctx.lineWidth = Number.parseFloat(action.getAttribute("stroke-width") ?? "1");
            ctx.globalAlpha = Number.parseFloat(action.getAttribute("stroke-opacity") ?? "1");
            ctx.stroke(path);
        }
    }

    Elements.canvas.toBlob((blob) => {
        if (Globals.canvasBlobURL) {
            URL.revokeObjectURL(Globals.canvasBlobURL);
        }
        if (!blob) {
            return;
        }
        Globals.canvasBlobURL = URL.createObjectURL(blob);
        Elements.exportLink.setAttribute("download", "molecule.png");
        Elements.exportLink.href = Globals.canvasBlobURL;
        Elements.exportLink.click();
    });
}