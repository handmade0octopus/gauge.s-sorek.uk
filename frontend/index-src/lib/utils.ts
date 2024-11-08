export class Path {
    pathParts: string[];
    constructor(path?: string) {
        if (path) {
            this.setPath(path);
        } else {
            this.pathParts = [];
        }
    }

    public setPath(path: string): void {
        this.pathParts = path.split('/');
    }

    public at(index: number): string {
        return this.pathParts[index];
    }

    public toString(): string {
        return this.pathParts.join('/');
    }

    public append(path: string): void {
        this.pathParts = [...this.pathParts, ...path.split('/')];
        this.pathParts = this.pathParts.filter(part => part !== '');
    }

    public pop(): string {
        return this.pathParts.pop();
    }

    public popIfFile(): string | null {
        if (this.pathParts[this.pathParts.length - 1].includes('.')) {
            return this.pop();
        }
        return null;
    }

    public basePath(): string {
        if (this.pathParts.length === 0) return '/';

        const lastPathElement = this.pathParts[this.pathParts.length - 1];

        if (lastPathElement.includes('.')) {
            return this.pathParts.slice(0, -1).join('/');
        }

        return this.pathParts[this.pathParts.length - 1] === '/' ? this.pathParts.join('/') : this.pathParts.join('/') + '/';
    }
}

// TODO: Replace all getBasePath calls with Path class
export function getBasePath(path: string): string {
    if(!path) return '/';

    const lastPathElement = path.split('/').pop();

    if (lastPathElement.includes('.')) {
        return path.split('/').slice(0, -1).join('/');
    }

    return path.at(-1) === '/' ? path : path + '/';
}