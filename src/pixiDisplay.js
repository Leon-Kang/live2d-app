const { Live2DModel } = require("pixi-live2d-display");
const PIXI = require("pixi.js");
const path = require("path");
const fs = require("fs");

const datasetRoot = "dataset"; // Root of dataset directory
const outputRoot = "output"; // Root of output directory
const blacklistPath = path.join(outputRoot, "blacklist.txt"); // Blacklist path
const baseResolution = 1024;

var thisRef = this;

// require("src/live2d/live2dcubismcore.min.js");

window.onerror = function (msg, url, line, col, error) {
    const err = "file:" + url + "<br>line:" + line + " " + msg;
    l2dError(err);
};

window.PIXI = PIXI;

function pixiViewer() {
    this.platform = window.navigator.platform.toLowerCase();
    this.app = new PIXI.Application({
        view: document.getElementById('glcanvas'),
    });
    pixiViewer.init();
}

pixiViewer.init = function () {
    loadPixiModel();

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

async function loadPixiModel() {
    let filelist = [];
    walkdir(datasetRoot, function (filepath) {
        if (filepath.endsWith(".model.json")) {
            filelist.push(filepath);
        }
    });
    console.log("pixi file path: " + filelist);
    if (this.usingPixi) {
        const model = await Live2DModel.from(filelist[filelist.length - 1]);
        this.app.stage.addChild(model);
    }
}
