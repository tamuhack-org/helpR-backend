module.exports = {
    makeFromRequest
}

const crypto = require("crypto")
const db = require("./database.js")

function makeFromRequest(request)
{
    let ticket = request.body
    // TODO complain if there isn't a $description, $location, and $contact
    // TODO complain if description, location, or contact are too long (>50 characters)

    let ticketId = 0
    do
    {
        ticketId = Math.floor(Math.random() * 4294967296) - 2147483648
    }
    while (db.contains("tickets", "ticketId", ticketId))
    ticket.$ticketId = ticketId

    // TODO don't store ips
    ticket.$ipHash = crypto.createHash("sha256").update(request.ip).digest("hex")

    // TODO replace with actual functionality; this is for debugging purposes
    ticket.$userId = 12345

    ticket.$timeOpened = Date.now()

    return ticket
}
