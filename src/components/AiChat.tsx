import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../hooks/useAiChat'

interface AiChatProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (text: string) => void
  onClear: () => void
}

const SUGGESTIONS = [
  'Which station is cheapest?',
  'What is the DMRE price?',
  'Tips to save on fuel?',
  'When do prices change?',
]

export function AiChat({ messages, isLoading, onSend, onClear }: AiChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={styles.bubble}
        aria-label="Open AI assistant"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!open && hasMessages && <span style={styles.unreadDot} />}
      </button>

      {/* Panel */}
      <div
        style={{
          ...styles.panel,
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Panel header */}
        <div style={styles.panelHeader}>
          <div style={styles.headerLeft}>
            <div style={styles.aiAvatar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <div>
              <span style={styles.aiName}>FuelWatch AI</span>
              <span style={styles.aiStatus}>
                <span style={styles.onlineDot} />
                Online
              </span>
            </div>
          </div>
          <div style={styles.headerActions}>
            {hasMessages && (
              <button onClick={onClear} style={styles.clearBtn} title="Clear chat">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
            <button onClick={() => setOpen(false)} style={styles.closeBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {!hasMessages && (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>Ask me anything about fuel prices</p>
              <p style={styles.emptySubtitle}>I have live data on nearby stations and DMRE regulated prices.</p>
              <div style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    style={styles.suggestionChip}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={styles.assistantAvatar}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                  </svg>
                </div>
              )}
              <div
                style={
                  msg.role === 'user'
                    ? styles.userBubble
                    : { ...styles.assistantBubble, opacity: msg.loading ? 0.6 : 1 }
                }
              >
                {msg.loading ? (
                  <TypingDots />
                ) : (
                  <span style={styles.messageText}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about fuel prices..."
            style={styles.input}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              ...styles.sendBtn,
              opacity: !input.trim() || isLoading ? 0.4 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

function TypingDots() {
  return (
    <div style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            ...styles.dot,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

const styles = {
  // ── Bubble ───────────────────────────────────────────────────────────────────
  bubble: {
    position: 'fixed' as const,
    bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 16px)',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'var(--cyan)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0, 200, 255, 0.4)',
    zIndex: 999,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  unreadDot: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--red)',
    border: '2px solid var(--bg)',
  },

  // ── Panel ────────────────────────────────────────────────────────────────────
  panel: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '72vh',
    background: 'var(--surface)',
    borderTop: '1px solid rgba(0, 200, 255, 0.25)',
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 998,
    transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--cyan)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiName: {
    fontFamily: 'var(--font-hud)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'var(--text)',
    display: 'block',
  },
  aiStatus: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--green)',
    display: 'inline-block',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
  },

  // ── Messages ─────────────────────────────────────────────────────────────────
  messages: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '24px 8px',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'var(--font-hud)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text)',
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--muted)',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
  },
  suggestionChip: {
    padding: '6px 12px',
    borderRadius: 20,
    background: 'rgba(0, 200, 255, 0.08)',
    border: '1px solid rgba(0, 200, 255, 0.2)',
    color: 'var(--cyan)',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
  },
  assistantAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'var(--cyan)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  userBubble: {
    maxWidth: '78%',
    padding: '9px 13px',
    borderRadius: '16px 16px 4px 16px',
    background: 'var(--cyan)',
    color: 'var(--bg)',
  },
  assistantBubble: {
    maxWidth: '78%',
    padding: '9px 13px',
    borderRadius: '16px 16px 16px 4px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    transition: 'opacity 0.2s',
  },
  messageText: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    lineHeight: 1.55,
    color: 'inherit',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },

  // ── Input row ────────────────────────────────────────────────────────────────
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px 20px', // 20px bottom for home indicator
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--surface)',
  },
  input: {
    flex: 1,
    height: 42,
    padding: '0 14px',
    borderRadius: 21,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'var(--cyan)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--bg)',
    transition: 'opacity 0.15s',
  },

  // ── Typing dots ──────────────────────────────────────────────────────────────
  dots: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 0',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--muted)',
    display: 'inline-block',
    animation: 'typing-bounce 1s ease-in-out infinite',
  },
}
