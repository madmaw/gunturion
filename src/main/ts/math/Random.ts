interface RandomNumberGenerator {
    (range?: number): number;
}

interface RandomNumberGeneratorFactory {
    (seed: number): RandomNumberGenerator;
}

function sinRandomNumberGeneratorFactory(seed: number): RandomNumberGenerator {
    return function (range?:number): number {
        var x = Math.sin(seed++) * 1e5;
        var r = x - Math.floor(x);
        if (range) {
            r = Math.floor(r * range);
        }
        return r;
    }
}