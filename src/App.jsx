import { useState, useEffect, useCallback } from 'react'

const TB_EMAIL    = 'e.toro02@ufromail.cl'
const TB_PASSWORD = 'sunnychu22'
const DEVICE_ID   = '9b2a6370-650e-11f1-9525-1307703428de'
// ─────────────────────────────────────────────────────────────

const API = '/api'

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TB_EMAIL, password: TB_PASSWORD }),
  })
  if (!res.ok) throw new Error('Login fallido. Revisa tus credenciales.')
  const { token, refreshToken } = await res.json()
  return { token, refreshToken }
}

async function refreshToken(oldToken, refToken) {
  const res = await fetch(`${API}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${oldToken}`,
    },
    body: JSON.stringify({ refreshToken: refToken }),
  })
  if (!res.ok) return login() 
  const { token, refreshToken: newRefresh } = await res.json()
  return { token, refreshToken: newRefresh }
}

async function fetchTelemetry(token, keys) {
  const url = `${API}/plugins/telemetry/DEVICE/${DEVICE_ID}/values/timeseries?keys=${keys.join('%2C')}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('No se pudo obtener la telemetría.')
  return res.json()
}

function parseTelemetry(raw) {
  const get = (key) => {
    const arr = raw[key]
    return arr && arr.length ? parseFloat(arr[0].value) : null
  }
  return {
    co2:         get('co2'),
    ruido:       get('ruido'),
    temperatura: get('temperatura'),
    humedad:     get('humedad'),
    aforo:       get('aforo') !== null ? Math.round(get('aforo')) : null,
  }
}

const CAPACIDAD_MAX = 120

function aforoInfo(personas) {
  if (personas === null) return { pct: 0, label: '--', cls: 'green' }
  const pct = Math.round((personas / CAPACIDAD_MAX) * 100)
  if (pct < 50)  return { pct, label: 'Espacio disponible', cls: 'green' }
  if (pct < 85)  return { pct, label: 'Casi lleno',         cls: 'orange' }
  return           { pct, label: 'Saturado',               cls: 'red' }
}

function sensorStatus(key, value) {
  if (value === null) return 'ok'
  if (key === 'co2') {
    if (value > 1500) return 'alert'
    if (value > 1000) return 'warn'
    return 'ok'
  }
  if (key === 'ruido') {
    if (value > 80) return 'alert'
    if (value > 60) return 'warn'
    return 'ok'
  }
  return 'ok'
}

const STATUS_LABEL = { ok: 'Óptimo', warn: 'Moderado', alert: 'Alto' }

function alertaGlobal(data) {
  const { co2, ruido, aforo } = data
  const pct = aforo !== null ? Math.round((aforo / CAPACIDAD_MAX) * 100) : 0

  if (pct >= 85)
    return { cls: 'danger', icon: '🚫', title: 'Biblioteca saturada', msg: 'El aforo es máximo. Considera ir a otra sala o volver más tarde.' }
  if (co2 > 1500 || ruido > 80)
    return { cls: 'warn', icon: '⚠️', title: 'Ambiente no ideal', msg: 'El nivel de CO₂ o ruido está elevado. Si puedes, cambia de sala.' }
  return { cls: 'ok', icon: '✓', title: 'Ambiente óptimo para el estudio', msg: 'Buen aforo, aire limpio y silencio. Es un gran momento para concentrarte aquí.' }
}

function AforoRing({ pct, cls }) {
  const r = 68
  const circ = 2 * Math.PI * r
  const filled = circ * (pct / 100)
  const colorMap = { green: '#2EC47A', orange: '#F59E0B', red: '#EF4444' }
  const color = colorMap[cls] || '#2EC47A'

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#E8EEF4" strokeWidth="14" />
      <circle
        cx="80" cy="80" r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function SensorCard({ icon, label, value, unit, status, bgColor }) {
  return (
    <div className="sensor-card">
      <div className="sensor-top">
        <div className="sensor-icon" style={{ background: bgColor }}>{icon}</div>
        <span className={`sensor-status status-${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="sensor-label">{label}</div>
      <div className="sensor-value">
        {value !== null ? value.toFixed(value < 10 ? 1 : 0) : '--'}
        <sub> {unit}</sub>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth]     = useState(null)   // { token, refreshToken }
  const [data, setData]     = useState(null)   // telemetría parseada
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    login()
      .then(setAuth)
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!auth) return
    const id = setInterval(async () => {
      try {
        const newAuth = await refreshToken(auth.token, auth.refreshToken)
        setAuth(newAuth)
      } catch { /* se intentará en el próximo ciclo */ }
    }, 13 * 60 * 1000)
    return () => clearInterval(id)
  }, [auth])

  const fetchData = useCallback(async (tkn) => {
    setLoading(true)
    setError(null)
    try {
      const keys = ['co2', 'ruido', 'temperatura', 'humedad', 'aforo']
      const raw  = await fetchTelemetry(tkn, keys)
      setData(parseTelemetry(raw))
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auth?.token) fetchData(auth.token)
  }, [auth, fetchData])

  useEffect(() => {
    if (!auth?.token) return
    const id = setInterval(() => fetchData(auth.token), 30_000)
    return () => clearInterval(id)
  }, [auth, fetchData])

  const aforoData = data ? aforoInfo(data.aforo) : { pct: 0, label: '--', cls: 'green' }
  const alerta    = data ? alertaGlobal(data) : null

  return (
    <div className="phone">
      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-icon">🔇</div>
            Silence as a Service
          </div>
          <div className="badge-live">EN VIVO</div>
        </div>
        <h1>Biblioteca Central</h1>
        <p>Piso 1 · Sala de lectura</p>
      </div>

      {/* Refresh row */}
      <div className="refresh-row">
        <small>
          {lastUpdate
            ? `Actualizado ${lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
            : 'Cargando...'}
        </small>
        <button
          className="btn-refresh"
          disabled={loading}
          onClick={() => auth && fetchData(auth.token)}
        >
          {loading ? 'Actualizando...' : '↻ Actualizar'}
        </button>
      </div>

      {/* Estados */}
      {error && (
        <div className="error-box">
          ⚠️ {error}
          <br />
          <small>Revisa tu conexión o las credenciales en App.jsx</small>
        </div>
      )}

      {loading && !data && (
        <div className="loading">
          <div className="spinner" />
          <span>Conectando a ThingsBoard...</span>
        </div>
      )}

      {data && (
        <>
          {/* Aforo */}
          <div className="card aforo-card">
            <div className="aforo-top">
              <span>Aforo actual</span>
              <span className={`aforo-badge ${aforoData.cls}`}>{aforoData.label}</span>
            </div>
            <div className="aforo-ring-wrap">
              <AforoRing pct={aforoData.pct} cls={aforoData.cls} />
              <div className="aforo-center">
                <div className="aforo-pct">
                  {aforoData.pct}<span>%</span>
                </div>
                <div className="aforo-sub">
                  {data.aforo ?? '--'} de {CAPACIDAD_MAX} personas
                </div>
              </div>
            </div>
          </div>

          {/* Grilla sensores */}
          <div className="grid-2">
            <SensorCard
              icon="🌿" label="CO₂"
              value={data.co2} unit="ppm"
              status={sensorStatus('co2', data.co2)}
              bgColor="#E8F8EF"
            />
            <SensorCard
              icon="🔊" label="Ruido"
              value={data.ruido} unit="dB"
              status={sensorStatus('ruido', data.ruido)}
              bgColor="#EEF0FB"
            />
            <SensorCard
              icon="🌡️" label="Temperatura"
              value={data.temperatura} unit="°C"
              status="ok"
              bgColor="#EBF5FB"
            />
            <SensorCard
              icon="💧" label="Humedad"
              value={data.humedad} unit="%"
              status="ok"
              bgColor="#E8F8EF"
            />
          </div>

          {/* Alerta global */}
          {alerta && (
            <div className={`alert-card ${alerta.cls}`}>
              <div className={`alert-icon ${alerta.cls}`}>{alerta.icon}</div>
              <div className="alert-text">
                <strong>{alerta.title}</strong>
                <p>{alerta.msg}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
