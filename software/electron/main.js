const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { Client, LocalAuth } = require('whatsapp-web.js')
const QRCode = require('qrcode')
const isDev = !app.isPackaged

// Global crash handler - log to file in userData
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err)
  try {
    const logPath = path.join(app.isPackaged ? app.getPath('userData') : __dirname, 'crash.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] CRASH: ${err.stack || err}\n`)
  } catch (e) {}
})

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled Rejection:', reason)
})

let mainWindow
let whatsappClient = null
let whatsappStatus = 'DISCONNECTED'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    show: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0F1E',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Log any renderer failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[LOAD FAIL] ${errorCode} - ${errorDescription} - URL: ${validatedURL}`)
    // If the dist/index.html fails to load, show an error dialog
    if (!isDev) {
      dialog.showErrorBox('Application Error', 
        `Failed to load app (${errorCode}):\n${errorDescription}\n\nPlease reinstall the application.`)
    }
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[RENDERER CRASH]', details)
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => { if (!mainWindow) createWindow() })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

let isQuitting = false
app.on('before-quit', async (event) => {
  if (isQuitting) return
  if (whatsappClient) {
    event.preventDefault()
    isQuitting = true
    console.log('Shutting down WhatsApp client...')
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WhatsApp destroy timed out')), 2000)
      )
      await Promise.race([whatsappClient.destroy(), timeout])
      console.log('WhatsApp client destroyed.')
    } catch (err) {
      console.error('Error during WhatsApp destroy:', err)
    } finally {
      app.exit(0)
    }
  }
})

