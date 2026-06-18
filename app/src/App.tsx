import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, useState } from 'react'
import { Toaster } from 'sonner'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import PaginaLogin from './pages/PaginaLogin'
import PaginaPanel from './pages/PaginaPanel'
import ErrorBoundary from './components/ErrorBoundary'
import PinLock from './components/PinLock'
import { tienePin, estaDesbloqueado } from './lib/pin'
import { ConfirmProvider } from './hooks/useConfirm'
import { lazyWithRetry } from './lib/lazyWithRetry'

// Version personal: solo las paginas adaptadas al esquema simplificado.
// El resto de las paginas del CannTrace original quedan en src/pages por si
// se adaptan mas adelante, pero fuera del router.
const PaginaPlantas = lazyWithRetry(() => import('./pages/PaginaPlantas'), 'PaginaPlantas')
const PaginaChat = lazyWithRetry(() => import('./pages/PaginaChat'), 'PaginaChat')
const PaginaTablas = lazyWithRetry(() => import('./pages/PaginaTablas'), 'PaginaTablas')
const PaginaSala = lazyWithRetry(() => import('./pages/PaginaSala'), 'PaginaSala')
const PaginaEstadisticas = lazyWithRetry(() => import('./pages/PaginaEstadisticas'), 'PaginaEstadisticas')
const PaginaPacientes = lazyWithRetry(() => import('./pages/PaginaPacientes'), 'PaginaPacientes')
const PaginaGeneticas = lazyWithRetry(() => import('./pages/PaginaGeneticas'), 'PaginaGeneticas')
const PaginaAsistencia = lazyWithRetry(() => import('./pages/PaginaAsistencia'), 'PaginaAsistencia')
const PaginaStockInsumos = lazyWithRetry(() => import('./pages/PaginaStockInsumos'), 'PaginaStockInsumos')
const PaginaCalendarioCultivo = lazyWithRetry(() => import('./pages/PaginaCalendarioCultivo'), 'PaginaCalendarioCultivo')
const PaginaLineaTiempo = lazyWithRetry(() => import('./pages/PaginaLineaTiempo'), 'PaginaLineaTiempo')
const PaginaEconometria = lazyWithRetry(() => import('./pages/PaginaEconometria'), 'PaginaEconometria')
const PaginaAmbiente = lazyWithRetry(() => import('./pages/PaginaAmbiente'), 'PaginaAmbiente')
const PaginaHistoriaPlanta = lazyWithRetry(() => import('./pages/PaginaHistoriaPlanta'), 'PaginaHistoriaPlanta')
const Pagina404 = lazyWithRetry(() => import('./pages/Pagina404'), 'Pagina404')

function SpinnerCarga({ texto }: { texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-900 border-t-primary-400 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-surface-500">{texto}</p>
      </div>
    </div>
  )
}

function RutaRaiz() {
  const { autenticado, cargando } = useAuth()
  if (cargando) return <SpinnerCarga texto="Cargando..." />
  if (!autenticado) return <Navigate to="/login" replace />
  return <Layout />
}

function App() {
  const { login, autenticado, cargando } = useAuth()
  const [desbloqueado, setDesbloqueado] = useState(estaDesbloqueado())

  if (cargando) return <SpinnerCarga texto="Iniciando..." />

  // Si hay sesion + PIN configurado, pedir PIN antes de mostrar la app
  if (autenticado && tienePin() && !desbloqueado) {
    return <PinLock modo="verificar" onListo={() => setDesbloqueado(true)} />
  }

  return (
    <ErrorBoundary>
    <ConfirmProvider>
    <Toaster richColors position="top-right" closeButton theme="dark" />
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={autenticado ? <Navigate to="/" replace /> : <PaginaLogin onLogin={login} />}
        />
        <Route path="/" element={<RutaRaiz />}>
          <Route index element={<PaginaPanel />} />
          <Route path="plantas" element={
            <Suspense fallback={null}><PaginaPlantas /></Suspense>
          } />
          <Route path="chat" element={
            <Suspense fallback={null}><PaginaChat /></Suspense>
          } />
          <Route path="tablas" element={
            <Suspense fallback={null}><PaginaTablas /></Suspense>
          } />
          <Route path="sala" element={
            <Suspense fallback={null}><PaginaSala /></Suspense>
          } />
          <Route path="stats" element={
            <Suspense fallback={null}><PaginaEstadisticas /></Suspense>
          } />
          <Route path="registro" element={
            <Suspense fallback={null}><PaginaPacientes /></Suspense>
          } />
          <Route path="geneticas" element={
            <Suspense fallback={null}><PaginaGeneticas /></Suspense>
          } />
          <Route path="asistencia" element={
            <Suspense fallback={null}><PaginaAsistencia /></Suspense>
          } />
          <Route path="stock" element={
            <Suspense fallback={null}><PaginaStockInsumos /></Suspense>
          } />
          <Route path="calendario" element={
            <Suspense fallback={null}><PaginaCalendarioCultivo /></Suspense>
          } />
          <Route path="linea-tiempo" element={
            <Suspense fallback={null}><PaginaLineaTiempo /></Suspense>
          } />
          <Route path="econometria" element={
            <Suspense fallback={null}><PaginaEconometria /></Suspense>
          } />
          <Route path="ambiente" element={
            <Suspense fallback={null}><PaginaAmbiente /></Suspense>
          } />
          <Route path="p/:codigo" element={
            <Suspense fallback={null}><PaginaHistoriaPlanta /></Suspense>
          } />
        </Route>
        <Route path="*" element={<Suspense fallback={<SpinnerCarga texto="Cargando..." />}><Pagina404 /></Suspense>} />
      </Routes>
    </BrowserRouter>
    </ConfirmProvider>
    </ErrorBoundary>
  )
}

export default App
