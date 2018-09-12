function audioDisconnect(nodes: AudioNode[]) {
    for( let node of nodes ) {
        if( node ) {
            node.disconnect();
        }
    }
}

function audioDisconnectSingleNode(node: AudioNode) {
    if( node ) {
        node.disconnect();
    }
}