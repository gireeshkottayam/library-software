import React, { useState, useEffect, useRef } from 'react'

export default function TransliteratedInput({ value, onChange, placeholder, name, className, disabled, type = 'text', enabled = true }) {
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const inputRef = useRef(null)
  const [lastWord, setLastWord] = useState('')

  const fetchSuggestions = async (text) => {
    if (!text || text.trim().length === 0) return []
    try {
      const resp = await fetch(`https://inputtools.google.com/request?text=${text}&itc=ml-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`)
      const data = await resp.json()
      if (data[0] === 'SUCCESS') {
        return data[1][0][1]
      }
    } catch (err) {
      console.error('Transliteration error:', err)
    }
    return []
  }

  const handleKeyDown = async (e) => {
    if (show && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(p => (p + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(p => (p - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        // Only prevent default if we have a valid selection to avoid blocking normal spacing
        if (suggestions[activeIdx]) {
          e.preventDefault()
          selectSuggestion(suggestions[activeIdx])
        }
      } else if (e.key === 'Escape') {
        setShow(false)
      }
    }
  }

  const handleInput = async (e) => {
    const val = e.target.value
    if (!enabled) {
      onChange(e)
      return
    }
    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    
    // Improved word detection: get the last continuous block of Latin characters
    const match = textBeforeCursor.match(/([a-zA-Z]+)$/)
    const currentWord = match ? match[1] : ''

    if (currentWord) {
      const rect = inputRef.current.getBoundingClientRect()
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX + (cursor * 8) })
      
      const sugs = await fetchSuggestions(currentWord)
      if (sugs && sugs.length > 0) {
        setSuggestions(sugs)
        setLastWord(currentWord)
        setActiveIdx(0)
        setShow(true)
      } else {
        setShow(false)
      }
    } else {
      setShow(false)
    }
    
    onChange(e)
  }

  const selectSuggestion = (sug) => {
    if (!sug) return
    const val = inputRef.current.value
    const cursor = inputRef.current.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const textAfterCursor = val.slice(cursor)
    
    // Find the last occurrence of the English word before the cursor
    const lastIndex = textBeforeCursor.lastIndexOf(lastWord)
    if (lastIndex === -1) return

    const newVal = textBeforeCursor.slice(0, lastIndex) + sug + ' ' + textAfterCursor
    
    onChange({ target: { name, value: newVal } })
    setShow(false)
    setSuggestions([])
    
    setTimeout(() => {
      inputRef.current.focus()
      const newPos = lastIndex + sug.length + 1
      inputRef.current.setSelectionRange(newPos, newPos)
    }, 10)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {type === 'textarea' ? (
        <textarea
          ref={inputRef}
          name={name}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
      )}

      {show && suggestions.length > 0 && (
        <div style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: '4px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2000,
          minWidth: '120px',
          padding: '4px 0'
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => selectSuggestion(s)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                background: i === activeIdx ? 'var(--accent-dim)' : 'transparent',
                color: i === activeIdx ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: i === activeIdx ? '600' : '400'
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
