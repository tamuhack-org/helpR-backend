const express = require("express")
const app = express()
const port = process.env.PORT || 3000

const tickets = require("./tickets")
const db = require("./database")


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
        console.log(tickets)
        response.json(tickets)
    })
})

app.listen(port, () => {
    console.log("Listening on port " + port)
})
