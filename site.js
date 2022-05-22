"use strict";

import express from "express"
const app = express()
const port = process.env.PORT || 3000

import * as tickets from "./tickets.js"
import * as db from "./database.js"


app.use("/static", express.static("static"))
app.use(express.static("pages"))

app.use(express.json())

app.post("/tickets", (request, response) => {
    let ticket = tickets.makeFromRequest(request)
    db.putTicket(ticket, () =>
    {
        response.json({message: "Ticket submitted!"})
    })
})

app.get("/tickets/active", (request, response) => {
    db.getActiveTickets((tickets) => {
        response.json(tickets)
    })
})

app.listen(port, () => {
    console.log("Listening on port " + port)
})