// ─── Window Controls ─────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// ─── DB IPC Handlers ─────────────────────────────────────────────────────────
let db
try {
  db = require('./db')
  console.log('✅ Database loaded successfully')
} catch (err) {
  console.error('❌ FATAL: Database failed to initialize:', err)
  // Write crash log
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB CRASH: ${err.stack || err}\n`)
  } catch (e) {}
  // Show error to user then quit
  app.whenReady().then(() => {
    dialog.showErrorBox('Database Error', 
      `The application database failed to initialize.\n\nError: ${err.message}\n\nPlease check if the app has write permissions to:\n${app.getPath('userData')}\n\nIf the problem persists, try running as administrator.`)
    app.quit()
  })
  // Provide stub db so IPC handlers don't crash
  db = {
    getAllSettings: () => ({}),
    setSetting: () => ({ success: false }),
    checkLicense: () => ({ activated: false, type: 'Trial', trialRemaining: 7, isExpired: false, hwid: 'unknown' }),
    activateLicense: () => ({ success: false, message: 'Database unavailable' }),
    getBooks: () => [], getBook: () => null, addBook: () => ({ success: false }), updateBook: () => ({ success: false }), deleteBook: () => ({ success: false }), searchBooks: () => [],
    getPublishers: () => [], addPublisher: () => ({ success: false }), deletePublisher: () => ({ success: false }),
    getMembers: () => [], getMember: () => null, addMember: () => ({ success: false }), updateMember: () => ({ success: false }), deleteMember: () => ({ success: false }), searchMembers: () => [],
    getMemberHistory: () => [], getMemberAnalytics: () => ({}), updateMemberFine: () => ({ success: false }), getNextRegNo: () => '001', getReservedCount: () => 0,
    issueBook: () => ({ success: false }), returnBook: () => ({ success: false }), renewBook: () => ({ success: false }),
    getActiveBorrowings: () => [], getOverdueBorrowings: () => [], getAllBorrowings: () => [],
    addPayment: () => ({ success: false }), getPayments: () => [], payMemberFee: () => ({ success: false }), getFeeStats: () => ({}), getRecentPayments: () => [],
    getDashboardStats: () => ({}), getChartData: () => [],
    login: () => ({ success: false, message: 'Database unavailable' }), changePassword: () => ({ success: false }), resetAdmin: () => ({ success: false }),
    getUsers: () => [], addUser: () => ({ success: false }), updateUser: () => ({ success: false }), deleteUser: () => ({ success: false }),
    getSponsors: () => [], addSponsor: () => ({ success: false }), deleteSponsor: () => ({ success: false }),
    getAuthors: () => [], addAuthor: () => ({ success: false }), deleteAuthor: () => ({ success: false }),
    getDbPath: () => '', getBackupPath: () => '',
  }
}

// Settings
ipcMain.handle('settings-get-all', () => db.getAllSettings())
ipcMain.handle('settings-set', (_, key, value) => db.setSetting(key, value))

// License
ipcMain.handle('license-check', () => db.checkLicense())
ipcMain.handle('license-activate', (_, key) => db.activateLicense(key))

// Books
ipcMain.handle('books-get-all', (_, filters) => db.getBooks(filters))
ipcMain.handle('books-get-one', (_, id) => db.getBook(id))
ipcMain.handle('books-add', (_, data) => db.addBook(data))
ipcMain.handle('books-update', (_, id, data) => db.updateBook(id, data))
ipcMain.handle('books-set-amounts', (_, updates) => db.setBookAmounts(updates))
ipcMain.handle('books-delete', (_, id) => db.deleteBook(id))
ipcMain.handle('books-search', (_, query) => db.searchBooks(query))
ipcMain.handle('publishers-get-all', () => db.getPublishers())
ipcMain.handle('publishers-add', (_, data) => db.addPublisher(data))
ipcMain.handle('publishers-delete', (_, id) => db.deletePublisher(id))

// Members
ipcMain.handle('members-get-all', (_, filters) => db.getMembers(filters))
ipcMain.handle('members-get-one', (_, id) => db.getMember(id))
ipcMain.handle('members-add', (_, data) => db.addMember(data))
ipcMain.handle('members-update', (_, id, data) => db.updateMember(id, data))
ipcMain.handle('members-delete', (_, id) => db.deleteMember(id))
ipcMain.handle('members-search', (_, query) => db.searchMembers(query))
ipcMain.handle('members-get-history', (_, id) => db.getMemberHistory(id))
ipcMain.handle('members-get-analytics', (_, id) => db.getMemberAnalytics(id))
ipcMain.handle('members-update-fine', (_, id, delta) => db.updateMemberFine(id, delta))
ipcMain.handle('members-get-next-reg-no', () => db.getNextRegNo())
ipcMain.handle('members-get-reserved-count', () => db.getReservedCount())

// Borrowings
ipcMain.handle('borrowings-issue', (_, data) => db.issueBook(data))
ipcMain.handle('borrowings-return', (_, id, data) => db.returnBook(id, data))
ipcMain.handle('borrowings-get-active', () => db.getActiveBorrowings())
ipcMain.handle('borrowings-get-overdue', () => db.getOverdueBorrowings())
ipcMain.handle('borrowings-renew', (_, id) => db.renewBook(id))
ipcMain.handle('borrowings-get-all', (_, filters) => db.getAllBorrowings(filters))

// Payments
ipcMain.handle('payments-add', (_, data) => db.addPayment(data))
ipcMain.handle('payments-get-all', (_, filters) => db.getPayments(filters))
ipcMain.handle('members-pay-fee', (_, memberId, amount) => db.payMemberFee(memberId, amount))
ipcMain.handle('fees-get-stats', () => db.getFeeStats())
ipcMain.handle('fees-get-recent', (_, limit) => db.getRecentPayments(limit))

// Dashboard stats
ipcMain.handle('dashboard-stats', () => db.getDashboardStats())
ipcMain.handle('dashboard-chart-data', () => db.getChartData())

// Auth
ipcMain.handle('auth-login', (_, username, password) => db.login(username, password))
ipcMain.handle('auth-change-password', (_, id, oldPwd, newPwd) => db.changePassword(id, oldPwd, newPwd))
ipcMain.handle('auth-reset-admin', (_, code, user, pwd) => db.resetAdmin(code, user, pwd))
ipcMain.handle('users-get-all', () => db.getUsers())
ipcMain.handle('users-add', (_, data) => db.addUser(data))
ipcMain.handle('users-update', (_, id, data) => db.updateUser(id, data))
ipcMain.handle('users-delete', (_, id) => db.deleteUser(id))

// Sponsors
ipcMain.handle('sponsors-get-all', () => db.getSponsors())
ipcMain.handle('sponsors-add', (_, data) => db.addSponsor(data))
ipcMain.handle('sponsors-delete', (_, id) => db.deleteSponsor(id))

// Authors
ipcMain.handle('authors-get-all', () => db.getAuthors())
ipcMain.handle('authors-add', (_, data) => db.addAuthor(data))
ipcMain.handle('authors-delete', (_, id) => db.deleteAuthor(id))
ipcMain.handle('authors-find-similar', (_, name) => db.findSimilarAuthors(name))
ipcMain.handle('authors-merge', (_, data) => db.mergeAuthors(data))


/**
 * The text of the confirmation before a restore.
 *
 * A restore replaces every book, member, fee and setting. When the backup
 * holds no amounts, the amounts that were entered in the current database
 * are lost by the restore, and the librarian has to know that before it
 * happens - not after.
 *
 * @param {{ books: number, withAmounts: number, missingAmounts: number }} backup
 * @param {{ books: number, withAmounts: number }} current
 * @param {string} lang 'en' or 'ml'
 * @returns {{ title: string, message: string }}
 */
function restoreConfirmText(backup, current, lang) {
  const ml = lang === 'ml'
  const lines = []
  if (ml) {
    lines.push('ബാക്കപ്പ് തിരിക്കുന്നത് ഇപ്പോൾ ഉള്ള എല്ലാ പുസ്തകങ്ങളും അംഗങ്ങളും ഫീസുകളും ക്രമീകരണങ്ങളും മാറ്റിസ്ഥില്ല. സോഫ്റ്റ്‌വെയർ തന്നെ അടയ്ക്കും തുടങ്ങും.')
    lines.push('')
    lines.push(`ബാക്കപ്പിൽ ${backup.books} പുസ്തകങ്ങൾ ഉണ്ട്.`)
  } else {
    lines.push('Restoring replaces every book, member, fee and setting that is there now.')
    lines.push('The software restarts afterwards.')
    lines.push('')
    lines.push(`The backup holds ${backup.books} book${backup.books === 1 ? '' : 's'}.`)
  }
  if (backup.missingAmounts > 0) {
    if (ml) {
      lines.push('')
      lines.push(`ആ പുസ്തകങ്ങളിൽ ${backup.missingAmounts} പുസ്തകങ്ങളുടെ വില രേഖപ്പെടുത്തിയിട്ടില്ല — ബാക്കപ്പ് എടുത്തപ്പോൾ ഉപയോഗിച്ച പതിപ്പ് വില രേഖപ്പെടുത്തില്ലാത്ത പതിപ്പ് ആണ്. ഇപ്പോൾ നിങ്ങൾ ടൈപ്പ് ചെയ്ത വിലകൾ ഈ ബാക്കപ്പിലേക്ക് മാറും.`)
    } else {
      lines.push('')
      lines.push(`It has no amount for ${backup.missingAmounts} of those books — it was taken with a version that never saved the price. The amounts you entered now will be replaced by them.`)
    }
  } else if (current.withAmounts > backup.withAmounts) {
    if (ml) {
      lines.push('')
      lines.push(`ബാക്കപ്പിൽ ${backup.withAmounts} പുസ്തകങ്ങളുടെ വില മാത്രമാണ് രേഖപ്പെടുത്തിയിരുന്നത്. ഇപ്പോൾ ഉള്ള ${current.withAmounts} വിലകളിൽ ഒന്നും ബാക്കപ്പിലില്ല.`)
    } else {
      lines.push('')
      lines.push(`It holds an amount for ${backup.withAmounts} books. The ${current.withAmounts} amounts you have now are not all in the backup and will be replaced.`)
    }
  }
  return {
    title: ml ? 'ബാക്കപ്പ് തിരിക്കണോ?' : 'Restore this backup?',
    message: lines.join('\n'),
  }
}

// Backup / Restore
ipcMain.handle('backup-create', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Backup',
    defaultPath: `library-backup-${new Date().toISOString().slice(0,10)}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
  })
  if (filePath) {
    // The SQLite backup API, not a plain file copy: a copy of the database
    // file can be missing the changes that are still in the write-ahead log.
    return await db.createBackupFile(filePath)
  }
  return { success: false, message: 'cancelled' }
})
ipcMain.handle('backup-restore', async (_, lang) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Backup',
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (!filePaths || !filePaths[0]) return { success: false, message: 'cancelled' }

  const backup = db.inspectBackupFile(filePaths[0])
  if (!backup.ok) return { success: false, message: backup.message }

  const current = db.countAmounts()
  const text = restoreConfirmText(backup, current, lang)
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: [lang === 'ml' ? 'തിരിക്കുക' : 'Restore', lang === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: text.title,
    message: text.title,
    detail: text.message,
  })
  if (response !== 0) return { success: false, message: 'cancelled' }

  const result = await db.restoreFromFile(filePaths[0])
  if (result.success) {
    app.relaunch(); app.exit(0)
  }
  return result
})
ipcMain.handle('backup-restore-latest', async (_, lang) => {
  const file = db.getLatestBackupFile()
  if (!file) {
    return { success: false, message: 'There is no automatic backup yet.' }
  }
  const backup = db.inspectBackupFile(file)
  if (!backup.ok) return { success: false, message: backup.message }

  const current = db.countAmounts()
  const text = restoreConfirmText(backup, current, lang)
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: [lang === 'ml' ? 'തിരിക്കുക' : 'Restore', lang === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: text.title,
    message: text.title,
    detail: text.message,
  })
  if (response !== 0) return { success: false, message: 'cancelled' }

  const result = await db.restoreFromFile(file)
  if (result.success) {
    app.relaunch(); app.exit(0)
  }
  return result
})
ipcMain.handle('backup-get-path', () => db.getBackupPath())
ipcMain.handle('backup-get-report', () => db.getRestoreReport())
ipcMain.handle('backup-clear-report', () => { db.clearRestoreReport(); return { success: true } })

