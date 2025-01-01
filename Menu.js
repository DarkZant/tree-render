function showRightMenu(menuID, width) {
    let menu = document.getElementById(menuID);
    menu.style.visibility = "visible";
    menu.style.width = '' + width + 'vw';
    document.getElementById('menuicons').style.display = "none";
}

function hideRightMenu(menuID) {
    let menu = document.getElementById(menuID);
    document.getElementById('menuicons').style.display = "inline";
    menu.style.width = "0%";
    setTimeout(function() {
        menu.style.visibility = "hidden";
    }, 100);
}

document.addEventListener('wheel', function (event) {
    if (event.ctrlKey && event.target.tagName !== 'CANVAS') {
        event.preventDefault(); // Prevent zooming outside canvas
    }
}, { passive: false });

document.addEventListener('gesturestart', function (event) {
    if (event.target.tagName !== 'CANVAS') {
        event.preventDefault(); // Prevent pinch zoom outside canvas
    }
});
