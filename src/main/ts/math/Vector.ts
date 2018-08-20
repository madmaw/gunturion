type Vector2 = number[];
type Vector3 = number[];
type Vector4 = number[];


function vector3TransformMatrix4(x: number, y: number, z: number, m: Matrix4): Vector3 {
    let w = (m[3] * x + m[7] * y + m[11] * z + m[15]) || 1.0;
    return [
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    ];
}

function vector3CrossProduct(v1: Vector3, v2: Vector3): Vector3 {
    return [
        v1[1] * v2[2] - v1[2]*v2[1], 
        v1[2] * v2[0] - v1[0]*v2[2], 
        v1[0] * v2[1] - v1[1]*v2[0]
    ];
}

function vector3DotProduct(v1: Vector3, v2: Vector3): number {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function vector3Length(v: Vector3): number {
    return Math.sqrt(vector3DotProduct(v, v));
}

function vector3Mix(v1: Vector3, v2: Vector3, amt: number) {
    let result: number[] = [];
    for( let i=0; i<3; i++ ) {        
        result.push(v1[i] * amt + v2[i] * (1 - amt))
    }
    return result;
}

function vector2PolyContains(poly: Vector2[], point: Vector2): boolean {
    // from https://stackoverflow.com/questions/22521982/check-if-point-inside-a-polygon
    let x = point[0], y = point[1];

    let inside: boolean;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        let xi = poly[i][0], yi = poly[i][1];
        let xj = poly[j][0], yj = poly[j][1];

        let intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}