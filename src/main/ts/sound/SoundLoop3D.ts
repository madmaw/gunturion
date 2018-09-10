interface SoundLoop3DFactory {
    (seed: number, cycleTime: number, size: number): SoundLoop3D;
}

interface SoundLoop3D {
    // starts and/or moves the sound
    startOrMove(x: number, y: number, z: number): void;

    stopLooping(): void;
}