"use strict";

import express from "express"
import session from "express-session"
const app = express()
const port = process.env.PORT || 3000

import connectPgSimple from "connect-pg-simple"
const PostgresStore = connectPgSimple(session)

import passport from "passport"

import * as tickets from "./tickets.js"
import * as db from "./database.js"
import "./authentication.js"

app.use("/static", express.static("static"))  // Static files will be under static/
app.use(express.static("pages"))  // Pages will be under root

app.use(express.json())

app.use(passport.initialize())

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
        pool: db.pgPool
    })
}))

// Request handling

app.get("/login/google", passport.authenticate("google"))

app.get("/oauth2/redirect/google", passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login.html"
}))

app.post("/logout", async (request, response) => {
    request.logout(() => {
        response.send({ message: "logged out!" })
    }) 
})

app.post("/tickets", async (request, response) => {
    const ticket = tickets.makeFromRequest(request)
    if (ticket == null)
    {
        response.json({ message: "Invalid data!" })
    }
    else
    {
        await db.putTicket(ticket)
        response.json({message: "Ticket submitted!"})
    }
})

app.get("/tickets/active", async (request, response) => {
    const activeTickets = await db.getActiveTickets()
    response.json(activeTickets)
})

// TODO this is just for testing
app.get("/whoami", (request, response) => {
    response.send("<p>" + JSON.stringify(request.session.passport) + "</p>")
})

app.listen(port, () => {
    console.log("Listening on port " + port)
})
