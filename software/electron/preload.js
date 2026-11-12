const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Settings & License
  getAllSettings:  () => ipcRenderer.invoke('settings-get-all'),
  setSetting:      (key, value) => ipcRenderer.invoke('settings-set', key, value),
  checkLicense:    () => ipcRenderer.invoke('license-check'),
  activateLicense: (key) => ipcRenderer.invoke('license-activate', key),

  // Books
  getBooks:    (filters) => ipcRenderer.invoke('books-get-all', filters),
  getBook:     (id) => ipcRenderer.invoke('books-get-one', id),
  addBook:     (data) => ipcRenderer.invoke('books-add', data),
  updateBook:  (id, data) => ipcRenderer.invoke('books-update', id, data),
setBookAmounts: (updates) => ipcRenderer.invoke('books-set-amounts', updates),
  deleteBook:  (id) => ipcRenderer.invoke('books-delete', id),
  searchBooks: (query) => ipcRenderer.invoke('books-search', query),
  getPublishers:   () => ipcRenderer.invoke('publishers-get-all'),
  addPublisher:    (data) => ipcRenderer.invoke('publishers-add', data),
  deletePublisher: (id) => ipcRenderer.invoke('publishers-delete', id),

  // Members
  getMembers:     (filters) => ipcRenderer.invoke('members-get-all', filters),
  getMember:      (id) => ipcRenderer.invoke('members-get-one', id),
  addMember:      (data) => ipcRenderer.invoke('members-add', data),
  updateMember:   (id, data) => ipcRenderer.invoke('members-update', id, data),
  deleteMember:   (id) => ipcRenderer.invoke('members-delete', id),
  searchMembers:  (query) => ipcRenderer.invoke('members-search', query),
  getNextRegNo:   () => ipcRenderer.invoke('members-get-next-reg-no'),
  getReservedCount: () => ipcRenderer.invoke('members-get-reserved-count'),
  getMemberHistory: (id) => ipcRenderer.invoke('members-get-history', id),
  getMemberAnalytics: (id) => ipcRenderer.invoke('members-get-analytics', id),
  updateMemberFine: (id, delta) => ipcRenderer.invoke('members-update-fine', id, delta),
  payMemberFee:   (memberId, amount) => ipcRenderer.invoke('members-pay-fee', memberId, amount),

  // Borrowings
  issueBook:       (data) => ipcRenderer.invoke('borrowings-issue', data),
  returnBook:      (id, data) => ipcRenderer.invoke('borrowings-return', id, data),
  renewBook:       (id) => ipcRenderer.invoke('borrowings-renew', id),
  getActiveBorrowings: () => ipcRenderer.invoke('borrowings-get-active'),
  getOverdueBorrowings: () => ipcRenderer.invoke('borrowings-get-overdue'),
  getAllBorrowings: (filters) => ipcRenderer.invoke('borrowings-get-all', filters),

  // Payments
  addPayment:  (data) => ipcRenderer.invoke('payments-add', data),
  getPayments: (filters) => ipcRenderer.invoke('payments-get-all', filters),
  getFeeStats: () => ipcRenderer.invoke('fees-get-stats'),
  getRecentPayments: (limit) => ipcRenderer.invoke('fees-get-recent'),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard-stats'),
  getChartData:      () => ipcRenderer.invoke('dashboard-chart-data'),

  // Auth
  login:          (u, p) => ipcRenderer.invoke('auth-login', u, p),
  changePassword: (id, old, nw) => ipcRenderer.invoke('auth-change-password', id, old, nw),
  resetAdminCredentials: (code, user, pwd) => ipcRenderer.invoke('auth-reset-admin', code, user, pwd),
  getUsers:       () => ipcRenderer.invoke('users-get-all'),
  addUser:        (data) => ipcRenderer.invoke('users-add', data),
  updateUser:     (id, data) => ipcRenderer.invoke('users-update', id, data),
  deleteUser:     (id) => ipcRenderer.invoke('users-delete', id),
  
  // Sponsors
  getSponsors: () => ipcRenderer.invoke('sponsors-get-all'),
  addSponsor: (data) => ipcRenderer.invoke('sponsors-add', data),
  deleteSponsor: (id) => ipcRenderer.invoke('sponsors-delete', id),

  // Authors
  getAuthors: () => ipcRenderer.invoke('authors-get-all'),
  addAuthor: (data) => ipcRenderer.invoke('authors-add', data),
  deleteAuthor: (id) => ipcRenderer.invoke('authors-delete', id),
  findSimilarAuthors: (name) => ipcRenderer.invoke('authors-find-similar', name),
  mergeAuthors: (data) => ipcRenderer.invoke('authors-merge', data),


  // Backup
  createBackup:  () => ipcRenderer.invoke('backup-create'),
  restoreBackup: () => ipcRenderer.invoke('backup-restore'),
  restoreLatestBackup: () => ipcRenderer.invoke('backup-restore-latest'),
  getBackupPath: () => ipcRenderer.invoke('backup-get-path'),

  // File / Media
  pickImage: () => ipcRenderer.invoke('pick-image'),

  // Notifications
  showNotification: (data) => ipcRenderer.send('show-notification', data),

  // WhatsApp Automation
  initWhatsApp:      () => ipcRenderer.send('whatsapp:init'),
  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:get-status'),
  sendWhatsApp:      (to, msg) => ipcRenderer.invoke('whatsapp:send', to, msg),
  onWhatsAppQR:      (cb) => ipcRenderer.on('whatsapp:qr', (e, qr) => cb(qr)),
  onWhatsAppStatus:  (cb) => ipcRenderer.on('whatsapp:status', (e, status) => cb(status)),

  // OCR Processing (Main Process worker bypass)
  processOCR:        (imageSrc) => ipcRenderer.invoke('ocr-process', imageSrc),
  onOcrProgress:     (cb) => ipcRenderer.on('ocr-progress', (e, progress) => cb(progress)),
  onOcrStatusUpdate: (cb) => ipcRenderer.on('ocr-status-update', (e, status) => cb(status)),
  removeOcrListeners: () => {
    ipcRenderer.removeAllListeners('ocr-progress');
    ipcRenderer.removeAllListeners('ocr-status-update');
  },
})
