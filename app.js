const fsPromises = require("fs/promises")
const path = require("path")
const express = require("express")
const cors = require("cors")
const { wiki } = require("./wiki")
const { db_user } = require("./logs/logs")

const LOG_FILE = "logs/access-log.txt"
const ERRLOG_FILE = "logs/error-log.txt"
const LOG_DB = "logs/logs.js"
const IP_LOOPBACK = "localhost"
const IP_LOCAL = "192.168.0.10" // my local ip on my network
const PORT = 3333

// timer middleware
const timer = (req, res, next) => {
  const date = new Date()
  req.requestDate = date.toUTCString()
  next()
}

// logger middleware
const logger = async (req, res, next) => {
  try {
    const log = `${req.requestDate} ${req.method} "${req.originalUrl}" from ${req.ip} ${req.headers["user-agent"]}\n`
    await fsPromises.appendFile(LOG_FILE, log, "utf-8")
  } catch (e) {
    const log = `${req.requestDate} ${req.method} "${req.originalUrl}" from ${req.ip} ${req.headers["user-agent"]}\n`
    await fsPromises.appendFile(ERRLOG_FILE, log, "utf-8")
  } finally {
    next()
  }
}

// shower middleware
const shower = async (req, res, next) => {
  const log = `${req.requestDate} ${req.method} "${req.originalUrl}" from ${req.ip} ${req.headers["user-agent"]}`
  console.log(log)
  next()
}

// Middleware for checking if user exists
const userChecker = (req, res, next) => {
  const username = req.body.username
  if (db_user.hasOwnProperty(username)) {
    next()
  } else {
    res.status(401).send("Username or password invalid.")
  }
}

// Middleware for checking if password is correct
const passwordChecker = (req, res, next) => {
  const username = req.body.username
  const password = req.body.password
  if (db_user[username] === password) {
    next()
  } else {
    res.status(401).send("Username or password invalid.")
  }
}

const app = express()

app.use(express.urlencoded({ extended: false })) // to support URL-encoded bodies
app.use(express.json()) // to support JSON-encoded bodies
app.use(cors())
app.use(timer)
app.use(logger)
app.use(shower)
app.use("/wiki", wiki)
//serve our static files from public directory at "/" route
app.use(express.static(path.join(__dirname, "build")))
// Configure express to use these 2 middlewares for /login route only
app.use("/login", userChecker)
app.use("/login", passwordChecker)

app.post("/signup", (req, res) => {
  let username = req.body.username
  let password = req.body.password
  db_user[username] = password
  res.send({ message: `You registered with username ${username}` })
})

app.post("/login", (req, res) => {
  let username = req.body.username
  res.send({ message: `You are logged in with username ${username}` })
})

// start the server
app.listen(PORT, IP_LOOPBACK, () => {
  console.log(`Example app listening at http://${IP_LOOPBACK}:${PORT}`)
})
