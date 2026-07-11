
const MISGenerator = {
    hexOffsets: [
        new HexIndex(0n, -1n),
        new HexIndex(1n, -1n),
        new HexIndex(1n, 0n),
        new HexIndex(0n, 1n),
        new HexIndex(-1n, 1n),
        new HexIndex(-1n, 0n),
    ],
    restart: function () {
        let { atoms, bonds } = getState();
        this.atoms = atoms;
        // remove illegal bonds
        this.bonds = bonds.filter(b => b.start.distance(b.end) == 1n);
        this.indexedBonds = this.bonds.map((b) => {
            return {
                start: this.atoms.findIndex((a) => a.pos.equals(b.start)),
                end: this.atoms.findIndex((a) => a.pos.equals(b.end))
            };
        });
        this.state = 0;
        this.substate = 0;
        this.startPositons = atoms.map((a, i) => i);
        this.generator = null;
        this.bestName = null;
    },
    step: function () {
        if (this.state == 0) {
            // validate atoms and bonds are all connected
            let newPositions = [0];
            let oldPositions = [];
            let bondsFound = [];

            if (this.indexedBonds.some((b) => b.start == -1 || b.end == -1)) {
                this.state = -1;
                return;
            }

            while (newPositions.length) {
                let nextNewPositions = [];
                for (let p of newPositions) {
                    for (let i = 0; i < this.indexedBonds.length; i++) {
                        let addStart = false;

                        if (this.indexedBonds[i].end == p) {
                            addStart = true;
                        } else if (this.indexedBonds[i].start != p) {
                            continue;
                        }
                        if (bondsFound.includes(i)) {
                            continue;
                        }
                        bondsFound.push(i);
                        let posToAdd = addStart ? this.indexedBonds[i].start : this.indexedBonds[i].end;
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
            this.generator = this.treeGenerator();
            this.state = 1;
        } else if (this.state == 1) {
            let next = this.generator.next();
            if (next.done) {
                this.generator = null;
                this.state = 3;
                return;
            }
            this.tree = structuredClone(next.value);
            console.log(result);
            this.state = 2;
        } else if (this.state == 2) {




        }
    },
    treeGenerator: function* () {
        let stack = [];
        stack.push({ vertices: new Set([0]), edges: new Set() });
        let output = [];
        while (stack.length) {
            let currentState = stack.pop();
            if (currentState.vertices.size == this.atoms.length) {
                output.push(currentState.edges);
                yield currentState.edges;
                continue;
            }
            for (let i = 0; i < this.indexedBonds.length; i++) {
                let addEnd = currentState.vertices.has(this.indexedBonds[i].start);
                if (addEnd == currentState.vertices.has(this.indexedBonds[i].end)) {
                    continue;
                }
                let next = structuredClone(currentState);
                next.edges.add(i);
                next.vertices.add((this.indexedBonds[i])[addEnd ? "end" : "start"]);
                stack.push(next);
            }
            I: for (let i = 1; i < stack.length; i++) {
                for (let j = 0; j < i; j++) {
                    if (stack[i].vertices.symmetricDifference(stack[j].vertices).size > 0) {
                        continue;
                    }
                    if (stack[i].edges.symmetricDifference(stack[j].edges).size > 0) {
                        continue;
                    }
                    stack.splice(i, 1);
                    i--;
                    continue I;
                }
                for (let j = 0; j < output.length; j++) {
                    if (stack[i].edges.symmetricDifference(output[j]).size > 0) {
                        continue;
                    }
                    stack.splice(i, 1);
                    i--;
                    continue I;
                }
            }
        }
    }
};

