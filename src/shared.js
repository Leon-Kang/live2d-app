const path = require("path");
const fs = require("fs");

function addFilePicker(buttonId, callback) {
    const selectBtn = document.getElementById(buttonId);
    selectBtn.addEventListener('click', function () {
        const dialog = require('electron').remote.dialog;
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'model', extensions: [ '*.model.json', '*.model3.json', '.model3.json' ] },
                { name: 'All', extensions: [ '*' ] },
            ]}).then(r => {
                let paths = r.filePaths;
                paths.length > 0 && callback(paths);
            })
    })
}

function saveToPng(filepath, canvasId) {
    // Save canvas to png file
    const canvas = document.getElementById(canvasId);
    const img = canvas.toDataURL();
    const data = img.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(data, "base64");
    fs.writeFileSync(filepath, buf);
};

function getWebGLContext() {
    const NAMES = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];

    for (let i = 0; i < NAMES.length; i++) {
        try {
            const ctx = this.canvas.getContext(NAMES[i], {
                premultipliedAlpha: true,
                preserveDrawingBuffer: true,
            });
            if (ctx) return ctx;
        } catch (e) {}
    }
    return null;
}

function l2dError(msg) {
    if (!LAppDefine.DEBUG_LOG) return;
    console.error(msg);
}

function walkdir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        var filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkdir(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
}
