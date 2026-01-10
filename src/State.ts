export class State {
    private state: Map<string, any> = new Map();

    public set<T>(key: string, value: T): void {
        this.state.set(key, value);

        console.log(JSON.parse(this.serialize()))
    }

    public get<T>(key: string): T | undefined {
        return this.state.get(key) as T | undefined;
    }

    public has(key: string): boolean {
        return this.state.has(key);
    }

    public delete(key: string): void {
        this.state.delete(key);
    }

    public clear(): void {
        this.state.clear();
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
    }
}