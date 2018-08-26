function numberPositiveMod(n: number, div: number): number {
    return ((n%div)+div)%div;
}