import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, QrCode, X, Download, Heart, Building, User, Camera, Upload, Sparkles, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'
import { useSettings } from '../App.jsx'
import { useSearchParams } from 'react-router-dom'

const CATEGORIES = ['Fiction','Non-Fiction','Science','History','Biography', 'Story', 'Poem', 'Novel', 'Travelogue', 'Religion','Children','Malayalam Literature','English Literature','Reference','Periodicals','Open','Other']
const CONDITIONS  = ['Good','Fair','Poor','Lost']
const LANGUAGES   = ['Malayalam','English','Hindi','Tamil','Other']

/* ── Author helpers (mirror the rules in electron/db.js) ─────────────────── */
function normalizeName(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}
function nameKey(value) {
  return normalizeName(value).toLowerCase().replace(/[.,'’`"()[\]]/g, ' ').replace(/\s+/g, ' ').trim()
}
function splitAuthors(value) {
  return normalizeName(value).split(/\s*(?:,|;|&|\band\b)\s*/i).map(normalizeName).filter(Boolean)
}
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}
function authorSimilarity(a, b) {
  const x = nameKey(a), y = nameKey(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const xw = x.split(' '), yw = y.split(' ')
  const subset = xw.every(w => yw.includes(w)) || yw.every(w => xw.includes(w))
  const ratio = 1 - levenshtein(x, y) / Math.max(x.length, y.length)
  if (Math.min(x.length, y.length) < 4 && !subset) return ratio >= 0.9 ? ratio : 0
  return subset ? Math.max(ratio, 0.85) : ratio
}
/** Existing authors that look like `name`, best match first. */
function findSimilarAuthors(name, list) {
  const parts = splitAuthors(name)
  return (list || [])
    .map(row => {
      let score = authorSimilarity(name, row.name)
      for (const part of parts) score = Math.max(score, authorSimilarity(part, row.name))
      return { ...row, score }
    })
    .filter(row => row.score >= 0.72)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}
/** ₹ amount with Indian digit grouping; null when the value is not a usable number. */
function formatINR(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}
/** True when nothing has been recorded for this book's amount yet. */
function hasNoAmount(book) {
  return !book || book.price === '' || book.price == null
}

export default function Books() {
  const context = useSettings()
  const { language } = context || {}
  const t = context ? context.t : (key) => key
  const [books, setBooks]     = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [selected, setSel]    = useState(null)
  const [qrImg, setQrImg]     = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [toast, setToast]     = useState(null)
  const form0 = { title:'',title_ml:'',author:'',translator:'',category:'',publisher:'',isbn:'',edition:'',volume:'',year:'',language:'Malayalam',shelf_no:'',qr_code_no:'',total_copies:1,condition:'Good',description:'',price:'' }
  const [form, setForm] = useState(form0)
  const [publishers, setPublishers] = useState([])
  const [showAddPub, setShowAddPub] = useState(false)
  const [newPub, setNewPub] = useState({ name:'', place:'' })
  const [authors, setAuthors] = useState([])
  const [showAddAuthor, setShowAddAuthor] = useState(false)
  const [newAuthorName, setNewAuthorName] = useState('')
  const [mergePrompt, setMergePrompt] = useState(null)
  const [sponsors, setSponsors] = useState([])
  const [showAddSponsor, setShowAddSponsor] = useState(false)
  const [newSponsor, setNewSponsor] = useState({ name:'', type:'External', member_id:null })
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [amountTargets, setAmountTargets] = useState([])
  const [amountEdits, setAmountEdits] = useState({})
  const [amountSaved, setAmountSaved] = useState({})   // id -> amount that is on record
  const [amountFilter, setAmountFilter] = useState('')
  const [amountShown, setAmountShown] = useState(60)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => { 
    load() 
    loadPubs()
    loadAuthors()
    loadSponsors()
  }, [search, filterCat])

  async function loadSponsors() {
    const s = await window.api.getSponsors()
    const m = await window.api.getMembers({})
    setSponsors(s)
    setMembers(m)
  }

  async function loadPubs() {
    const p = await window.api.getPublishers()
    setPublishers(p)
  }

  async function loadAuthors() {
    const a = await window.api.getAuthors()
    setAuthors(a)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAdd()
      setSearchParams({})
    }
  }, [searchParams])

  async function load() {
    setLoading(true)
    try {
      const rows = search ? await window.api.searchBooks(search) : await window.api.getBooks({ category: filterCat||undefined })
      setBooks(rows || [])
    } catch (err) {
      console.error(err)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  function toast2(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }
  function openAdd() { setForm(form0); setModal('add') }
  function openEdit(b) { setForm({...b, price: hasNoAmount(b) ? '' : b.price}); setSel(b); setModal('edit') }
  const missingAmountBooks = books.filter(hasNoAmount)

  // Quick amount editor: one book (from the Amount cell) or every book still missing one.
  function openAmountEditor(list) {
    const targets = list || missingAmountBooks
    const edits = {}
    const saved = {}
    for (const b of targets) {
      edits[b.id] = ''
      saved[b.id] = hasNoAmount(b) ? null : b.price
    }
    setAmountTargets(targets)
    setAmountEdits(edits)
    setAmountSaved(saved)
    setAmountFilter('')
    setAmountShown(60)
    setModal('amount')
  }

  // The books of the editor that match the search, and how many of them
  // already have an amount.
  const amountFiltered = useMemo(() => {
    const q = amountFilter.trim().toLowerCase()
    if (!q) return amountTargets
    return amountTargets.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.title_ml || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q))
  }, [amountTargets, amountFilter])

  const amountRecorded = amountTargets.filter(b => amountSaved[b.id] !== null && amountSaved[b.id] !== undefined).length

  // Save one amount right away, so a long session cannot lose the work.
  async function saveOneAmount(book, value) {
    const res = await window.api.setBookAmounts([{ id: book.id, price: value }])
    if (res && res.success) {
      setAmountSaved(p => ({ ...p, [book.id]: Number(value) }))
      return true
    }
    toast2((res && res.message) || 'Could not save the amount', 'error')
    return false
  }

  async function saveAmounts() {
    const updates = amountTargets
      .filter(b => amountEdits[b.id] !== '' && amountEdits[b.id] != null)
      .map(b => ({ id: b.id, price: Number(amountEdits[b.id]) }))
    if (updates.length === 0) { setModal(null); return }
    if (updates.some(u => !Number.isFinite(u.price) || u.price < 0)) {
      toast2('Enter a valid amount for every filled row', 'error')
      return
    }
    const res = await window.api.setBookAmounts(updates)
    if (res && res.success) {
      toast2(`Amount saved for ${res.updated} book${res.updated === 1 ? '' : 's'}`)
      setModal(null)
      load()
    } else toast2((res && res.message) || 'Could not save amounts', 'error')
  }

  async function openQr(b) {
    setSel(b)
    const img = await QRCode.toDataURL(b.qr_code_no || `BOOK-${b.id}`, { width:260, margin:2, color:{dark:'#000',light:'#fff'} })
    setQrImg(img); setModal('qr')
  }

  function hc(e) { const {name,value}=e.target; setForm(p=>({...p,[name]:value})) }

  // Scanner state variables
  const [cameraStream, setCameraStream] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [scanMode, setScanMode] = useState('camera') // 'camera' or 'file'
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrLines, setOcrLines] = useState([])
  const [ocrResultLines, setOcrResultLines] = useState([])
  const [imgDims, setImgDims] = useState({ width: 1, height: 1 })
  const [selectedOcrBox, setSelectedOcrBox] = useState(null)
  const [bookMatches, setBookMatches] = useState([])
  const [previewImg, setPreviewImg] = useState('')
  const [scanTargetModal, setScanTargetModal] = useState('add')

  // Cleanup camera stream when modal changes
  useEffect(() => {
    if (modal !== 'scan') {
      stopCamera()
    }
  }, [modal])

  async function getCameraDevices() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices()
      const videoDevs = devs.filter(d => d.kind === 'videoinput')
      setDevices(videoDevs)
      if (videoDevs.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevs[0].deviceId)
      }
    } catch (err) {
      console.error('Error listing cameras:', err)
    }
  }

  async function startCamera(deviceId) {
    stopCamera()
    try {
      const constraints = deviceId 
        ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setCameraStream(stream)
      setTimeout(() => {
        const video = document.getElementById('scanner-video')
        if (video) video.srcObject = stream
      }, 100)
    } catch (err) {
      console.error('Camera start error:', err)
      setOcrStatus('Camera access denied or device busy. Try uploading a file.')
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
  }

  async function openScan() {
    setScanTargetModal(modal)
    setModal('scan')
    setScanMode('camera')
    setOcrLines([])
    setBookMatches([])
    setPreviewImg('')
    setOcrStatus('Align the book cover in camera view and take a snap.')
    
    // Request permission and enumerate devices
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      await getCameraDevices()
      setTimeout(async () => {
        const devs = await navigator.mediaDevices.enumerateDevices()
        const videoDevs = devs.filter(d => d.kind === 'videoinput')
        if (videoDevs.length > 0) {
          const devId = selectedDevice || videoDevs[0].deviceId
          setSelectedDevice(devId)
          await startCamera(devId)
        } else {
          setOcrStatus('No cameras found. Please upload a file instead.')
          setScanMode('file')
        }
      }, 150)
    } catch (err) {
      console.error('Camera permission denied:', err)
      setOcrStatus('Camera permission denied. Please upload a file.')
      setScanMode('file')
      await getCameraDevices()
    }
  }

  async function handleScanFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const imgData = event.target.result
      setPreviewImg(imgData)
      await processImageForOCR(imgData)
    }
    reader.readAsDataURL(file)
  }

  async function handleCapture() {
    const video = document.getElementById('scanner-video')
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imgData = canvas.toDataURL('image/jpeg')
    setPreviewImg(imgData)
    stopCamera()
    await processImageForOCR(imgData)
  }

  function preprocessImage(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let scale = 1.2
        if (img.width < 1000) {
          scale = 1000 / img.width
        }
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        
        const ctx = canvas.getContext('2d')
        // Boost contrast and convert to grayscale to make typography stand out
        ctx.filter = 'grayscale(100%) contrast(160%)'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.onerror = () => {
        resolve(imageSrc) // Fallback to raw if load fails
      }
      img.src = imageSrc
    })
  }

  function cleanOcrTextLine(line) {
    if (!line) return '';
    // Strip common scanner artifact symbols
    let cleaned = line.replace(/[|\[\]\(\)\{\}©®™^~_*•#§%&+=<>\\/]/g, '')
    // Normalize spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    return cleaned
  }

  async function processImageForOCR(imageSrc) {
    setOcrLoading(true)
    setOcrStatus('Preprocessing image for scanning...')
    setOcrLines([])
    setOcrResultLines([])
    setSelectedOcrBox(null)
    setBookMatches([])
    
    try {
      const processedSrc = await preprocessImage(imageSrc)

      if (window.api) {
        if (window.api.onOcrProgress) {
          window.api.onOcrProgress((progress) => {
            setOcrStatus(`Extracting text: ${Math.round(progress * 100)}%`)
          })
        }
        if (window.api.onOcrStatusUpdate) {
          window.api.onOcrStatusUpdate((status) => {
            setOcrStatus(status)
          })
        }
      }

      const res = await window.api.processOCR(processedSrc)
      
      if (window.api && window.api.removeOcrListeners) {
        window.api.removeOcrListeners()
      }

      if (!res.success) {
        throw new Error(res.error || 'Main process OCR failed')
      }

      const rawLines = res.lines || []
      const cleanedResultLines = rawLines
        .map(l => ({
          ...l,
          text: cleanOcrTextLine(l.text)
        }))
        .filter(l => {
          const alphanumericLength = l.text.replace(/[^a-zA-Z0-9\u0D00-\u0D7F]/g, '').length
          return alphanumericLength > 1
        })

      setOcrResultLines(cleanedResultLines)
      const cleanLines = cleanedResultLines.map(l => l.text)
      setOcrLines(cleanLines)
      
      if (cleanLines.length > 0) {
        // Pre-fill fields directly with a smart OCR guess
        const malRegex = /[\u0D00-\u0D7F]/
        let titleGuess = ''
        let titleMlGuess = ''
        let authorGuess = ''

        const cleanLinesForGuess = cleanLines.filter(l => !l.match(/^[0-9\-–\s]+$/) && l.length > 1)
        if (cleanLinesForGuess.length > 0) {
          const firstLine = cleanLinesForGuess[0]
          if (malRegex.test(firstLine)) {
            titleMlGuess = firstLine
          } else {
            titleGuess = firstLine
          }
        }
        if (cleanLinesForGuess.length > 1) {
          authorGuess = cleanLinesForGuess[1]
        }

        setForm(p => ({
          ...p,
          title: titleGuess || p.title,
          title_ml: titleMlGuess || p.title_ml,
          author: authorGuess || p.author
        }))

        setOcrStatus('Searching online book databases...')
        await searchBookOnline(cleanLines.join('\n'))
      } else {
        setOcrStatus('No clear text detected. Please try uploading another photo or adjust lighting.')
      }
    } catch (err) {
      console.error('OCR error:', err)
      setOcrStatus('OCR failed. Check network or connection.')
    } finally {
      setOcrLoading(false)
      if (window.api && window.api.removeOcrListeners) {
        window.api.removeOcrListeners()
      }
    }
  }

  async function searchBookOnline(ocrText) {
    const matches = []
    
    // Check if OCR text contains an ISBN-13 or ISBN-10 pattern
    // e.g. 978-x-xx-xxxx-x or 9781234567890
    const isbnClean = ocrText.replace(/[-\s]/g, '')
    const isbnRegex = /\b(?:97[89])?\d{9}[\dX]\b/g
    const isbnFound = isbnClean.match(isbnRegex)
    
    let queryParam = ''
    if (isbnFound && isbnFound.length > 0) {
      queryParam = `isbn:${isbnFound[0]}`
      setOcrStatus(`ISBN detected: ${isbnFound[0]}. Fetching exact details...`)
    } else {
      // Otherwise, clean up the top lines of text for title/author search
      const cleanLines = ocrText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2 && !line.match(/^[0-9\-–]+$/)) // Skip pure numbers (barcodes)
      
      queryParam = cleanLines.slice(0, 3).join(' ')
      if (!queryParam) return
    }

    try {
      // 1. Fetch from Google Books API
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParam)}&maxResults=4`)
      const data = await res.json()
      if (data.items) {
        data.items.forEach(item => {
          const info = item.volumeInfo
          matches.push({
            source: 'Google Books',
            title: info.title || '',
            title_ml: info.language === 'ml' ? info.title : '',
            author: info.authors ? info.authors.join(', ') : '',
            publisher: info.publisher || '',
            year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
            language: info.language === 'ml' ? 'Malayalam' : info.language === 'en' ? 'English' : 'English',
            isbn: info.industryIdentifiers ? info.industryIdentifiers.find(id => id.type.includes('ISBN'))?.identifier || '' : '',
            description: info.description || '',
            cover: info.imageLinks ? info.imageLinks.thumbnail : null
          })
        })
      }
      
      // 2. Fetch from Open Library API
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(queryParam)}&limit=3`)
      const olData = await olRes.json()
      if (olData.docs) {
        olData.docs.forEach(doc => {
          matches.push({
            source: 'Open Library',
            title: doc.title || '',
            title_ml: '',
            author: doc.author_name ? doc.author_name.join(', ') : '',
            publisher: doc.publisher ? doc.publisher[0] : '',
            year: doc.first_publish_year ? String(doc.first_publish_year) : '',
            language: doc.language ? (doc.language.includes('mal') ? 'Malayalam' : 'English') : 'English',
            isbn: doc.isbn ? doc.isbn[0] : '',
            description: '',
            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
          })
        })
      }

      // Deduplicate
      const unique = []
      const seen = new Set()
      matches.forEach(m => {
        const key = `${m.title.toLowerCase()}|${m.author.toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(m)
        }
      })
      
      setBookMatches(unique)
      if (unique.length > 0) {
        setOcrStatus(`Found ${unique.length} online book matches!`)
      } else {
        setOcrStatus('No matches found in Google Books/Open Library. Use the Manual OCR Mapper below.')
      }
    } catch (err) {
      console.error('Online search API error:', err)
      setOcrStatus('Online search failed. Use the Manual OCR Mapper below.')
    }
  }

  function selectBookMatch(match) {
    setForm(p => ({
      ...p,
      title: match.title || p.title,
      title_ml: match.title_ml || p.title_ml,
      author: match.author || p.author,
      publisher: match.publisher || p.publisher,
      year: match.year || p.year,
      language: match.language || p.language,
      isbn: match.isbn || p.isbn,
      description: match.description || p.description
    }))
    toast2('Populated matching book details!')
    setModal(scanTargetModal)
  }

  function assignOcrField(fieldName, val) {
    // Strip trailing/leading punctuation
    const cleaned = val.replace(/^[:.,\-\s]+|[:.,\-\s]+$/g, '').trim()
    setForm(p => ({ ...p, [fieldName]: cleaned }))
    toast2(`Assigned text to ${fieldName}!`)
  }


  /* ── Author add / duplicate merge ─────────────────────────────────────── */
  function closeAuthorModal() {
    setShowAddAuthor(false)
    setNewAuthorName('')
    setMergePrompt(null)
  }

  function selectAuthor(name) {
    setForm(p => ({ ...p, author: name }))
  }

  async function insertNewAuthor(name) {
    const res = await window.api.addAuthor({ name })
    if (!res.success) { toast2(res.message || 'Could not add author', 'error'); return }
    // "A, B & C" is stored as one book author but each name is registered for reuse.
    const extra = splitAuthors(name).filter(n => nameKey(n) !== nameKey(res.name))
    for (const part of extra) await window.api.addAuthor({ name: part })
    selectAuthor(res.name || name)
    toast2(`Author "${res.name || name}" added`)
    closeAuthorModal()
    loadAuthors()
  }

  async function saveNewAuthor() {
    const name = normalizeName(newAuthorName)
    if (!name) { toast2('Enter an author name', 'error'); return }
    const exact = authors.find(a => nameKey(a.name) === nameKey(name))
    if (exact) {
      selectAuthor(exact.name)
      toast2(`"${exact.name}" is already in the list — selected it`)
      closeAuthorModal()
      return
    }
    const similar = findSimilarAuthors(name, authors)
    if (similar.length > 0) {
      setMergePrompt({ name, candidates: similar })
      return
    }
    await insertNewAuthor(name)
  }

  async function mergeIntoExisting(candidate) {
    const name = mergePrompt ? mergePrompt.name : ''
    const res = await window.api.mergeAuthors({ targetName: candidate.name, sourceNames: [name] })
    if (!res.success) { toast2(res.message || 'Merge failed', 'error'); return }
    selectAuthor(res.target || candidate.name)
    const extra = res.updatedBooks ? ` (${res.updatedBooks} book${res.updatedBooks === 1 ? '' : 's'} updated)` : ''
    toast2(`Merged into "${res.target || candidate.name}"${extra}`)
    closeAuthorModal()
    loadAuthors()
    load()
  }

  async function handleSave() {
    if (!form.title) { toast2('Book title is required','error'); return }
    
    if (modal === 'add') {
      const existing = await window.api.searchBooks(form.title)
      const exactMatch = existing.find(b => b.title.toLowerCase().trim() === form.title.toLowerCase().trim())
      if (exactMatch) {
        if (!confirm(`⚠️ A book named "${exactMatch.title}" is already in the library.\n\nAre you adding a different volume/edition? Click OK to proceed, or Cancel to stop.`)) return
      }
    }

    const price = form.price === '' || form.price == null ? null : Math.max(0, Number(form.price) || 0)
    const payload = { ...form, price }
    const res = modal==='add' ? await window.api.addBook(payload) : await window.api.updateBook(selected.id,payload)
    if (res.success) { 
      toast2(modal==='add'?'Book added!':'Book updated!')
      setModal(null)
      load()
      loadAuthors()
      loadPubs()
    }
    else toast2(res.message||'Error','error')
  }

  async function handleDelete(b) {
    if (!confirm(`Delete "${b.title}"?`)) return
    const res = await window.api.deleteBook(b.id)
    if (res.success) { toast2('Book deleted'); load() }
    else toast2(res.message||'Error','error')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">
          <span className="lang-en">Books</span>
          <span className="lang-ml">പുസ്തകങ്ങൾ</span>
        </h1>
        <p className="page-header__sub lang-en">Manage library book collection</p>
        <p className="page-header__sub lang-ml">ഗ്രന്ഥശാലയിലെ പുസ്തകങ്ങളുടെ വിവരങ്ങൾ</p>
        <div className="page-header__actions">
          <div className="search-bar" style={{flex:1,maxWidth:360}}>
            <Search size={15} className="search-icon"/>
            <input placeholder="Search title, author, ISBN, QR…" value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}><X size={14}/></button>}
          </div>
          <select className="form-select" style={{width:160}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">{t('all_categories') || 'All Categories'}</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{t('cat_'+c.toLowerCase().replace(/ /g,'_').replace(/-/g,'_'))}</option>)}
          </select>
          <button className="btn btn--primary" onClick={openAdd}>
            <Plus size={15}/>
            <span className="lang-en">Add Book</span>
            <span className="lang-ml">പുസ്തകം ചേർക്കുക</span>
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:16,marginBottom:20}}>
        {[{l:'Total',v:books.length,c:'var(--accent)'},{l:'Available',v:books.filter(b=>b.available_copies>0).length,c:'var(--green)'},{l:'All Issued',v:books.filter(b=>b.available_copies===0&&b.total_copies>0).length,c:'var(--red)'}].map(s=>(
          <div key={s.l} className="card" style={{flex:1,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'var(--text-muted)'}}>{s.l}</span>
            <span style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</span>
          </div>
        ))}
      </div>

      {missingAmountBooks.length > 0 && (
        <div className="card" style={{marginBottom:16, padding:'12px 16px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', borderLeft:'4px solid var(--amber)'}}>
          <span style={{fontSize:20}}>💰</span>
          <div style={{flex:1, minWidth:220}}>
            <div style={{fontWeight:700}}>
              <span className="lang-en">{missingAmountBooks.length} of {books.length} books have no amount recorded</span>
              <span className="lang-ml">{books.length} പുസ്തകങ്ങളിൽ {missingAmountBooks.length} പുസ്തകങ്ങളുടെ വില രേഖപ്പെടുത്തിയിട്ടില്ല</span>
            </div>
            <div className="td-muted" style={{fontSize:12}}>
              <span className="lang-en">The amount of these books was never stored, so it is not in the database and not in the old backups either - a restore cannot bring it back. Type each amount once here; it is saved right away and every backup from now on holds it.</span>
              <span className="lang-ml">ഈ പുസ്തകങ്ങളുടെ വില ഒരിക്കലും സൂക്ഷിച്ചിട്ടില്ല, അതിനാൽ അത് ഡാറ്റാബേസിലും പഴയ ബാക്കപ്പുകളിലും ഇല്ല - തിരിക്കിയാലും ലഭിക്കില്ല. ഓരോ വിലയും ഒരിക്കൽ ഇവിടെ നൽകുക; അത് ഉടൻ സേവ് ആകും, അതിനു ശേഷമുള്ള എല്ലാ ബാക്കപ്പുകളിലും ഉണ്ടാകും.</span>
            </div>
          </div>
          <button className="btn btn--primary" onClick={()=>openAmountEditor(missingAmountBooks)}>
            <span className="lang-en">Set amounts</span>
            <span className="lang-ml">വില നൽകുക</span>
          </button>
        </div>
      )}

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="table-wrap">
          {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Loading…</div>
          : books.length===0 ? (
            <div className="empty-state"><div className="empty-state__icon">📚</div><div className="empty-state__title">No books found</div><div className="empty-state__sub">Add your first book</div></div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Title</th><th>Author</th><th>Category</th><th>QR</th><th>Copies</th><th>Avail</th><th>Cond.</th><th>Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {books.map((b,i)=>(
                  <tr key={b.id}>
                    <td className="td-muted">{i+1}</td>
                    <td>
                      <div style={{fontWeight:600}}>
                        {language === 'ml' && b.title_ml ? b.title_ml : b.title} 
                        {b.volume && <span className="badge badge--gray" style={{marginLeft:8,fontSize:10}}>{b.volume}</span>}
                      </div>
                      {language === 'en' && b.title_ml && <div className="td-muted lang-ml" style={{fontSize:12}}>{b.title_ml}</div>}
                      {b.isbn && <div className="td-muted" style={{fontSize:11}}>No: {b.isbn}</div>}
                    </td>
                    <td>
                      <div>{b.author||'—'}</div>
                      {b.translator && <div className="td-muted" style={{fontSize:11}}><span className="lang-en">Tr: {b.translator}</span><span className="lang-ml">വിവ: {b.translator}</span></div>}
                    </td>
                    <td>{b.category?<span className="badge badge--accent">{t('cat_'+b.category.toLowerCase().replace(/ /g,'_').replace(/-/g,'_'))}</span>:'—'}</td>
                    <td className="td-muted" style={{fontSize:11}}>{b.qr_code_no||'—'}</td>
                    <td style={{textAlign:'center'}}>{b.total_copies}</td>
                    <td style={{textAlign:'center'}}><span className={`badge ${b.available_copies>0?'badge--green':'badge--red'}`}>{b.available_copies}</span></td>
                    <td><span className={`badge ${b.condition==='Good'?'badge--green':b.condition==='Fair'?'badge--amber':'badge--red'}`}>{b.condition}</span></td>
                    <td style={{fontWeight:600, whiteSpace:'nowrap'}}>
                      {hasNoAmount(b) ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={()=>openAmountEditor([b])}
                          title="Amount not recorded — click to set it"
                          style={{padding:'2px 8px', fontSize:11, cursor:'pointer', color:'var(--text-muted)'}}
                        >Set amount</button>
                      ) : Number(b.price) === 0 ? (
                        <span className="td-muted">Free</span>
                      ) : formatINR(b.price)}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>openQr(b)} title="QR Code"><QrCode size={14}/></button>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>openEdit(b)} title="Edit"><Edit2 size={14}/></button>
                        <button className="btn btn--ghost btn--icon btn--sm" onClick={()=>handleDelete(b)} title="Delete" style={{color:'var(--red)'}}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal modal--wide">
            <div className="modal__header">
              <div className="modal__title">{modal==='add'?'➕ Add New Book':'✏️ Edit Book'}</div>
              <button className="modal__close" onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal__body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>
                      <span className="lang-en">Title *</span>
                      <span className="lang-ml">പേര് *</span>
                    </span>
                    <button type="button" className="btn btn--accent" onClick={openScan} style={{padding:'2px 8px', fontSize:11, display:'flex', alignItems:'center', gap:4, height:22, cursor:'pointer'}}>
                      <Camera size={12}/>
                      <span className="lang-en">Scan / Autofill</span>
                      <span className="lang-ml">സ്കാൻ ചെയ്യുക</span>
                    </button>
                  </label>
                  <input className="form-input" name="title" value={form.title} onChange={hc} placeholder="Book title"/>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="lang-en">Malayalam Title</span>
                    <span className="lang-ml">മലയാളം പേര്</span>
                  </label>
                  <input className="form-input" name="title_ml" value={form.title_ml||''} onChange={hc} placeholder="മലയാളം പേര്"/>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="lang-en">Author</span>
                    <span className="lang-ml">ഗ്രന്ഥകർത്താവ്</span>
                  </label>
                  <div style={{display:'flex', gap:6}}>
                    <select className="form-select" name="author" value={form.author||''} onChange={hc} style={{flex:1}}>
                      <option value="">Select Author</option>
                      {authors.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                      {form.author && !authors.some(a => nameKey(a.name) === nameKey(form.author)) && (
                        <option value={form.author}>{form.author}</option>
                      )}
                    </select>
                    <button className="btn btn--secondary btn--icon" type="button" onClick={()=>setShowAddAuthor(true)} title="Add New Author"><Plus size={14}/></button>
                  </div>
                  <div className="td-muted" style={{fontSize:11, marginTop:4}}>Pick an existing author, or use + to add a new one.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="lang-en">Translator</span>
                    <span className="lang-ml">വിവർത്തകൻ</span>
                  </label>
                  <input className="form-input" name="translator" value={form.translator||''} onChange={hc} placeholder="Translated by..."/>
                </div>

                <div className="form-group">
                  <label className="form-label">Book Number / ISBN</label>
                  <input className="form-input" name="isbn" value={form.isbn||''} onChange={hc} placeholder="ISBN / Accession ID..."/>
                </div>
                
                <div className="form-group"><label className="form-label">{t('category')}</label><select className="form-select" name="category" value={form.category||''} onChange={hc}><option value="">Select</option>{CATEGORIES.map(c=><option key={c} value={c}>{t('cat_'+c.toLowerCase().replace(/ /g,'_').replace(/-/g,'_'))}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Language</label><select className="form-select" name="language" value={form.language||'Malayalam'} onChange={hc}>{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select></div>

                <div className="form-group form-full">
                  <label className="form-label">Publisher</label>
                  <div style={{display:'flex', gap:6}}>
                    <select className="form-select" name="publisher" value={form.publisher||''} onChange={hc} style={{flex:1}}>
                      <option value="">Select Publisher</option>
                      {publishers.map(p=><option key={p.id} value={p.name}>{p.name} {p.place?`(${p.place})`:''}</option>)}
                      {form.publisher && !publishers.some(p => p.name === form.publisher) && (
                        <option value={form.publisher}>{form.publisher}</option>
                      )}
                    </select>
                    <button className="btn btn--secondary btn--icon" onClick={()=>setShowAddPub(true)} title="Add New Publisher"><Plus size={14}/></button>
                  </div>
                </div>

                <div className="form-group form-full">
                  <label className="form-label">Sponsor (Optional)</label>
                  <div style={{display:'flex', gap:6}}>
                    <select className="form-select" name="sponsor_id" value={form.sponsor_id||''} onChange={hc} style={{flex:1}}>
                      <option value="">No Sponsor</option>
                      {sponsors.map(s=><option key={s.id} value={s.id}>{s.name} {s.type==='Member'?`(${s.member_reg})`:''}</option>)}
                    </select>
                    <button className="btn btn--secondary btn--icon" onClick={()=>setShowAddSponsor(true)} title="Add New Sponsor"><Plus size={14}/></button>
                  </div>
                </div>

                <div className="form-group"><label className="form-label">Edition</label><input className="form-input" name="edition" value={form.edition||''} onChange={hc} placeholder="1st"/></div>
                <div className="form-group"><label className="form-label">Volume</label><input className="form-input" name="volume" value={form.volume||''} onChange={hc} placeholder="Vol 1"/></div>
                
                <div className="form-group"><label className="form-label">Year</label><input className="form-input" type="number" name="year" value={form.year||''} onChange={hc} placeholder="2024"/></div>
                <div className="form-group"><label className="form-label">Shelf No.</label><input className="form-input" name="shelf_no" value={form.shelf_no||''} onChange={hc} placeholder="A-01"/></div>
                
                <div className="form-group"><label className="form-label">QR Code</label><input className="form-input" name="qr_code_no" value={form.qr_code_no||''} onChange={hc} placeholder="Auto"/></div>
                <div className="form-group"><label className="form-label">{t('stock')}</label><input className="form-input" type="number" min="1" name="total_copies" value={form.total_copies||1} onChange={hc}/></div>
                
                <div className="form-group"><label className="form-label">Condition</label><select className="form-select" name="condition" value={form.condition||'Good'} onChange={hc}>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input className="form-input" type="number" inputMode="decimal" min="0" step="0.01" name="price" value={form.price??''} onChange={hc} placeholder="Enter amount"/>
                  <div className="td-muted" style={{fontSize:11, marginTop:4}}>Optional. Leave blank when the amount is not known; type 0 for a free copy.</div>
                </div>

                <div className="form-group form-full"><label className="form-label">Description</label><textarea className="form-textarea" name="description" value={form.description||''} onChange={hc} placeholder="Notes…"/></div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}>{modal==='add'?'Add Book':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {modal==='qr' && selected && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:'center'}}>
            <div className="modal__header"><div className="modal__title">📷 QR Code</div><button className="modal__close" onClick={()=>setModal(null)}><X size={16}/></button></div>
            <div className="modal__body" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
              {qrImg && <img src={qrImg} alt="QR" style={{width:220,height:220,borderRadius:12,border:'4px solid var(--accent)'}}/>}
              <div style={{fontWeight:700}}>{selected.title}</div>
              <div className="td-muted">{selected.qr_code_no||`BOOK-${selected.id}`}</div>
              {selected.shelf_no && <span className="badge badge--accent">Shelf: {selected.shelf_no}</span>}
              <button className="btn btn--primary" onClick={()=>{const a=document.createElement('a');a.download=`qr-${selected.id}.png`;a.href=qrImg;a.click()}}><Download size={14}/> Download</button>
            </div>
          </div>
        </div>
      )}

      {modal==='amount' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal__header">
              <div className="modal__title">💰 <span className="lang-en">Set Book Amounts</span><span className="lang-ml">പുസ്തകങ്ങളുടെ വില</span></div>
              <button className="modal__close" onClick={()=>setModal(null)}><X size={16}/></button>
            </div>
            <div className="modal__body">
              <div className="td-muted" style={{fontSize:12, marginBottom:12, lineHeight:1.5}}>
                <span className="lang-en">
                  The amount of these books was never stored, so it cannot be read back from a backup.
                  Type each amount and press Enter - it is saved right away and the next book is selected.
                  Type 0 for a free copy; leave a field blank to keep it as “not recorded”.
                </span>
                <span className="lang-ml">
                  ഈ പുസ്തകങ്ങളുടെ വില ഒരിക്കലും സൂക്ഷിച്ചിട്ടില്ല, അതിനാൽ ബാക്കപ്പിൽ നിന്നും തിരിക്കിയാല് ലഭിക്കില്ല.
                  ഓരോ വിലയും നൽകി Enter അമർത്തുക - അത് ഉടൻ സേവ് ആകും, അടുത്ത പുസ്തകം തിരഞ്ഞെടുക്കും.
                  സൗജന്യ പുസ്തകത്തിന് 0 നൽകുക.
                </span>
              </div>

              {/* Progress and a search, so a library with thousands of books
                  can be worked through without losing the place. */}
              <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap'}}>
                <div style={{
                  flex:1, minWidth:180, fontSize:12, fontWeight:700, padding:'6px 10px', borderRadius:8,
                  background:'var(--bg-primary)', border:'1px solid var(--glass-border)'
                }}>
                  <span className="lang-en">{amountRecorded} of {amountTargets.length} books have an amount</span>
                  <span className="lang-ml">{amountTargets.length} പുസ്തകങ്ങളിൽ {amountRecorded} പുസ്തകങ്ങളുടെ വില രേഖപ്പെടുത്തിയിട്ടു്</span>
                </div>
                <input
                  className="form-input"
                  style={{flex:2, minWidth:160}}
                  placeholder="Search title or author"
                  value={amountFilter}
                  onChange={e => { setAmountFilter(e.target.value); setAmountShown(60) }}
                />
              </div>

              {amountTargets.length === 0 ? (
                <div className="td-muted">No books need an amount.</div>
              ) : amountFiltered.length === 0 ? (
                <div className="td-muted">No book matches “{amountFilter}”.</div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:'46vh', overflowY:'auto'}}>
                  {amountFiltered.slice(0, amountShown).map((b, i) => {
                    const onRecord = amountSaved[b.id] !== null && amountSaved[b.id] !== undefined
                    return (
                    <div key={b.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8,
                      background:'var(--bg-primary)', border:'1px solid var(--glass-border)'
                    }}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                          {b.title}{b.volume ? ` (${b.volume})` : ''}
                        </div>
                        <div className="td-muted" style={{fontSize:11, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                          {b.author || '—'}
                          {onRecord ? ` · ${Number(amountSaved[b.id]) === 0 ? 'Free' : formatINR(amountSaved[b.id])}` : ''}
                        </div>
                      </div>
                      <input
                        id={`amt-${b.id}`}
                        className="form-input"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        autoFocus={i === 0 && !amountFilter}
                        placeholder={onRecord ? (Number(amountSaved[b.id]) === 0 ? 'Free' : String(amountSaved[b.id])) : 'Amount'}
                        value={amountEdits[b.id] ?? ''}
                        onChange={e=>setAmountEdits(p=>({...p,[b.id]:e.target.value}))}
                        onBlur={async e=>{
                          // A finished field is saved right away, so a long
                          // session cannot lose the work.
                          const raw = e.target.value
                          if (raw === '' || raw == null) return
                          const value = Number(raw)
                          if (!Number.isFinite(value) || value < 0) return
                          await saveOneAmount(b, value)
                        }}
                        onKeyDown={async e=>{
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          const raw = amountEdits[b.id]
                          if (raw !== '' && raw != null) {
                            const value = Number(raw)
                            if (!Number.isFinite(value) || value < 0) {
                              toast2('Enter a valid amount', 'error')
                              return
                            }
                            await saveOneAmount(b, value)
                          }
                          const next = amountFiltered.slice(0, amountShown)[i+1]
                          const el = next ? document.getElementById(`amt-${next.id}`) : null
                          if (el) el.focus()
                          else toast2('All shown books are done')
                        }}
                        style={{width:130, textAlign:'right'}}
                      />
                    </div>
                    )
                  })}
                  {amountFiltered.length > amountShown && (
                    <button
                      className="btn btn--ghost"
                      style={{marginTop:4}}
                      onClick={()=>setAmountShown(n=>n+60)}
                    >
                      Show more ({amountFiltered.length - amountShown} left)
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveAmounts}>Save Amounts</button>
            </div>
          </div>
        </div>
      )}

      {showAddPub && (
        <div className="modal-overlay" style={{zIndex:1100}}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal__header"><div className="modal__title">🏢 Add Publisher</div><button className="modal__close" onClick={()=>setShowAddPub(false)}><X size={16}/></button></div>
            <div className="modal__body" style={{display:'flex', flexDirection:'column', gap:12}}>
              <input className="form-input" placeholder="Publisher Name" value={newPub.name} onChange={e=>setNewPub({...newPub, name:e.target.value})}/>
              <input className="form-input" placeholder="Place" value={newPub.place} onChange={e=>setNewPub({...newPub, place:e.target.value})}/>
              <button className="btn btn--primary" onClick={async()=>{
                if(!newPub.name.trim()) return
                const addedName = newPub.name.trim()
                const res = await window.api.addPublisher({ name: addedName, place: newPub.place ? newPub.place.trim() : null })
                if(res.success){
                  toast2('Publisher added!')
                  setForm(p => ({ ...p, publisher: addedName }))
                  setShowAddPub(false); setNewPub({name:'',place:''})
                  loadPubs()
                } else toast2(res.message,'error')
              }}><Plus size={14}/> Save Publisher</button>
            </div>
          </div>
        </div>
      )}

      {showAddAuthor && (
        <div className="modal-overlay" style={{zIndex:1100}}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal__header"><div className="modal__title">✍️ Add Author</div><button className="modal__close" onClick={closeAuthorModal}><X size={16}/></button></div>
            <div className="modal__body" style={{display:'flex', flexDirection:'column', gap:12}}>
              {!mergePrompt && (
                <>
                  <input
                    className="form-input"
                    placeholder="Author Name"
                    value={newAuthorName}
                    onChange={e=>setNewAuthorName(e.target.value)}
                    onKeyDown={e=>{ if (e.key === 'Enter') saveNewAuthor() }}
                    autoFocus
                  />
                  <div className="td-muted" style={{fontSize:11}}>
                    Type a name and press Enter. If a similar author already exists you can merge or keep both.
                  </div>
                  <button className="btn btn--primary" onClick={saveNewAuthor}><Plus size={14}/> Save Author</button>
                </>
              )}

              {mergePrompt && (
                <>
                  <div style={{fontSize:13, lineHeight:1.5}}>
                    An author similar to <strong style={{color:'var(--accent-light)'}}>“{mergePrompt.name}”</strong> already exists.
                    Merge it into one of these, or keep both names separate.
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:220, overflowY:'auto'}}>
                    {mergePrompt.candidates.map(c=>(
                      <button
                        key={c.id}
                        type="button"
                        className="btn btn--ghost"
                        style={{justifyContent:'space-between', textAlign:'left'}}
                        onClick={()=>mergeIntoExisting(c)}
                        title={`Merge “${mergePrompt.name}” into “${c.name}”`}
                      >
                        <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>Merge into “{c.name}”</span>
                        <span className="td-muted" style={{fontSize:11, flexShrink:0, marginLeft:8}}>
                          {Math.round(c.score*100)}%{typeof c.book_count === 'number' ? ` · ${c.book_count} book${c.book_count===1?'':'s'}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn btn--primary" style={{flex:1}} onClick={()=>insertNewAuthor(mergePrompt.name)}><Plus size={14}/> Keep both</button>
                    <button className="btn btn--ghost" style={{flex:1}} onClick={()=>setMergePrompt(null)}>Back</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showAddSponsor && (
        <div className="modal-overlay" style={{zIndex:1100}}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal__header"><div className="modal__title">💝 Add Sponsor</div><button className="modal__close" onClick={()=>setShowAddSponsor(false)}><X size={16}/></button></div>
            <div className="modal__body" style={{display:'flex', flexDirection:'column', gap:12}}>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <button type="button" className={`btn btn--sm ${newSponsor.type==='Member'?'btn--primary':'btn--ghost'}`} onClick={()=>setNewSponsor({...newSponsor, type:'Member'})} style={{flex:1}}>Member</button>
                <button type="button" className={`btn btn--sm ${newSponsor.type==='External'?'btn--primary':'btn--ghost'}`} onClick={()=>setNewSponsor({...newSponsor, type:'External'})} style={{flex:1}}>External</button>
              </div>

              {newSponsor.type === 'Member' ? (
                <div style={{position:'relative'}}>
                  <input className="form-input" placeholder="Search Member..." value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/>
                  <Search size={14} style={{position:'absolute', right:10, top:12, color:'var(--text-muted)'}}/>
                  {memberSearch && members.filter(m=>m.full_name.toLowerCase().includes(memberSearch.toLowerCase())||m.reg_no.includes(memberSearch)).length > 0 && (
                    <div style={{position:'absolute', top:'100%', left:0, right:0, zIndex:10, background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:8, marginTop:4, maxHeight:150, overflowY:'auto', boxShadow:'var(--shadow-lg)'}}>
                      {members.filter(m=>m.full_name.toLowerCase().includes(memberSearch.toLowerCase())||m.reg_no.includes(memberSearch)).map(m=>(
                        <div key={m.id} onClick={()=>{setNewSponsor({...newSponsor, name:m.full_name, member_id:m.id}); setMemberSearch('')}} style={{padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid var(--glass-border)', fontSize:13}}>
                          <div style={{fontWeight:600}}>{m.full_name}</div>
                          <div style={{fontSize:11, color:'var(--text-muted)'}}>Reg: {m.reg_no}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {newSponsor.member_id && (
                    <div style={{marginTop:8, padding:8, background:'var(--accent-dim)', borderRadius:6, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>Selected: <strong>{newSponsor.name}</strong></span>
                      <button className="btn btn--ghost btn--sm" onClick={()=>setNewSponsor({...newSponsor, name:'', member_id:null})}>✕</button>
                    </div>
                  )}
                </div>
              ) : (
                <input className="form-input" placeholder="Sponsor Name" value={newSponsor.name} onChange={e=>setNewSponsor({...newSponsor, name:e.target.value})}/>
              )}
              
              <button className="btn btn--primary" onClick={async()=>{
                if(!newSponsor.name) return
                await window.api.addSponsor(newSponsor)
                toast2('Sponsor added!')
                setShowAddSponsor(false); setNewSponsor({name:'',type:'External',member_id:null})
                loadSponsors()
              }}><Plus size={14}/> Save Sponsor</button>
            </div>
          </div>
        </div>
      )}

      {modal==='scan' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal modal--wide" style={{maxWidth:900}}>
            <div className="modal__header">
              <div className="modal__title" style={{display:'flex', alignItems:'center', gap:8}}>
                <Camera size={18}/>
                <span className="lang-en">Book Scanner & Auto-Fill</span>
                <span className="lang-ml">പുസ്തകം സ്കാനർ & ഓട്ടോ-ഫിൽ</span>
              </div>
              <button className="modal__close" onClick={()=>{stopCamera(); setModal(scanTargetModal)}}><X size={16}/></button>
            </div>
            
            <div className="modal__body" style={{display:'flex', gap:20, minHeight:420, maxHeight:'75vh', overflow:'hidden'}}>
              
              {/* Left Column: Input Stream / Capturer or Google Lens Preview */}
              <div style={{flex:1.2, display:'flex', flexDirection:'column', gap:14, borderRight:'1px solid var(--glass-border)', paddingRight:20, height:'100%', overflowY:'auto'}}>
                {previewImg ? (
                  <div style={{display:'flex', flexDirection:'column', gap:12}}>
                    <div style={{fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6}}>
                      👁️ Google Lens Mode: Click text to assign fields
                    </div>
                    <div style={{position:'relative', width:'100%', borderRadius:12, overflow:'hidden', border:'1px solid var(--glass-border)', background:'var(--bg-primary)', display:'inline-block'}}>
                      <img 
                        id="ocr-preview-img"
                        src={previewImg} 
                        alt="captured preview" 
                        onLoad={(e) => {
                          setImgDims({
                            width: e.target.naturalWidth || 1,
                            height: e.target.naturalHeight || 1
                          })
                        }}
                        style={{width:'100%', display:'block', objectFit:'contain'}}
                      />

                      {/* Google Lens Bounding Box Overlays */}
                      {!ocrLoading && ocrResultLines.map((box, idx) => {
                        const x0 = box.bbox.x0
                        const y0 = box.bbox.y0
                        const x1 = box.bbox.x1
                        const y1 = box.bbox.y1
                        
                        const leftPct = (x0 / imgDims.width) * 100
                        const topPct = (y0 / imgDims.height) * 100
                        const widthPct = ((x1 - x0) / imgDims.width) * 100
                        const heightPct = ((y1 - y0) / imgDims.height) * 100

                        return (
                          <div 
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOcrBox({
                                text: box.text,
                                left: `${(x0 + x1) / 2 / imgDims.width * 100}%`,
                                top: `${y1 / imgDims.height * 100}%`
                              })
                            }}
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                              border: '1px dashed rgba(13, 110, 253, 0.4)',
                              background: 'rgba(13, 110, 253, 0.08)',
                              cursor: 'pointer',
                              borderRadius: '2px',
                              zIndex: 10
                            }}
                            title={box.text}
                          />
                        )
                      })}

                      {/* Google Lens interactive Menu Tooltip */}
                      {selectedOcrBox && (
                        <div style={{
                          position: 'absolute',
                          left: selectedOcrBox.left,
                          top: `calc(${selectedOcrBox.top} + 6px)`,
                          transform: 'translateX(-50%)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--accent)',
                          borderRadius: 8,
                          padding: '6px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 100,
                          minWidth: 160
                        }}>
                          <div style={{fontSize:11, fontWeight:700, borderBottom:'1px solid var(--glass-border)', paddingBottom:4, marginBottom:2, wordBreak:'break-all', color:'var(--text-primary)'}}>
                            "{selectedOcrBox.text}"
                          </div>
                          <div style={{display:'flex', flexDirection:'column', gap:4}}>
                            <button 
                              type="button" 
                              className="btn btn--sm btn--ghost" 
                              onClick={(e) => {
                                e.stopPropagation()
                                assignOcrField('title', selectedOcrBox.text)
                                setSelectedOcrBox(null)
                              }}
                              style={{fontSize:11, padding:'4px 8px', justifyContent:'flex-start', cursor:'pointer', display:'flex', alignItems:'center', gap:6}}
                            >
                              📘 Set English Title
                            </button>
                            <button 
                              type="button" 
                              className="btn btn--sm btn--ghost" 
                              onClick={(e) => {
                                e.stopPropagation()
                                assignOcrField('title_ml', selectedOcrBox.text)
                                setSelectedOcrBox(null)
                              }}
                              style={{fontSize:11, padding:'4px 8px', justifyContent:'flex-start', cursor:'pointer', display:'flex', alignItems:'center', gap:6}}
                            >
                              ✍️ Set Malayalam Title
                            </button>
                            <button 
                              type="button" 
                              className="btn btn--sm btn--ghost" 
                              onClick={(e) => {
                                e.stopPropagation()
                                assignOcrField('author', selectedOcrBox.text)
                                setSelectedOcrBox(null)
                              }}
                              style={{fontSize:11, padding:'4px 8px', justifyContent:'flex-start', cursor:'pointer', display:'flex', alignItems:'center', gap:6}}
                            >
                              👤 Set Author
                            </button>
                            <button 
                              type="button" 
                              className="btn btn--sm btn--ghost" 
                              onClick={(e) => {
                                e.stopPropagation()
                                assignOcrField('translator', selectedOcrBox.text)
                                setSelectedOcrBox(null)
                              }}
                              style={{fontSize:11, padding:'4px 8px', justifyContent:'flex-start', cursor:'pointer', display:'flex', alignItems:'center', gap:6}}
                            >
                              🔄 Set Translator
                            </button>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn--sm btn--ghost" 
                            onClick={(e) => { e.stopPropagation(); setSelectedOcrBox(null) }}
                            style={{fontSize:10, padding:'2px', color:'var(--text-muted)', cursor:'pointer', alignSelf:'center', marginTop:2}}
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      className="btn btn--ghost" 
                      onClick={() => {
                        setPreviewImg('')
                        setOcrResultLines([])
                        setOcrLines([])
                        setSelectedOcrBox(null)
                      }}
                      style={{width:'100%', justifyContent:'center'}}
                    >
                      Clear & Scan Another
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{display:'flex', gap:8}}>
                      <button 
                        type="button" 
                        className={`btn ${scanMode==='camera'?'btn--primary':'btn--ghost'}`}
                        onClick={()=>{setScanMode('camera'); startCamera(selectedDevice)}}
                        style={{flex:1, padding:'6px 12px', fontSize:13, cursor:'pointer'}}
                      >
                        <Camera size={14} style={{marginRight:6}}/>
                        <span className="lang-en">Live Camera</span>
                        <span className="lang-ml">ക്യാമറ</span>
                      </button>
                      <button 
                        type="button" 
                        className={`btn ${scanMode==='file'?'btn--primary':'btn--ghost'}`}
                        onClick={()=>{setScanMode('file'); stopCamera()}}
                        style={{flex:1, padding:'6px 12px', fontSize:13, cursor:'pointer'}}
                      >
                        <Upload size={14} style={{marginRight:6}}/>
                        <span className="lang-en">Upload Image</span>
                        <span className="lang-ml">ഫയൽ</span>
                      </button>
                    </div>

                    {scanMode === 'camera' ? (
                      <div style={{display:'flex', flexDirection:'column', gap:10}}>
                        {/* Device Selector */}
                        {devices.length > 1 && (
                          <div className="form-group">
                            <label className="form-label" style={{fontSize:12}}>Select Input Camera</label>
                            <select 
                              className="form-select" 
                              value={selectedDevice} 
                              onChange={(e)=>{setSelectedDevice(e.target.value); startCamera(e.target.value)}}
                              style={{padding:'4px 8px', fontSize:13}}
                            >
                              {devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.substring(0,5)}`}</option>)}
                            </select>
                          </div>
                        )}
                        
                        {/* Live Stream viewport */}
                        <div style={{position:'relative', width:'100%', aspectRatio:'4/3', background:'#000', borderRadius:12, overflow:'hidden', boxShadow:'inset var(--shadow)'}}>
                          <video 
                            id="scanner-video" 
                            autoPlay 
                            playsInline 
                            muted 
                            style={{width:'100%', height:'100%', objectFit:'cover'}}
                          />
                          <div style={{position:'absolute', border:'2px dashed var(--accent)', inset:'10%', borderRadius:8, pointerEvents:'none', opacity:0.6}}/>
                        </div>

                        <button 
                          type="button" 
                          className="btn btn--primary" 
                          onClick={handleCapture}
                          style={{width:'100%', justifyContent:'center', padding:'10px', fontSize:14, cursor:'pointer'}}
                          disabled={!cameraStream}
                        >
                          <Sparkles size={15} style={{marginRight:6}}/> Capture Cover / Barcode
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex', flexDirection:'column', gap:14}}>
                        {/* Upload box */}
                        <div 
                          onClick={()=>document.getElementById('ocr-file-input').click()}
                          style={{
                            width:'100%', 
                            aspectRatio:'4/3', 
                            border:'2px dashed var(--glass-border)', 
                            borderRadius:12, 
                            display:'flex', 
                            flexDirection:'column', 
                            justifyContent:'center', 
                            alignItems:'center', 
                            cursor:'pointer',
                            background:'var(--bg-primary)',
                            gap:12,
                            padding:20,
                            textAlign:'center'
                          }}
                        >
                          <Upload size={32} style={{color:'var(--text-muted)'}}/>
                          <div>
                            <div style={{fontWeight:600}} className="lang-en">Click to browse cover image</div>
                            <div style={{fontWeight:600}} className="lang-ml">ചിത്രം തിരഞ്ഞെടുക്കാൻ ക്ലിക്ക് ചെയ്യുക</div>
                            <div style={{fontSize:11, color:'var(--text-subtle)', marginTop:4}}>Supports JPG, PNG, WEBP</div>
                          </div>
                          <input 
                            id="ocr-file-input" 
                            type="file" 
                            accept="image/*" 
                            onChange={handleScanFile} 
                            style={{display:'none'}}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>


              {/* Right Column: OCR Results & API Matching */}
              <div style={{flex:1.5, display:'flex', flexDirection:'column', gap:16, height:'100%', overflowY:'auto', paddingRight:6}}>
                {/* Status Bar */}
                <div style={{
                  padding:'10px 14px', 
                  borderRadius:8, 
                  background:ocrLoading ? 'var(--accent-dim)' : 'var(--bg-primary)', 
                  border:'1px solid var(--glass-border)',
                  fontSize:13,
                  fontWeight:600,
                  display:'flex',
                  alignItems:'center',
                  gap:8
                }}>
                  {ocrLoading && <RefreshCw size={14} className="spin" style={{color:'var(--accent)'}}/>}
                  <span>{ocrStatus}</span>
                </div>

                {/* API Book Matches */}
                <div>
                  <div style={{fontWeight:700, fontSize:13, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5, color:'var(--text-muted)'}}>
                    🔍 Google Books / Open Library Matches
                  </div>
                  {bookMatches.length > 0 ? (
                    <div style={{display:'flex', flexDirection:'column', gap:10}}>
                      {bookMatches.map((m, idx) => (
                        <div key={idx} style={{
                          display:'flex', 
                          gap:12, 
                          padding:10, 
                          borderRadius:10, 
                          background:'var(--bg-primary)', 
                          border:'1px solid var(--glass-border)',
                          alignItems:'center'
                        }}>
                          {m.cover ? (
                            <img src={m.cover} alt="cover" style={{width:45, height:65, objectFit:'cover', borderRadius:6, boxShadow:'var(--shadow)'}}/>
                          ) : (
                            <div style={{width:45, height:65, background:'var(--text-subtle)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>📘</div>
                          )}
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{m.title}</div>
                            <div style={{fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                              {m.author || 'Unknown Author'} {m.year ? `(${m.year})` : ''}
                            </div>
                            <div style={{fontSize:11, color:'var(--accent)', fontWeight:600, marginTop:2}}>{m.source} {m.isbn && `• ISBN: ${m.isbn}`}</div>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn--primary" 
                            onClick={()=>selectBookMatch(m)}
                            style={{padding:'4px 10px', fontSize:12, height:28, cursor:'pointer'}}
                          >
                            👉 Select
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{padding:'20px 10px', textAlign:'center', color:'var(--text-muted)', background:'var(--bg-primary)', borderRadius:8, border:'1px solid var(--glass-border)', fontSize:13}}>
                      No matches queried yet. Scan/upload a cover to locate the book.
                    </div>
                  )}
                </div>

                {/* Fallback Text Mapper */}
                <div>
                  <div style={{fontWeight:700, fontSize:13, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5, color:'var(--text-muted)'}}>
                    🏷️ Manual OCR Text Mapper
                  </div>
                  <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:10}}>
                    Click any recognized line below and choose the target input field to copy it.
                  </div>
                  {ocrLines.length > 0 ? (
                    <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:200, overflowY:'auto', paddingRight:4}}>
                      {ocrLines.map((line, idx) => (
                        <div key={idx} style={{
                          display:'flex', 
                          justifyContent:'space-between', 
                          alignItems:'center', 
                          padding:'6px 10px', 
                          background:'var(--bg-primary)', 
                          borderRadius:8, 
                          border:'1px solid var(--glass-border)',
                          fontSize:12
                        }}>
                          <span style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', marginRight:10}}>{line}</span>
                          <div style={{display:'flex', gap:4}}>
                            <button type="button" className="btn btn--ghost" onClick={()=>assignOcrField('title', line)} style={{fontSize:10, padding:'2px 6px', height:20, cursor:'pointer'}}>Title</button>
                            <button type="button" className="btn btn--ghost" onClick={()=>assignOcrField('title_ml', line)} style={{fontSize:10, padding:'2px 6px', height:20, cursor:'pointer'}}>Ml-Title</button>
                            <button type="button" className="btn btn--ghost" onClick={()=>assignOcrField('author', line)} style={{fontSize:10, padding:'2px 6px', height:20, cursor:'pointer'}}>Author</button>
                            <button type="button" className="btn btn--ghost" onClick={()=>assignOcrField('translator', line)} style={{fontSize:10, padding:'2px 6px', height:20, cursor:'pointer'}}>Translator</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{padding:'20px 10px', textAlign:'center', color:'var(--text-muted)', background:'var(--bg-primary)', borderRadius:8, border:'1px solid var(--glass-border)', fontSize:12}}>
                      Captured lines will appear here for manual selection mapping.
                    </div>
                  )}
                </div>

              </div>

            </div>

            <div className="modal__footer">
              <button 
                type="button" 
                className="btn btn--ghost" 
                onClick={()=>{stopCamera(); setModal(scanTargetModal)}}
                style={{cursor:'pointer'}}
              >
                Back to Form
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast--${toast.type}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div></div>}
    </div>
  )
}
