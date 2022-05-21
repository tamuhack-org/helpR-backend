const sqlite3 = require("sqlite3").verbose()

let db = new sqlite3.Database("helpr.db")

db.serialize(() => {
    db.run("CREATE TABLE users (user_id INTEGER, email TEXT, name TEXT, is_admin NUMERIC, resolved_tickets TEXT)")
    db.run("CREATE TABLE tickets (user_id INTEGER, ticket_id INTEGER, ip_hash TEXT, time_opened INTEGER, time_claimed INTEGER, time_resolved INTEGER, description TEXT, location TEXT, contact TEXT, claimant_user_id TEXT, review_description TEXT, review_stars INTEGER)")
})
db.close()
