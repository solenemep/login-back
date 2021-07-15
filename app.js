const fsPromises = require("fs/promises")
const path = require("path")
const express = require("express")
const cors = require("cors")
const { wiki } = require("./wiki")

const LOG_FILE = "logs/access-log.txt"
const ERRLOG_FILE = "logs/error-log.txt"
const LOG_DB = "logs/logs.json"
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
const userChecker = async (req, res, next) => {
  try {
    const username = req.body.username
    const usersJson = await fsPromises.readFile(LOG_DB, "UTF-8")
    const users = JSON.parse(usersJson)
    if (users.hasOwnProperty(username)) {
      next()
    } else {
      res.status(401).send("Username or password invalid")
    }
  } catch (e) {
    res.status(401).send("Something went wrong")
  }
}

// Middleware for checking if password is correct
const passwordChecker = async (req, res, next) => {
  try {
    const username = req.body.username
    const password = req.body.password
    const usersJson = await fsPromises.readFile(LOG_DB, "UTF-8")
    const users = JSON.parse(usersJson)
    if (users[username].password === password) {
      next()
    } else {
      res.status(401).send("Username or password invalid")
    }
  } catch (e) {
    res.status(401).send("Something went wrong")
  }
}

// Middleware to register
const register = async (req, res, next) => {
  try {
    const email = req.body.email
    const username = req.body.username
    const password = req.body.password

    const usersJson = await fsPromises.readFile(LOG_DB, "UTF-8")
    const users = JSON.parse(usersJson)

    users[username] = { email: email, password: password }
    const newUsers = JSON.stringify(users)
    fs.writeFile(LOG_DB, newUsers)
    next()
  } catch (e) {
    res.status(401).send("Cannot be registered")
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
app.use("/signup", register)

app.post("/signup", (req, res) => {
  let username = req.body.username
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
