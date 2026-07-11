class ErrorDisplayer {
    constructor(elem) {
        this.elem = elem;
        this.reset();
    }

    get hasError() {
        return this.error != "";
    }

    reset() {
        this.problem = -1;
        this.error = "";
        this.soft = false;
    }

    setError(msg, problematic = -1) {
        if (!this.hasError) {
            this.error = msg;
            this.problem = problematic;
        }
    }

    update() {
        this.elem.innerText = this.error;
    }
}