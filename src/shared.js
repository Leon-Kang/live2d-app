function addFilePicker(buttonId, callback) {
    const selectBtn = document.getElementById(buttonId);
    selectBtn.addEventListener('click', function () {
        const dialog = require('electron').remote.dialog;
        dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'model', extensions: [ '*.model.json', '*.model3.json' ] },
                { name: 'All', extensions: [ '*' ] },
            ]}).then(r => {
                let paths = r.filePaths;
                callback(paths);
            })
    })
}
