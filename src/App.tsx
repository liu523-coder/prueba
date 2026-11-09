import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type TaskStatus = 'Pendiente' | 'En progreso' | 'Completada'
type Filter = 'Todas' | TaskStatus
type Task = { id: string; title: string; description: string; status: TaskStatus; createdAt: string }
const STATUS_OPTIONS: TaskStatus[] = ['Pendiente', 'En progreso', 'Completada']
const STORAGE_KEY = 'mis-tareas'
const statusStyles: Record<TaskStatus, string> = {
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'En progreso': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Completada: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.25"><path d="m6.5 12.5 3.3 3.3 7.8-8.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function EmptyIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="size-10" fill="none"><rect x="9" y="8" width="30" height="34" rx="6" stroke="currentColor" strokeWidth="2" /><path d="M17 18h14M17 25h10M17 32h7m6 1 2.5 2.5L38 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const result = creating
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setError(result.error.message)
    else if (creating && !result.data.session) setNotice('Revisa tu correo para confirmar la cuenta y luego inicia sesión.')
    setBusy(false)
  }

  return <main className="grid min-h-screen place-items-center px-4 py-10">
    <section className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-xl ring-1 ring-[#e3e9e6] sm:p-9">
      <div className="mb-7 grid size-12 place-items-center rounded-2xl bg-[#167455] text-white"><CheckIcon /></div>
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#1a7a5b]">Mis tareas</p>
      <h1 className="text-2xl font-bold tracking-tight">{creating ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
      <p className="mt-2 text-sm leading-6 text-[#77857e]">{creating ? 'Regístrate para guardar tus tareas en Supabase.' : 'Accede para ver y administrar tus tareas.'}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold">Correo electrónico<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6e2] px-4 py-3 font-normal outline-none focus:border-[#268561] focus:ring-2 focus:ring-[#268561]/15" /></label>
        <label className="block text-sm font-semibold">Contraseña<input type="password" required minLength={6} autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe6e2] px-4 py-3 font-normal outline-none focus:border-[#268561] focus:ring-2 focus:ring-[#268561]/15" /></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[#173c31] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#20533f] disabled:opacity-60">{busy ? 'Un momento…' : creating ? 'Crear cuenta' : 'Iniciar sesión'}</button>
      </form>
      <button type="button" onClick={() => { setCreating(!creating); setError(''); setNotice('') }} className="mt-5 text-sm font-semibold text-[#167455] hover:underline">{creating ? 'Ya tengo una cuenta' : 'Crear una cuenta nueva'}</button>
    </section>
  </main>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksReady, setTasksReady] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('Pendiente')
  const [filter, setFilter] = useState<Filter>('Todas')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) {
      try { setTasks(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { setTasks([]) }
      setTasksReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession); setTasksReady(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    if (!session) { setTasks([]); setTasksReady(authReady); return }
    let active = true
    supabase.from('tarea').select('id,titulo,descripcion,estado,created_at').order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) setError(queryError.message)
        else setTasks((data ?? []).map(row => ({ id: String(row.id), title: row.titulo, description: row.descripcion ?? '', status: row.estado as TaskStatus, createdAt: row.created_at })))
        setTasksReady(true)
      })
    return () => { active = false }
  }, [session, authReady])

  useEffect(() => {
    if (!supabase && tasksReady) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks, tasksReady])

  const filteredTasks = useMemo(() => filter === 'Todas' ? tasks : tasks.filter(task => task.status === filter), [filter, tasks])
  const completed = tasks.filter(task => task.status === 'Completada').length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle || busy) return
    setBusy(true); setError('')
    if (supabase && session?.user) {
      const { data, error: insertError } = await supabase.from('tarea').insert({ titulo: cleanTitle, descripcion: description.trim(), estado: status, responsible_id: session.user.id, created_by: session.user.id }).select('id,titulo,descripcion,estado,created_at').single()
      if (insertError) setError(insertError.message)
      else if (data) setTasks(current => [{ id: String(data.id), title: data.titulo, description: data.descripcion ?? '', status: data.estado as TaskStatus, createdAt: data.created_at }, ...current])
    } else {
      setTasks(current => [{ id: crypto.randomUUID(), title: cleanTitle, description: description.trim(), status, createdAt: new Date().toISOString() }, ...current])
    }
    setTitle(''); setDescription(''); setStatus('Pendiente'); setBusy(false)
  }

  async function updateStatus(id: string, nextStatus: TaskStatus) {
    setError('')
    if (supabase) {
      const { error: updateError } = await supabase.from('tarea').update({ estado: nextStatus }).eq('id', id)
      if (updateError) { setError(updateError.message); return }
    }
    setTasks(current => current.map(task => task.id === id ? { ...task, status: nextStatus } : task))
  }

  async function deleteTask(id: string) {
    setError('')
    if (supabase) {
      const { error: deleteError } = await supabase.from('tarea').delete().eq('id', id)
      if (deleteError) { setError(deleteError.message); return }
    }
    setTasks(current => current.filter(task => task.id !== id))
  }

  if (supabase && !authReady) return <main className="grid min-h-screen place-items-center text-sm text-[#708078]">Conectando…</main>
  if (supabase && !session) return <AuthScreen />

  return <main className="min-h-screen bg-[#f4f7f5] px-4 py-5 text-[#17251f] sm:px-7 sm:py-8 lg:px-10">
    <div className="mx-auto max-w-[1440px]">
      <header className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#167455] text-white shadow-lg"><CheckIcon /></div><div><h1 className="text-[22px] font-bold tracking-tight">Mis tareas</h1><p className="text-sm text-[#708078]">{new Date().getHours() < 12 ? 'Buenos días, organiza tu día' : new Date().getHours() < 19 ? 'Buenas tardes, revisa lo que te falta' : 'Buenas noches, cierra tu día con calma'}</p></div></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#526159] shadow-sm ring-1 ring-[#dfe6e2]"><span className={`size-2 rounded-full ${supabase ? 'bg-[#2fa476]' : 'bg-amber-400'}`} />{supabase ? session?.user.email : 'Modo local'}</span>
          {supabase && <button onClick={() => supabase.auth.signOut()} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#526159] ring-1 ring-[#dfe6e2] hover:bg-[#f8faf9]">Cerrar sesión</button>}
        </div>
      </header>
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="grid items-start gap-6 lg:grid-cols-[370px_minmax(0,1fr)]">
        <aside className="rounded-[28px] bg-[#173c31] p-6 text-white shadow-[0_20px_50px_rgba(20,57,46,0.13)] sm:p-7 lg:sticky lg:top-8">
          <div className="mb-7"><span className="mb-4 grid size-10 place-items-center rounded-xl bg-white/10 text-[#b5e2cf]"><PlusIcon /></span><h2 className="text-xl font-bold">Nueva tarea</h2><p className="mt-1 text-sm leading-6 text-[#a9c1b8]">Añade algo nuevo a tu lista.</p></div>
          <form onSubmit={addTask} className="space-y-5">
            <label className="block"><span className="mb-2 block text-[13px] font-semibold text-[#d7e5e0]">Título</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué necesitas hacer?" maxLength={80} className="w-full rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-[#78958b] focus:border-[#72c7a7]" required /></label>
            <label className="block"><span className="mb-2 block text-[13px] font-semibold text-[#d7e5e0]">Descripción</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Añade un poco de contexto..." rows={4} maxLength={240} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-[#78958b] focus:border-[#72c7a7]" /></label>
            <label className="block"><span className="mb-2 block text-[13px] font-semibold text-[#d7e5e0]">Estado</span><select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full rounded-xl border border-white/10 bg-[#244c40] px-4 py-3 text-sm text-white outline-none focus:border-[#72c7a7]">{STATUS_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></label>
            {supabase && <p className="text-xs text-[#a9c1b8]">Responsable: {session?.user.email}</p>}
            <button disabled={busy || !tasksReady} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a9e4cb] px-5 py-3.5 text-sm font-bold text-[#123b2f] transition hover:bg-[#b9ecd6] disabled:opacity-60"><PlusIcon />Agregar tarea</button>
          </form>
          <div className="mt-8 border-t border-white/10 pt-6"><div className="mb-2.5 flex justify-between text-xs"><span className="text-[#a9c1b8]">Progreso general</span><span className="font-bold text-[#d9f3e8]">{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#a9e4cb] transition-all" style={{ width: `${progress}%` }} /></div></div>
        </aside>
        <section className="min-w-0 rounded-[28px] bg-white p-5 shadow-[0_16px_50px_rgba(30,58,48,0.07)] ring-1 ring-[#e3e9e6] sm:p-7 lg:p-8">
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1a7a5b]">Tu espacio</p><h2 className="text-[28px] font-bold tracking-tight">Tareas del día</h2><p className="mt-1 text-sm text-[#77857e]">{tasks.length === 0 ? 'Tu lista está lista para empezar.' : completed === tasks.length ? '¡Día completado, buen trabajo!' : `${completed} de ${tasks.length} ${tasks.length === 1 ? 'tarea completada' : 'tareas completadas'}`}</p></div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f3f6f4] p-1">{(['Todas', ...STATUS_OPTIONS] as Filter[]).map(option => { const count = option === 'Todas' ? tasks.length : tasks.filter(task => task.status === option).length; return <button key={option} type="button" onClick={() => setFilter(option)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${filter === option ? 'bg-white text-[#174a3a] shadow-sm' : 'text-[#77857e] hover:text-[#364b42]'}`}>{option} <span className="ml-1 opacity-60">{count}</span></button> })}</div>
          </div>
          {filteredTasks.length ? <div className="space-y-3">{filteredTasks.map(task => <article key={task.id} className={`group rounded-2xl border p-4 transition sm:p-5 ${task.status === 'Completada' ? 'border-[#e2e9e5] bg-[#fafcfb]' : 'border-[#e4eae7] bg-white hover:border-[#cbd8d2] hover:shadow-md'}`}><div className="flex items-start gap-3.5 sm:gap-4"><button type="button" onClick={() => updateStatus(task.id, task.status === 'Completada' ? 'Pendiente' : 'Completada')} aria-label={task.status === 'Completada' ? 'Marcar como pendiente' : 'Marcar como completada'} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${task.status === 'Completada' ? 'border-[#268561] bg-[#268561] text-white' : 'border-[#b9c7c0] text-transparent hover:border-[#268561] hover:text-[#268561]'}`}><CheckIcon /></button><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className={`font-semibold leading-6 ${task.status === 'Completada' ? 'text-[#849089] line-through' : 'text-[#25362f]'}`}>{task.title}</h3>{task.description && <p className={`mt-1 text-sm leading-6 ${task.status === 'Completada' ? 'text-[#9ba59f]' : 'text-[#6e7d76]'}`}>{task.description}</p>}</div><div className="flex shrink-0 items-center gap-2"><select value={task.status} onChange={e => updateStatus(task.id, e.target.value as TaskStatus)} aria-label={`Estado de ${task.title}`} className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${statusStyles[task.status]}`}>{STATUS_OPTIONS.map(option => <option key={option}>{option}</option>)}</select><button type="button" onClick={() => setPendingDelete(task.id)} aria-label={`Eliminar ${task.title}`} className="grid size-8 place-items-center rounded-lg text-[#9aa59f] hover:bg-red-50 hover:text-red-600"><TrashIcon /></button></div></div><p className="mt-3 text-xs text-[#8a978f]">{supabase ? `Responsable: ${session?.user.email}` : 'Guardada en este navegador'} · {new Date(task.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div></div></article>)}</div> : <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[#d9e2dd] bg-[#fbfcfb] px-6 text-center"><div><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#edf6f2] text-[#328265]"><EmptyIcon /></div><h3 className="font-bold text-[#273a32]">{tasks.length ? 'No hay tareas en este estado' : 'No hay tareas todavía'}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#7b8982]">{tasks.length ? 'Prueba con otro filtro para ver el resto de tu lista.' : 'Crea tu primera tarea usando el formulario y empieza a organizarte.'}</p></div></div>}
        </section>
      </section>
    </div>
    {pendingDelete && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#25362f]">¿Ecambio de nuevo?</h3>
        <p className="mt-2 text-sm text-[#77857e]">Esta acción no se puede leledeshacer.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setPendingDelete(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#526159] hover:bg-[#f3f6f4]">Cancelar</button>
          <button type="button" onClick={() => { deleteTask(pendingDelete); setPendingDelete(null) }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Eliminar</button>
        </div>
      </div>
   </div>
   )}
  </main>
}
