type Rect<Dimension> = {
    min: Dimension;
    max: Dimension;
}

type Rect2 = Rect<Vector2>;
type Rect3 = Rect<Vector3>;

function rect2Overlap(r1: Rect2, r2: Rect2): Rect2 {
    return rectOverlap(r1, r2, 2);
}

function rect3Overlap(r1: Rect3, r2: Rect3): Rect3 {
    return rectOverlap(r1, r2, 3);
}

function rectOverlap(r1: Rect<number[]>, r2: Rect<number[]>, dimension: number): Rect<number[]> {
    let ok = true;
    let min = [];
    let max = [];
    for( let i=0; i<dimension; i++ ) {
        let min1 = r1.min[i];
        let max1 = r1.max[i];
        let min2 = r2.min[i];
        let max2 = r2.max[i];
        
        let minMax = Math.min(max1, max2);
        let maxMin = Math.max(min1, min2);
        let d = minMax - maxMin;
        ok = ok && d > 0;
        if( ok ) {
            min.push(maxMin);
            max.push(minMax);
        } 
    }
    if( ok ) {
        return {
            min: min, 
            max: max
        }
    } 
    // return undefined;
}