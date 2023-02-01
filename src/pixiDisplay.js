const { Live2DModel, Cubism2ModelSettings } = require("pixi-live2d-display");
const PIXI = require("pixi.js");
const path = require("path");
const fs = require("fs");
const { Ticker, TickerPlugin } = require("@pixi/ticker")
const { InteractionManager } = require('@pixi/interaction');

const datasetRoot = "dataset"; // Root of dataset directory
const outputRoot = "output"; // Root of output directory
const blacklistPath = path.join(outputRoot, "blacklist.txt"); // Blacklist path
const baseResolution = 1024;

const thisRef = this;

window.onerror = function (msg, url, line, col, error) {
    const err = "file:" + url + "<br>line:" + line + " " + msg;
    console.log(err);
};

window.PIXI = PIXI;

async function pixiViewer() {
    this.platform = window.navigator.platform.toLowerCase();
    this.app = new PIXI.Application({
        view: document.getElementById('canvas'),
        width: 1024,
        height: 1024,
        autoStart: true,
    });

    PIXI.extensions.add(InteractionManager);
    Live2DModel.registerTicker(Ticker);
    this.app.renderer.backgroundColor = 0xFF5733

    const model = await loadPixiModel();

    this.app.stage.addChild(model);
}

function walkdir(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkdir(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
}

function loadPixiModel() {
    let filelist = [];
    walkdir("dataset", function (filepath) {
        if (filepath.endsWith(".model3.json")) {
            filelist.push(filepath);
        }
    });
    console.log("pixi file path: " + filelist);
    const last = filelist[filelist.length - 1];
    console.log(last);
    return Live2DModel.from(last);
}
