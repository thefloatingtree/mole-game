// https://github.com/ichub/pinput
// Heavily modified

const isFireFox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

interface RealState {
    keyStates: boolean[];
    mouseStates: boolean[];
    mousePosition: { x: number; y: number };
}

const realState: RealState = {
    keyStates: new Array(256),
    mouseStates: new Array(3),
    mousePosition: { x: 0, y: 0 }
}

window.onkeydown = (e: KeyboardEvent) => {
    if (e.which == 18)
        e.preventDefault();
    realState.keyStates[e.which] = true;
};

window.onkeyup = (e: KeyboardEvent) => {
    realState.keyStates[e.which] = false;
};

window.onmousedown = (e: MouseEvent) => {
    realState.mouseStates[e.button] = true;
};

window.onmouseup = (e: MouseEvent) => {
    realState.mouseStates[e.button] = false;
};

window.onmousemove = (e: MouseEvent) => {
    realState.mousePosition.x = e.clientX;
    realState.mousePosition.y = e.clientY;
}

init();

export class Pinput {
    keyStates: boolean[];
    previousKeyStates: boolean[];
    mouseStates: boolean[];
    previousMouseStates: boolean[];
    useRealState: boolean;
    mousePosition: { x: number; y: number };
    lastMousePosition: { x: number; y: number };

    constructor() {
        this.keyStates = new Array(256);
        this.previousKeyStates = new Array(256);
        this.mouseStates = new Array(3);
        this.previousMouseStates = new Array(3);
        this.useRealState = false;
        this.mousePosition = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };

        for (let i = 0; i < this.keyStates.length; i++) {
            this.keyStates[i] = false;
            this.previousKeyStates[i] = false;
        }

        for (let i = 0; i < this.mouseStates.length; i++) {
            this.mouseStates[i] = false;
            this.previousMouseStates[i] = false;
        }
    }

    isReleased(combo: string): boolean {
        return !checkCombo(combo, this.mouseStates, this.keyStates) &&
            checkCombo(combo, this.previousMouseStates, this.previousKeyStates);
    }

    isPressed(combo: string): boolean {
        return checkCombo(combo, this.mouseStates, this.keyStates) &&
            !checkCombo(combo, this.previousMouseStates, this.previousKeyStates);
    }

    isDown(combo: string): boolean {
        if (this.useRealState) {
            this.mousePosition.x = realState.mousePosition.x;
            this.mousePosition.y = realState.mousePosition.y;
            return checkCombo(combo, realState.mouseStates, realState.keyStates);
        }
        return checkCombo(combo, this.mouseStates, this.keyStates);
    }

    update(): void {
        this.previousKeyStates = this.keyStates.slice(0);
        this.keyStates = realState.keyStates.slice(0);
        this.previousMouseStates = this.mouseStates.slice(0);
        this.mouseStates = realState.mouseStates.slice(0);
        this.lastMousePosition.x = this.mousePosition.x;
        this.lastMousePosition.y = this.mousePosition.y;
        this.mousePosition.x = realState.mousePosition.x;
        this.mousePosition.y = realState.mousePosition.y;
    }
}

function removeWhiteSpace(string: string): string {
    return string.replace(/\s+/g, '');
}

function stripWhiteSpace(string: string): string {
    return string.replace(/\s+/g, ' ');
}

type KeyOrMouse = ['key' | 'mouse', number];

function convertStringToKeycode(key: string): KeyOrMouse {
    key = removeWhiteSpace(key).toUpperCase();

    switch (key) {
        case "BACKSPACE": return ['key', 8];
        case "SPACEBAR": return ['key', 32];
        case "TAB": return ['key', 9];
        case "ENTER": return ['key', 13];
        case "SHIFT": return ['key', 16];
        case "CONTROL": return ['key', 17];
        case "ALT": return ['key', 18];
        case "CAPSLOCK": return ['key', 20];
        case "ESCAPE": return ['key', 27];
        case "PAGEUP": return ['key', 33];
        case "PAGEDOWN": return ['key', 34];
        case "ARROWLEFT": return ['key', 37];
        case "ARROWUP": return ['key', 38];
        case "ARROWRIGHT": return ['key', 39];
        case "ARROWDOWN": return ['key', 40];
        case "INSERT": return ['key', 45];
        case "DELETE": return ['key', 46];
        case "+":
        case "=": return ['key', isFireFox ? 61 : 187];
        case "-": return ['key', isFireFox ? 173 : 189];
        case "[": return ['key', 219];
        case "]": return ['key', 221];
        case "/": return ['key', 191];
        case "\\": return ['key', 220];
        default: return ['key', key.charCodeAt(0)];
    }
}

function convertStringToButtonCode(buttonCode: string): KeyOrMouse | null {
    const code = removeWhiteSpace(buttonCode).toUpperCase();

    switch (code) {
        case "MOUSELEFT": return ['mouse', 0];
        case "MOUSEMIDDLE": return ['mouse', 1];
        case "MOUSERIGHT": return ['mouse', 2];
        default: return null;
    }
}

function convertStringToCombo(combo: string): KeyOrMouse[] {
    const tokens = stripWhiteSpace(combo).split(' ');
    const keysAndButtons: KeyOrMouse[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const code = convertStringToButtonCode(tokens[i]);
        keysAndButtons.push(code ?? convertStringToKeycode(tokens[i]));
    }

    return keysAndButtons;
}

function checkCombo(combination: string, mouseStates: boolean[], keyStates: boolean[]): boolean {
    const combo = convertStringToCombo(combination);

    for (let i = 0; i < combo.length; i++) {
        if (combo[i][0] === 'mouse') {
            if (!mouseStates[combo[i][1]]) return false;
        } else {
            if (!keyStates[combo[i][1]]) return false;
        }
    }
    return true;
}

function init(): void {
    for (let i = 0; i < realState.keyStates.length; i++) {
        realState.keyStates[i] = false;
    }

    for (let i = 0; i < realState.mouseStates.length; i++) {
        realState.mouseStates[i] = false;
    }
}
