const { app, BrowserWindow } = require('electron')



function createWindow () {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
    },
    title: 'live2d-app-v2'
  })

  win.loadFile('index.html')

  // Open the DevTools.
  win.webContents.openDevTools()
  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });

  // const view = new BrowserWindow({
  //   width: 1920,
  //   height: 1080,
  //   webPreferences: {
  //     enableRemoteModule: true,
  //     nodeIntegration: true,
  //     contextIsolation: true,
  //   },
  //   title: 'pixi-render'
  // })
  // view.loadFile('pixiRender.html')
  //
  // win.addTabbedWindow(view)
  //
  // view.webContents.openDevTools()
  // view.webContents.on('devtools-opened', () => {
  //   view.webContents.focus();
  // });
}

app.whenReady().then(createWindow)

app.on('new-window-for-tab', (event) => {
  // const newWin = new BrowserWindow({
  //   width: 1920,
  //   height: 1080,
  //   webPreferences: {
  //     enableRemoteModule: true,
  //     nodeIntegration: true
  //   }
  // })
  // newWin.loadFile('index.html');
  // newWin.webContents.openDevTools();
  // newWin.webContents.on('devtools-opened', () => {
  //   newWin.webContents.focus();
  // });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
