require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDb } = require('./db/init')

const merchantRoutes = require('./routes/merchant')
const generateRoutes = require('./routes/generate')
const externalRoutes = require('./routes/external')
const keyRoutes = require('./routes/keys')
const embedRoutes = require('./routes/embed')
const planRoutes = require('./routes/plan')
const adminRoutes = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

// API routes
app.use('/api', merchantRoutes)
app.use('/api', generateRoutes)
app.use('/api', externalRoutes)
app.use('/api', keyRoutes)
app.use('/api', embedRoutes)
app.use('/api', planRoutes)

app.use('/api', adminRoutes)

// Static pages (order matters: specific before catch-all)
app.use('/dashboard', express.static(path.join(__dirname, 'public')))
app.use('/admin', express.static(path.join(__dirname, 'public')))
app.use('/api-docs', express.static(path.join(__dirname, 'public')))

// Landing page (built SPA, served at root)
const landingDist = path.join(__dirname, '..', 'landing', 'dist')
app.use('/', express.static(landingDist))

// Health check (must be before catch-all)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Debug: env check
app.get('/api/debug', (req, res) => {
  res.json({
    DEEPSEEK: process.env.DEEPSEEK_API_KEY ? 'SET (' + process.env.DEEPSEEK_API_KEY.slice(0,8) + '...)' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT,
  })
})


// SPA fallback: vue-router history mode
app.get('*', (req, res) => {
  const indexPath = path.join(landingDist, 'index.html')
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ error: 'Not found' })
  }
})

async function start() {
  await initDb()
  app.listen(PORT, () => {
    console.log(`\n🚀 差评自动回复生成器 SaaS`)
    console.log(`   API:      http://localhost:${PORT}/api`)
    console.log(`   Dashboard: http://localhost:${PORT}/dashboard/dashboard.html`)
    console.log(`   Landing:   http://localhost:5173 (npm run dev in landing/)`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
