export class State {
    private static readonly STORAGE_KEY = 'mole-game-state';
    private state: Map<string, any> = new Map();

    constructor() {
        this.loadFromLocalStorage();
    }

    public set<T>(key: string, value: T): void {
        this.state.set(key, value);
        this.saveToLocalStorage();
    }

    public get<T>(key: string): T | undefined {
        return this.state.get(key) as T | undefined;
    }

    public has(key: string): boolean {
        return this.state.has(key);
    }

    public delete(key: string): void {
        this.state.delete(key);
        this.saveToLocalStorage();
    }

    public clear(): void {
        this.state.clear();
        this.saveToLocalStorage();
    }

    public serialize(): string {
        const obj: { [key: string]: any } = {};
        this.state.forEach((value, key) => {
            obj[key] = value;
        });
        return JSON.stringify(obj);
    }

    public deserialize(serializedState: string): void {
        const obj = JSON.parse(serializedState);
        this.state.clear();
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                this.state.set(key, obj[key]);
            }
        }
        this.saveToLocalStorage();
    }

    private saveToLocalStorage(): void {
        try {
            localStorage.setItem(State.STORAGE_KEY, this.serialize());
        } catch (e) {
            console.warn('Failed to save state to localStorage:', e);
        }
    }

    private loadFromLocalStorage(): void {
        try {
            const savedState = localStorage.getItem(State.STORAGE_KEY);
            if (savedState) {
                const obj = JSON.parse(savedState);
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        this.state.set(key, obj[key]);
                    }
                }
            }
            console.log(this.state)
        } catch (e) {
            console.warn('Failed to load state from localStorage:', e);
        }
    }

    public clearLocalStorage(): void {
        try {
            localStorage.removeItem(State.STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }
    }

    public hasAnyState(): boolean {
        return this.state.size > 0;
    }
}