// File dialog for photos
ipcMain.handle('pick-image', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Photo',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties: ['openFile'],
  })
  if (filePaths && filePaths[0]) {
    const data = fs.readFileSync(filePaths[0])
    return `data:image/jpeg;base64,${data.toString('base64')}`
  }
  return null
})

// Notifications
ipcMain.on('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show()
})

// WhatsApp Automation Logic
ipcMain.on('whatsapp:init', () => {
  if (whatsappClient) {
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
    return
  }
  
  whatsappStatus = 'INITIALIZING'
  mainWindow.webContents.send('whatsapp:status', whatsappStatus)

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: 'kpl-session',
      dataPath: path.join(app.getPath('userData'), 'whatsapp-sessions')
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  })

  whatsappClient.on('qr', async (qr) => {
    whatsappStatus = 'QR_RECEIVED'
    const qrDataUrl = await QRCode.toDataURL(qr)
    mainWindow.webContents.send('whatsapp:qr', qrDataUrl)
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
  })

  whatsappClient.on('ready', () => {
    whatsappStatus = 'CONNECTED'
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
  })

  whatsappClient.on('authenticated', () => {
    whatsappStatus = 'AUTHENTICATED'
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
  })

  whatsappClient.on('auth_failure', (msg) => {
    whatsappStatus = 'DISCONNECTED'
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
    whatsappClient = null
  })

  whatsappClient.on('disconnected', () => {
    whatsappStatus = 'DISCONNECTED'
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
    whatsappClient = null
  })

  whatsappClient.initialize().catch(err => {
    console.error('WA Init Error:', err)
    whatsappStatus = 'DISCONNECTED'
    mainWindow.webContents.send('whatsapp:status', whatsappStatus)
    whatsappClient = null
  })
})

