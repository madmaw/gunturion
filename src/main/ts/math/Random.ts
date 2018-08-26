interface RandomNumberGenerator {
    (range?: number): number;
}

interface RandomNumberGeneratorFactory {
    (seed: number): RandomNumberGenerator;
}

function sinRandomNumberGeneratorFactory(baseSeed: number): RandomNumberGeneratorFactory {
    return function (bonusSeed: number) {
        let seed = baseSeed + bonusSeed;
        return function (range?:number): number {
            var x = Math.sin(seed++) * 1e5;
            var r = x - Math.floor(x);
            if (range) {
                r = (r * range) | 0;
            }
            return r;
        }    
    }
}