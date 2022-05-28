"use strict";

import express from "express";
import session from "express-session";
const app = express();
const port = process.env.PORT || 3000;

import connectPgSimple from "connect-pg-simple";
const PostgresStore = connectPgSimple(session);

import passport from "passport";

import * as tickets from "./tickets.js";
import * as db from "./database.js";
import "./authentication.js";

app.use("/static", express.static("static"));  // Static files will be under static/
app.use(express.static("pages"));  // Pages will be under root
app.use("/testing", express.static("pages_testing"));  // Testing pages will be under root

app.use(express.json());

app.use(passport.initialize());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
        pool: db.pgPool
    })
}));

// Request handling

// Log a user in with google
app.get("/login/google", passport.authenticate("google"));

// Log a user in with google (used by Passport.js)
app.get("/oauth2/redirect/google", passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login.html"
}));

// Log out
app.post("/logout", async (request, response) => {
    request.logout(() => {
        response.send({ message: "logged out!" });
    });
});

// Post a new ticket
app.post("/tickets", async (request, response) => {
    const ticket = tickets.makeFromRequest(request);
    if (ticket == null)
    {
        response.json({ message: "Invalid data!" });
    }
    else
    {
        await db.putTicket(ticket);
        response.json({message: "Ticket submitted!"});
    }
});

// Get all active tickets
app.get("/tickets/active", async (request, response) => {
    const activeTickets = await db.getActiveTickets();
    response.json(activeTickets);
});

// Get a specific ticket
app.get("/tickets/:ticket_id(\\d+)", (request, response) => {
    // TODO implement this
    response.send("<h1>TODO</h2> <p>" + JSON.stringify(request.params) + "</p>");
});

// Get the currently logged in user
app.get("/users/me", async (request, response) => {
    if (request.session.passport)
    {
        const user = await db.getUser(request.session.passport.user);
        response.json(user);
    }
    else
    {
        response.json(null);
    }
});

// Get a specific user
app.get("/users/:user_id(\\d+)", async (request, response) => {
    const user = await db.getUser(request.params.user_id);
    response.json(user);
});

app.listen(port, () => {
    console.log("Listening on port " + port);
});
