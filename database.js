module.exports = {
    putTicket,
    contains,
    getActiveTickets
}

const sqlite3 = require("sqlite3").verbose()
let db = new sqlite3.Database("helpr.db")


function putTicket (ticket, callback)
{
    console.log(ticket)

    db.serialize(() => {
        db.run("INSERT INTO tickets VALUES ($userId, $ticketId, $ipHash, $timeOpened, NULL, NULL, $description, $location, $contact, NULL, NULL, NULL)", ticket)

        callback()
    })    
}

function getActiveTickets (callback)
{
    db.serialize(() => {
        db.all("SELECT * FROM tickets WHERE time_claimed IS NULL", (error, rows) => {
            callback(rows)
        })
    }) 
}

function contains (table, column, value)
{
    // TODO return true if something exists in the database
    // something something SELECT * FROM table WHERE column = value

    return
}
