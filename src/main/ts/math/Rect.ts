type Rect<Dimension> = {
    min: Dimension;
    max: Dimension;
}

type Rect2 = Rect<Vector2>;
type Rect3 = Rect<Vector3>;

function rect2Overlap(r1: Rect2, r2: Rect2, r1Div?: Vector2): Rect2 {
    return rectOverlap(r1, r2, 2, r1Div);
}

function rect3Overlap(r1: Rect3, r2: Rect3, r1Div?: Vector3): Rect3 {
    return rectOverlap(r1, r2, 3, r1Div);
}

function rect2Contains(r: Rect2, x: number, y: number): boolean {
    return r.min[0] <= x && r.min[1] <= y && r.max[0] >= x && r.max[1] >= y;
}

function rectOverlap(r1: Rect<number[]>, r2: Rect<number[]>, dimension: number, r1Div: number[]): Rect<number[]> {
    let ok = true;
    let min = [];
    let max = [];
    for( let i=0; i<dimension; i++ ) {
        let min1 = r1.min[i];
        let max1 = r1.max[i];
        let min2 = r2.min[i];
        let max2 = r2.max[i];
        if( r1Div ) {
            min1 = Math.floor(min1/r1Div[i]);
            max1 = Math.floor(max1/r1Div[i]);
        }
        
        let minMax = Math.min(max1, max2);
        let maxMin = Math.max(min1, min2);
        let d = minMax - maxMin;
        ok = ok && d >= 0;
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