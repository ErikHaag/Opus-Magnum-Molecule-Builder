function generateAtomList() {
    let atoms = new Map();
    for (let [name, namespaces] of Atom.atomTypes) {
        for (let namespace of namespaces) {
            let l = atoms.get(namespace) ?? [];
            l.push(name);
            atoms.set(namespace, l);
        }
    }
    let mods = Array.from(atoms.keys());
    mods.sort();
    let vanillaPos = mods.indexOf("opus_magnum");
    if (vanillaPos != -1) {
        mods.unshift(...mods.splice(vanillaPos, 1));
    }

    function toTitleCase(s) {
        return s.replaceAll(/(^|_)([a-z])/g, (match, g1, g2) => {
            if (g1 == "_") {
                return " " + g2.toUpperCase();
            }
            return g2.toUpperCase();
        });
    }

    let tempElement = document.createElement("p");
    tempElement.style.width = "max-content"; 
    document.body.appendChild(tempElement);
    let heightScaler = Math.sin(2 * Math.PI / 9);

    for (let mod of mods) {
        let title = document.createElement("h4");
        title.innerText = toTitleCase(mod);
        Elements.atomList.appendChild(title);
        let grid = document.createElement("div");
        grid.classList.add("atomGrid");
        Elements.atomList.appendChild(grid);
        let modAtoms = atoms.get(mod);
        modAtoms.sort();
        let widest = -1;
        for (let atomName of modAtoms) {
            tempElement.innerText = toTitleCase(atomName);
            let width = tempElement.clientWidth;
            if (width > widest) {
                widest = width;
            }
        }
        widest = Math.ceil(heightScaler * widest);

        for (let atomName of modAtoms) {
            let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 60 60");
            svg.setAttribute("width", "60");
            grid.appendChild(svg);
            let use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttribute("href", `#OMA_A_${atomName}__${mod}`);
            svg.appendChild(use);
            let nameCell = document.createElement("p");
            nameCell.innerText = toTitleCase(atomName);
            nameCell.style.marginBottom = widest + "px";
            grid.appendChild(nameCell);
        }
    }
    tempElement.remove();
}