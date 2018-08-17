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

