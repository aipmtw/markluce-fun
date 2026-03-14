function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col">
      <nav className="max-w-6xl mx-auto px-6 py-6 w-full">
        <a href="https://aipm.com.tw/" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition inline-block">
          ← aipm.com.tw
        </a>
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-12">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          markluce-fun
        </h1>
        <p className="mt-4 text-slate-400">Welcome to my space</p>
      </main>
    </div>
  )
}

export default App
