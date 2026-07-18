let HexIndex;

let MISGenerator = {
    atoms: [],
    bonds: [],
    indexedBonds: [],
    repeatOffet: null,
    state: 0,
    substate: 0,
    treeGen: null,
    tree: null,
    nameTree: null,
    bestScore: null,
    restart: function (atoms, bonds, repeatAtomIndex = -1) {
        this.atoms = atoms.map((a) => {
            return {
                atomType: `${a.atomType}__${a.namespace}`,
                pos: new HexIndex(a.pos.q, a.pos.r)
            };
        });
        if (repeatAtomIndex != -1) {
            this.repeatOffet = this.atoms.splice(repeatAtomIndex, 1)[0].pos;
        } else {
            this.repeatOffet = new HexIndex(0n, 0n);
        }
        // remove illegal bonds
        this.bonds = bonds.map((b) => {
            return {
                bondType: b.bondType,
                start: new HexIndex(b.start.q, b.start.r),
                end: new HexIndex(b.end.q, b.end.r)
            };
        }).filter(b => b.start.distance(b.end) == 1n);
        this.indexedBonds = this.bonds.map((b) => {
            let start = undefined;
            let end = undefined;
            for (let i = 0; i < this.atoms.length; i++) {
                if (start == undefined) {
                    let data = HexIndex.polymerCollision(this.atoms[i].pos, b.start, this.repeatOffet);
                    if (data.collides) {
                        start = {
                            index: i,
                            delta: data.deltaMonomer
                        };
                        continue;
                    }
                } else if (end != undefined) {
                    break;
                }
                if (end == undefined) {
                    let data = HexIndex.polymerCollision(this.atoms[i].pos, b.end, this.repeatOffet);
                    if (data.collides) {
                        end = {
                            index: i,
                            delta: data.deltaMonomer
                        };
                        continue;
                    }
                }
            }
            return { start, end };
        });
        this.state = 0;
        this.treeGen = null;
        this.bestScore = null;
    },
    step: function () {
        function bondViaPositions(h1, h2) {
            let v = MISGenerator.indexedBonds.findIndex(b => b.start.delta == 0n && b.end.delta == 0n && ((MISGenerator.atoms[b.start.index].pos.equals(h1) && MISGenerator.atoms[b.end.index].pos.equals(h2)) || (MISGenerator.atoms[b.start.index].pos.equals(h2) && MISGenerator.atoms[b.end.index].pos.equals(h1))));
            if (v != -1) {
                return v;
            }
            return -2 - MISGenerator.indexedBonds.findIndex(b => {
                if (b.start.delta == 0n && b.end.delta == 0n) {
                    return false;
                }
                let S1 = HexIndex.polymerCollision(MISGenerator.atoms[b.start.index].pos, h1, MISGenerator.repeatOffet);
                let E2 = HexIndex.polymerCollision(MISGenerator.atoms[b.end.index].pos, h2, MISGenerator.repeatOffet);
                if (S1.collides && E2.collides && (S1.deltaMonomer < E2.deltaMonomer)) {
                    return true;
                }
                let S2 = HexIndex.polymerCollision(MISGenerator.atoms[b.start.index].pos, h2, MISGenerator.repeatOffet);
                let E1 = HexIndex.polymerCollision(MISGenerator.atoms[b.end.index].pos, h1, MISGenerator.repeatOffet);
                return S2.collides && E1.collides && (E1.deltaMonomer < S2.deltaMonomer);
            });
        }


        if (this.state == 0) {
            // validate atoms and bonds are all connected
            if (this.indexedBonds.some((b) => b.start == undefined || b.end == undefined)) {
                this.state = -1;
                return;
            }

            let newPositions = [0];
            let oldPositions = [];
            let bondsFound = [];

            while (newPositions.length) {
                let nextNewPositions = [];
                for (let p of newPositions) {
                    for (let i = 0; i < this.indexedBonds.length; i++) {
                        let addStart = false;
                        if (this.indexedBonds[i].end.index == p) {
                            addStart = true;
                        } else if (this.indexedBonds[i].start.index != p) {
                            continue;
                        }
                        if (bondsFound.includes(i)) {
                            continue;
                        }
                        bondsFound.push(i);
                        if (this.indexedBonds[i].start.delta != 0n || this.indexedBonds[i].end.delta != 0n) {
                            continue;
                        }
                        let posToAdd = addStart ? this.indexedBonds[i].start.index : this.indexedBonds[i].end.index;
                        if (nextNewPositions.includes(posToAdd) || newPositions.includes(posToAdd) || oldPositions.includes(posToAdd)) {
                            continue;
                        }
                        nextNewPositions.push(posToAdd);
                    }
                }
                oldPositions = oldPositions.concat(newPositions);
                newPositions = nextNewPositions;
            }
            if (oldPositions.length != this.atoms.length || bondsFound.length != this.bonds.length) {
                this.state = -1;
                return;
            }
            if (this.bonds.length == 0) {
                this.bestScore = [[{ type: "atom", id: 0 }]];
                this.state = 4;
                return;
            }

            this.treeGen = this.treeGenerator();
            this.state = 1;
        } else if (this.state == 1) {
            // get a spanning tree
            let next = this.treeGen.next();
            if (next.done) {
                this.treeGen = null;
                this.state = 4;
                return;
            }
            this.tree = structuredClone(next.value);
            this.state = 2;
            this.substate = 0;
        } else if (this.state == 2) {
            // enumerate each path
            let startBond = this.indexedBonds[this.substate >> 1];
            if (startBond == undefined) {
                this.state = 1;
                return;
            }
            if (startBond.start.delta != 0 || startBond.end.delta != 0) {
                this.substate++;
                return;
            }
            let initialDirDelta = this.atoms[startBond.start.index].pos.copy();
            initialDirDelta.scale(-1n);
            initialDirDelta.increment(this.atoms[startBond.end.index].pos);

            let initialDir = HexIndex.offsets.findIndex((o) => o.equals(initialDirDelta));
            if (initialDir == -1) {
                throw new Error("Unreachable");
            }
            const initialFromEnd = (this.substate & 1) != 0;
            if (initialFromEnd) {
                initialDir += 3;
            }
            initialDir += 2;
            initialDir %= 6;

            this.nameTree = [{
                atomIndex: startBond[initialFromEnd ? "end" : "start"].index,
                bondIndex: -1,
                dir: initialDir,
                connections: []
            }];

            let i = 0;
            while (i < this.nameTree.length) {
                if (this.nameTree.length > this.atoms.length) {
                    throw new Error("Unreachable");
                }
                let offsetStart = this.nameTree[i].dir + 4;
                for (let j = 0; j < 5; j++) {
                    const rootAtom = this.atoms[this.nameTree[i].atomIndex];
                    let otherEnd = rootAtom.pos.copy();
                    otherEnd.increment(HexIndex.offsets[(offsetStart + j) % 6]);
                    let k = bondViaPositions(rootAtom.pos, otherEnd);
                    if (k == -1) {
                        this.nameTree[i].connections.push("nothing");
                        continue;
                    }
                    if (k <= -2) {
                        k = -2 - k;
                    } else if (this.tree.has(k)) {
                        this.nameTree[i].connections.push(`node:${this.nameTree.length}`);
                        this.nameTree.push({
                            atomIndex: (this.indexedBonds[k][this.nameTree[i].atomIndex == this.indexedBonds[k].start.index ? "end" : "start"]).index,
                            bondIndex: k,
                            dir: (offsetStart + j) % 6,
                            connections: []
                        });
                        continue;
                    }
                    this.nameTree[i].connections.push(`bond:${k},${this.nameTree[i].atomIndex == this.indexedBonds[k].start.index}`);
                }
                i++;
            }

            this.substate++;
            if (this.nameTree.length == this.atoms.length) {
                let bondsNoted = new Set();
                for (let i = 0; i < this.nameTree.length; i++) {
                    bondsNoted.add(this.nameTree[i].bondIndex);
                    for (let j = 0; j < 5; j++) {
                        // hey wait a minute!
                        const connectionString = this.nameTree[i].connections[j];
                        if (connectionString.startsWith("bond:")) {
                            bondsNoted.add(Number.parseInt(connectionString.substring(5,connectionString.indexOf(","))));
                        }
                    }
                }
                bondsNoted.delete(-1);
                if (bondsNoted.size == this.bonds.length) {
                    // valid tree
                    this.state = 3;
                }
            }
        } else if (this.state == 3) {
            // name generation
            let nameParts = [{
                type: "node",
                id: 0,
                wrapped: false
            }];
            for (let i = 0; i < nameParts.length; i++) {
                if (nameParts[i].type == "node") {
                    let node = this.nameTree[nameParts[i].id];
                    let replacement = [];
                    if (node.bondIndex != -1) {
                        replacement.push({
                            type: "bond",
                            id: node.bondIndex
                        });
                    }
                    replacement.push({
                        type: "atom",
                        id: node.atomIndex,
                        referenceId: -1
                    });
                    let lastValid = -1;
                    for (let j = 0; j < 5; j++) {
                        if (node.connections[j] == "nothing") {
                            continue;
                        }
                        if (j - 1 != lastValid) {
                            replacement.push(["o", "m", "p", "m'", "o'"][j]);
                        }
                        lastValid = j;

                        if (node.connections[j].startsWith("bond:")) {
                            let [bondIndex, fromStart] = node.connections[j].substring(5).split(",");
                            bondIndex = Number.parseInt(bondIndex);
                            replacement.push({
                                type: "referenceWrap",
                                id: this.indexedBonds[bondIndex][fromStart == "true" ? "end" : "start"].index,
                                through: bondIndex,
                                delta: (fromStart == "true" ? 1n : -1n) * (this.indexedBonds[bondIndex].end.delta - this.indexedBonds[bondIndex].start.delta),
                                wrapped: true
                            });
                        } else if (node.connections[j].startsWith("node:")) {
                            let nodeIndex = Number.parseInt(node.connections[j].substring(5));
                            replacement.push({
                                type: "node",
                                id: nodeIndex,
                                wrapped: true
                            });
                        } else {
                            throw new Error(`Unreachable ${i},${j},\"${NodeList.connections[j]}\"`);
                        }
                    }
                    if (lastValid != -1) {
                        let n = replacement.pop();
                        n.wrapped = false;
                        replacement.push(n);
                    }
                    if (nameParts[i].wrapped) {
                        replacement.unshift("(");
                        replacement.push(")");
                    }
                    nameParts.splice(i, 1, ...replacement);
                } else if (nameParts[i].type == "referenceWrap") {
                    let replacement = [{
                        type: "bond",
                        id: nameParts[i].through
                    }, {
                        type: "reference",
                        id: nameParts[i].id,
                        delta: nameParts[i].delta
                    }];

                    if (nameParts[i].wrapped) {
                        replacement.unshift("(");
                        replacement.push(")");
                    }

                    nameParts.splice(i, 1, ...replacement);
                }
            }
            // assign reference numbers, and general cleanup
            for (let i = 0; i < nameParts.length; i++) {
                if (nameParts[i].type == "reference") {
                    if (nameParts[i].id == -1) {
                        throw new Error("Unreachable");
                    }
                    let nextReferenceID = 1;
                    for (let j = 0; j < nameParts.length; j++) {
                        if (nameParts[j].type != "atom") {
                            continue;
                        }
                        if (nameParts[j].id == nameParts[i].id || nameParts[j].referenceId != -1) {
                            nameParts[j].referenceId = nextReferenceID++;
                        }
                    }
                } else if (nameParts[i].type == "bond") {
                    if (this.bonds[nameParts[i].id].bondType == "normal") {
                        nameParts.splice(i--, 1);
                    }
                }
            }
            for (let i = 0; i < nameParts.length; i++) {
                if (nameParts[i].type == "reference") {
                    for (let j = 0; j < nameParts.length; j++) {
                        if (nameParts[j].type != "atom") {
                            continue;
                        }
                        if (nameParts[j].id == nameParts[i].id) {
                            nameParts[i].id = nameParts[j].referenceId;
                            break;
                        }
                    }
                }
            }
            for (let i = 0; i < nameParts.length; i++) {
                if (nameParts[i].type == "atom") {
                    if (nameParts[i].referenceId != -1) {
                        nameParts.splice(i + 1, 0, `{${nameParts[i].referenceId}}`);
                    }
                } else if (typeof (nameParts[i]) == "string" && typeof (nameParts[i + 1]) == "string") {
                    nameParts[i] += nameParts[i + 1];
                    nameParts.splice(i + 1, 1);
                    i--;
                }
            }
            let scores = [
                nameParts,
                nameParts.reduce(((acc, val) => {
                    let l = 0;
                    if (typeof (val) == "string") {
                        l = val.length;
                    } else if (val.type == "atom" || val.type == "bond") {
                        l = 1;
                    } else if (val.type == "reference") {
                        l = val.id.toString().length;
                        if (val.delta != 0n) {
                            l += 1 + val.delta.toString().length;
                        }
                    }
                    return acc + l;
                }), 0),
                (nameParts.findLast((v) => v.type == "atom" && v.referenceId != -1)?.referenceId) ?? 0,
                nameParts.reduce((accA, valA, i) => {
                    if (valA.type != "atom" || valA.referenceId == -1) {
                        return accA;
                    }
                    return accA + nameParts.slice(0, i).reduce((accB, valB) => accB + (valB.type == "reference" && valB.id == valA.referenceId) ? 1 : 0, 0);
                }, 0),
                nameParts.reduce(((acc, val) => {
                    let l = "???";
                    if (typeof (val) == "string") {
                        l = val;
                    } else if (val.type == "atom") {
                        l = this.atoms[val.id].atomType;
                    } else if (val.type == "bond") {
                        l = this.bonds[val.id].bondType;
                    } else if (val.type == "reference") {
                        l = val.id.toString();
                        if (val.delta != 0n) {
                            l += "," + val.delta.toString().length;
                        }
                    }
                    return acc + l;
                }), "")
            ];
            this.state = 2;
            if (this.bestScore == null) {
                this.bestScore = scores;
                return;
            }
            if (this.bestScore[4] == scores[4]) {
                // check if equivalent
                return;
            }
            if (this.bestScore[1] > scores[1]) {
                this.bestScore = scores;
                return;
            }
            if (this.bestScore[1] != scores[1]) {
                return;
            }
            if (this.bestScore[2] > scores[2]) {
                this.bestScore = scores;
                return;
            }
            if (this.bestScore[2] != scores[2]) {
                return;
            }
            if (this.bestScore[3] > scores[3]) {
                this.bestScore = scores;
                return;
            }
            if (this.bestScore[3] != scores[3]) {
                return;
            }
            if (this.bestScore[4] > scores[4]) {
                this.bestScore = scores;
                return;
            }
        } else if (this.state == 4) {
            this.bestScore = this.bestScore[0].map((s) => {
                if (typeof (s) == "string") {
                    return s;
                }
                if (s.type == "atom") {
                    return { type: "atom", atomType: this.atoms[s.id].atomType };
                }
                if (s.type == "bond") {
                    return { type: "bond", bondType: this.bonds[s.id].bondType };
                }
                if (s.type == "reference") {
                    if (s.delta == 0n) {
                        return s.id.toString();
                    }
                    return `${s.id},${s.delta}`;
                }
                return s;
            });
            for (let i = 0; i < this.bestScore.length; i++) {
                if (typeof (this.bestScore[i]) == "string" && typeof (this.bestScore[i + 1]) == "string") {
                    this.bestScore[i] += this.bestScore[i + 1];
                    this.bestScore.splice(i + 1, 1);
                    i--;
                }
            }

            this.state = -2;
        }
    },
    treeGenerator: function* () {
        let stack = [];
        stack.push({ vertices: new Set([0]), edges: new Set(), excempt: [] });
        while (stack.length) {
            let currentState = stack.pop();
            if (currentState.vertices.size == this.atoms.length) {
                yield currentState.edges;
                continue;
            }
            let I = [];
            for (let i = 0; i < this.indexedBonds.length; i++) {
                if (this.indexedBonds[i].start.delta != 0n || this.indexedBonds[i].end.delta != 0n) {
                    continue;
                }
                if (currentState.excempt.includes(i)) {
                    continue;
                }
                let addEnd = currentState.vertices.has(this.indexedBonds[i].start.index);
                if (addEnd == currentState.vertices.has(this.indexedBonds[i].end.index)) {
                    continue;
                }
                let next = structuredClone(currentState);
                next.edges.add(i);
                next.excempt = [...next.excempt, ...I];
                next.vertices.add((this.indexedBonds[i])[addEnd ? "end" : "start"].index);
                stack.push(next);
                I.push(i);
            }
            if (I.length == 0) {
                // no valid edges!
                continue;
            }
        }
    }
};

onmessage = async (m) => {
    HexIndex = (await import("./hexIndex.js")).HexIndex;
    MISGenerator.restart(...(m.data));
    MISGenerator.step();
    while (MISGenerator.state > 0) {
        MISGenerator.step();
    }
    if (MISGenerator.state == -2) {
        postMessage(MISGenerator.bestScore);
    }
}