ipcMain.handle('whatsapp:get-status', () => whatsappStatus)

ipcMain.handle('whatsapp:send', async (_, to, msg) => {
  if (!whatsappClient || whatsappStatus !== 'CONNECTED') {
    return { success: false, message: 'WhatsApp not connected' }
  }
  try {
    let phone = to.replace(/\D/g, '')
    if (phone.length === 10) phone = '91' + phone
    const chatId = `${phone}@c.us`
    await whatsappClient.sendMessage(chatId, msg)
    return { success: true }
  } catch (err) {
    return { success: false, message: err.message }
  }
})

// OCR Processing Handler (Bypasses Renderer Web Worker constraints in Electron)
const Tesseract = require('tesseract.js')
const https = require('https')

async function downloadFileWithFallback(filename, destPath, onStatus) {
  const urls = [
    `https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0/${filename}`,
    `https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/${filename}`
  ];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      if (onStatus) onStatus(`Downloading OCR database: ${filename.split('.')[0].toUpperCase()} (${i === 0 ? 'CDN' : 'GitHub'})...`);
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        
        function get(requestUrl) {
          https.get(requestUrl, { timeout: 20000 }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              get(response.headers.location);
              return;
            }
            
            if (response.statusCode !== 200) {
              reject(new Error(`Status Code ${response.statusCode}`));
              return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', (err) => {
            reject(err);
          });
        }
        
        get(url);
      });
      return;
    } catch (err) {
      console.warn(`Download failed for ${url}:`, err.message);
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) {}
      }
      if (i === urls.length - 1) {
        throw new Error(`Failed to download ${filename}: ${err.message}`);
      }
    }
  }
}

