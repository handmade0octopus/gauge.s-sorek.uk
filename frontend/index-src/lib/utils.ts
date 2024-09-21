export function getBasePath(path: string): string {
    if(!path) return '/';

    const lastPathElement = path.split('/').pop();

    if (lastPathElement.includes('.')) {
        return path.split('/').slice(0, -1).join('/');
    }

    return path.at(-1) === '/' ? path : path + '/';
}