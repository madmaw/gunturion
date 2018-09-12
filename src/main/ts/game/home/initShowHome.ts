interface ShowMenu {
    (): void;
}

function initShowHome(showGame: ShowPlay) {
    let homeDiv = d.getElementById('h');
    let playButton = d.getElementById('p');

    let destroy = function() {
        homeDiv.className = '';
    }

    let f = function() {
        homeDiv.className = 'v';

        playButton.onclick = function() {
            destroy();
            showGame(f);   
        }
    }
    return f;
}