const zlib = require('zlib')

async function ensureTrainedData(tessdataDir, onStatus) {
  const engFile = path.join(tessdataDir, 'eng.traineddata.gz');
  const malFile = path.join(tessdataDir, 'mal.traineddata.gz');
  const engFileRaw = path.join(tessdataDir, 'eng.traineddata');
  const malFileRaw = path.join(tessdataDir, 'mal.traineddata');

  if (!fs.existsSync(engFile) || fs.statSync(engFile).size < 100000) {
    await downloadFileWithFallback('eng.traineddata.gz', engFile, onStatus);
  }
  if (!fs.existsSync(engFileRaw) || fs.statSync(engFileRaw).size < 1000000) {
    if (onStatus) onStatus('Extracting English database...');
    try {
      const input = fs.readFileSync(engFile);
      const output = zlib.gunzipSync(input);
      fs.writeFileSync(engFileRaw, output);
    } catch (err) {
      console.error('Error decompressing English:', err);
    }
  }

  if (!fs.existsSync(malFile) || fs.statSync(malFile).size < 100000) {
    await downloadFileWithFallback('mal.traineddata.gz', malFile, onStatus);
  }
  if (!fs.existsSync(malFileRaw) || fs.statSync(malFileRaw).size < 100000) {
    if (onStatus) onStatus('Extracting Malayalam database...');
    try {
      const input = fs.readFileSync(malFile);
      const output = zlib.gunzipSync(input);
      fs.writeFileSync(malFileRaw, output);
    } catch (err) {
      console.error('Error decompressing Malayalam:', err);
    }
  }
}

ipcMain.handle('ocr-process', async (event, imageSrc) => {
  try {
    let input = imageSrc
    if (typeof imageSrc === 'string' && imageSrc.startsWith('data:image')) {
      const base64Data = imageSrc.replace(/^data:image\/\w+;base64,/, "")
      input = Buffer.from(base64Data, 'base64')
    }

    const tessdataDir = path.join(app.getPath('userData'), 'tessdata')
    if (!fs.existsSync(tessdataDir)) {
      fs.mkdirSync(tessdataDir, { recursive: true })
    }

    // 1. Ensure traineddata files are downloaded
    await ensureTrainedData(tessdataDir, (statusText) => {
      mainWindow?.webContents.send('ocr-status-update', statusText)
    })

    console.log('Starting OCR in main process. tessdata:', tessdataDir)
    mainWindow?.webContents.send('ocr-status-update', 'Extracting text from image...')
    const result = await Tesseract.recognize(
      input,
      'eng+mal',
      {
        langPath: tessdataDir,
        cachePath: tessdataDir,
        logger: m => {
          if (m.status === 'recognizing text') {
            mainWindow?.webContents.send('ocr-progress', m.progress)
          }
        }
      }
    )
    const formattedLines = (result.data.lines || []).map(l => ({
      text: l.text,
      bbox: l.bbox,
      words: (l.words || []).map(w => ({
        text: w.text,
        bbox: w.bbox
      }))
    }))
    console.log('OCR Completed successfully!')
    return { 
      success: true, 
      text: result.data.text,
      lines: formattedLines
    }
  } catch (err) {
    console.error('OCR process error:', err)
    return { success: false, error: err.message }
  }
})
