import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const REPO_ID = 'markluce-fun'
const VISIBILITY_LABELS = { public: '公開', private: '私人', shared: '指定分享' }
const VISIBILITY_COLORS = {
  public: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  private: 'bg-red-500/20 text-red-300 border-red-500/30',
  shared: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      })
      if (error) {
        setError(error.message)
      } else if (data?.user?.identities?.length === 0) {
        setError('此 Email 已註冊，請直接登入。')
        setMode('login')
      } else {
        setError('註冊成功！請查收驗證信件。')
      }
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-center mb-4">{mode === 'login' ? '登入' : '註冊'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="顯示名稱"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        )}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼（至少 6 碼）" required minLength={6}
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        {error && <p className="text-xs text-amber-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition">
          {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
        </button>
      </form>
      <p className="text-center text-xs text-slate-500 mt-3 cursor-pointer hover:text-slate-300"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
        {mode === 'login' ? '沒有帳號？註冊' : '已有帳號？登入'}
      </p>
    </div>
  )
}

function NoteEditor({ user, date, existingNote, onSaved }) {
  const [content, setContent] = useState(existingNote?.content || '')
  const [visibility, setVisibility] = useState(existingNote?.visibility || 'public')
  const [shareEmails, setShareEmails] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setContent(existingNote?.content || '')
    setVisibility(existingNote?.visibility || 'public')
  }, [existingNote])

  async function save() {
    if (!content.trim()) return
    setSaving(true)
    setMsg('')

    const noteData = {
      user_id: user.id,
      date,
      content: content.trim(),
      visibility,
      repo_id: REPO_ID,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingNote) {
      result = await supabase.from('daily_notes').update(noteData).eq('id', existingNote.id).select().single()
    } else {
      result = await supabase.from('daily_notes').insert(noteData).select().single()
    }

    if (result.error) {
      setMsg(result.error.message)
    } else {
      // Handle shares if visibility is 'shared'
      if (visibility === 'shared' && shareEmails.trim()) {
        const emails = shareEmails.split(',').map(e => e.trim()).filter(Boolean)
        // Look up user IDs by email
        for (const email of emails) {
          const { data: profiles } = await supabase.from('user_profiles').select('id').eq('email', email)
          if (profiles && profiles[0]) {
            await supabase.from('daily_note_shares').upsert({
              note_id: result.data.id,
              shared_with: profiles[0].id
            }, { onConflict: 'note_id,shared_with' })
          }
        }
      }
      setMsg('已儲存')
      onSaved()
    }
    setSaving(false)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">{date} 的筆記</h3>
        <div className="flex gap-1">
          {['public', 'private', 'shared'].map(v => (
            <button key={v} onClick={() => setVisibility(v)}
              className={`text-xs px-2 py-0.5 rounded border transition ${visibility === v ? VISIBILITY_COLORS[v] : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
              {VISIBILITY_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
        placeholder="今天的筆記..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none" />
      {visibility === 'shared' && (
        <input value={shareEmails} onChange={e => setShareEmails(e.target.value)}
          placeholder="分享對象的 email（逗號分隔）"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{msg}</span>
        <button onClick={save} disabled={saving || !content.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition">
          {saving ? '儲存中...' : existingNote ? '更新' : '儲存'}
        </button>
      </div>
    </div>
  )
}

function NoteCard({ note, isOwner, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const displayName = note.user_profiles?.display_name || note.user_profiles?.email?.split('@')[0] || '匿名'

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">{note.date}</span>
          <span className="text-xs text-indigo-300">{displayName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${VISIBILITY_COLORS[note.visibility]}`}>
            {VISIBILITY_LABELS[note.visibility]}
          </span>
        </div>
        {isOwner && (
          <button onClick={() => onDelete(note.id)} className="text-xs text-red-400/60 hover:text-red-400 transition">刪除</button>
        )}
      </div>
      <div className={`text-sm text-slate-300 whitespace-pre-wrap ${!expanded && note.content.length > 200 ? 'line-clamp-3' : ''}`}>
        {note.content}
      </div>
      {note.content.length > 200 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-400 mt-1 hover:underline">
          {expanded ? '收起' : '展開全文'}
        </button>
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [myNoteToday, setMyNoteToday] = useState(null)
  const [showEditor, setShowEditor] = useState(false)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadNotes = useCallback(async () => {
    // Load public notes + own notes
    const { data } = await supabase
      .from('daily_notes')
      .select('*, user_profiles(display_name, email)')
      .eq('repo_id', REPO_ID)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setNotes(data)
      if (user) {
        const mine = data.find(n => n.user_id === user.id && n.date === today)
        setMyNoteToday(mine || null)
      }
    }
  }, [user, today])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function handleDelete(noteId) {
    await supabase.from('daily_notes').delete().eq('id', noteId)
    loadNotes()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setMyNoteToday(null)
    setShowEditor(false)
  }

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col">
      <nav className="max-w-2xl mx-auto px-6 py-6 w-full flex items-center justify-between">
        <a href="https://aipm.com.tw/" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition inline-block">
          &larr; aipm.com.tw
        </a>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{displayName}</span>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300 transition">登出</button>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-2xl mx-auto px-6 pb-12 w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            markluce-fun
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Daily Notes</p>
        </div>

        {loading ? (
          <p className="text-center text-slate-500">載入中...</p>
        ) : !user ? (
          <>
            <div className="mb-8">
              <Auth onAuth={() => {}} />
            </div>
            {/* Show public notes even when not logged in */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-slate-400 mb-2">公開筆記</h2>
              {notes.filter(n => n.visibility === 'public').length === 0 ? (
                <p className="text-sm text-slate-600">目前沒有公開筆記</p>
              ) : notes.filter(n => n.visibility === 'public').map(n => (
                <NoteCard key={n.id} note={n} isOwner={false} onDelete={() => {}} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Editor */}
            <div className="mb-6">
              {!showEditor && !myNoteToday ? (
                <button onClick={() => setShowEditor(true)}
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 py-3 rounded-xl text-sm font-medium transition">
                  + 寫今天的筆記
                </button>
              ) : (
                <NoteEditor user={user} date={today} existingNote={myNoteToday}
                  onSaved={() => { setShowEditor(false); loadNotes() }} />
              )}
            </div>

            {/* Notes list */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-slate-400">所有筆記</h2>
              {notes.length === 0 ? (
                <p className="text-sm text-slate-600">還沒有任何筆記</p>
              ) : notes.map(n => (
                <NoteCard key={n.id} note={n} isOwner={n.user_id === user.id} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
