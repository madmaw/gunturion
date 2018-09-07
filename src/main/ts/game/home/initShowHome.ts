interface ShowMenu {
    (): void;
}

function initShowHome(showGame: ShowPlay) {
    let homeDiv = document.getElementById('h');
    let playButton = document.getElementById('p');

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