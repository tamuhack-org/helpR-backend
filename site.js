"use strict";

import express from "express"
const app = express()
const port = process.env.PORT || 3000

import * as tickets from "./tickets.js"
import * as db from "./database.js"


app.use("/static", express.static("static"))  // Static files will be under static/
app.use(express.static("pages"))  // Pages will be under root

app.use(express.json())

app.post("/tickets", async (request, response) => {
    const ticket = tickets.makeFromRequest(request)
    if (ticket == null)
    {
        response.json({message: "Invalid data!"})
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

app.listen(port, () => {
    console.log("Listening on port " + port)
})
