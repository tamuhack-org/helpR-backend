"use strict";

import express from "express";
import session from "express-session";
import { createServer } from "http";
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

import { Server } from "socket.io";
const socket_io = new Server(server);
const sioMessages = {
    ticketsUpdated: "tickets updated"
};

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
    if (request.session.passport)
    {
        const author = await db.getUser(request.session.passport.user);
        const ticket = tickets.makeFromRequest(request, author);
        if (ticket)
        {
            await db.putTicket(ticket, author);
            socket_io.emit(sioMessages.ticketsUpdated);
            response.json({message: "Ticket submitted!"});
        }
        else
        {
            response.json({ message: "Invalid data!" });
        }
    }
    else
    {
        response.sendStatus(401);
    }
});

// Get all tickets (admins only)
app.get("/tickets/all", async (request, response) => {
    if (request.session.passport)
    {
        const user = await db.getUser(request.session.passport.user);
        if (user.is_admin)
        {
            const allTickets = await db.getAllTickets();
            response.json(allTickets);
            return;
        }
    }
    response.sendStatus(403);
});

// Get all active tickets
app.get("/tickets/active", async (request, response) => {
    const activeTickets = await db.getActiveTickets();
    response.json(activeTickets);
});

// Get a specific ticket
app.get("/tickets/:ticket_id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", async (request, response) => {
    const user = await db.getTicket(request.params.ticket_id);
    response.json(user);
});

// Get all users (admins only)
app.get("/users/all", async (request, response) => {
    if (request.session.passport)
    {
        const user = await db.getUser(request.session.passport.user);
        if (user && user.is_admin)
        {
            const allUsers = await db.getAllUsers();
            response.json(allUsers);
            return;
        }
    }
    response.sendStatus(403);
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
app.get("/users/:user_id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", async (request, response) => {
    const user = await db.getUser(request.params.user_id);
    response.json(user);
});

// TODO this is temporary, delete this later
// socket_io.on("connection", (socket) => {
//     console.log("user " + socket.id + "connected");
// });

server.listen(port, () => {
    console.log("Listening on port " + port);
});
