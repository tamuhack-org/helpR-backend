"use strict";

import express from "express";
import { createServer } from "http";
import cors from "cors";
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

import { Server } from "socket.io";
const socket_io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});

const sioMessages = {
    ticketsUpdated: "tickets updated"
};


import * as tickets from "./tickets.js";
import * as db from "./database.js";

const uuid_regex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

app.use("/static", express.static("static"));  // Static files will be under static/
app.use(express.static("pages_testing"));  // Testing pages will be under root

app.use(cors());
app.use(express.json());

// Request handling

// Log a user in with google
app.get("/login/google", (request, response) => {
    response.send("<h1>Authentication has been temporarily disabled. There is no need to log in.</h1>");
});

// Log a user in with google (used by Passport.js)
app.get("/oauth2/redirect/google", (request, response) => {
    response.send("<h1>Authentication has been temporarily disabled. There is no need to log in.</h1>");
});

// Log out
app.post("/logout", async (request, response) => {
    response.send("<h1>Authentication has been temporarily disabled. There is no need to log out.</h1>");
});

// Post a new ticket
app.post("/tickets", async (request, response) => {
    const author = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    const ticket = tickets.makeFromRequest(request, author);
    if (ticket && author && !author.is_silenced)
    {
        await db.putTicket(ticket, author);
        socket_io.emit(sioMessages.ticketsUpdated);
        response.json({message: "Ticket submitted!"});
    }
    else
    {
        response.json({ message: "Invalid data!" });
    }
});

// Get all tickets
app.get("/tickets/all", async (request, response) => {
    const allTickets = await db.getAllTickets();
    response.json(allTickets);
});

// Get all active tickets
app.get("/tickets/active", async (request, response) => {
    const activeTickets = await db.getActiveTickets();
    response.json(activeTickets);
});

// Get a specific ticket
app.get("/tickets/:ticket_id(" + uuid_regex + ")", async (request, response) => {
    const ticket = await db.getTicket(request.params.ticket_id);
    response.json(ticket);
});

// Claim a ticket (mentors only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/claim", async (request, response) => {
    const claimant_user = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    const success = await db.claimTicket(request.params.ticket_id, claimant_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        return;
    }
    else
    {
        response.sendStatus(404);
        return;
    }
});

// Unclaim a ticket (mentor who is claimant only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/unclaim", async (request, response) => {
    const claimant_user = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    const success = await db.unclaimTicket(request.params.ticket_id, claimant_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        return;
    }
    else
    {
        response.sendStatus(404);
        return;
    }
});

// Resolve a ticket (mentor who is claimant only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/resolve", async (request, response) => {
    const claimant_user = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");;
    const success = await db.resolveTicket(request.params.ticket_id, claimant_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        return;
    }
    else
    {
        response.sendStatus(404);
        return;
    }
});

// Get all users (admins only)
app.get("/users/all", async (request, response) => {
    const allUsers = await db.getAllUsers();
    response.json(allUsers);
    return;
});

// Get all mentors
app.get("/users/mentors", async (request, response) => {
    const mentors = await db.getMentors();
    response.json(mentors);
});

// Get the currently logged in user
app.get("/users/me", async (request, response) => {
    const user = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    response.json(user);
});

// Get a specific user
app.get("/users/:user_id(" + uuid_regex + ")", async (request, response) => {
    const user = await db.getUser(request.params.user_id);
    response.json(user);
});

// Make a user an admin (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/adminstatus", async (request, response) => {
    const requestingUser = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    const ticket_request = request.body;

    if (requestingUser && requestingUser.is_admin && ticket_request.status != null)
    {
        const success = await db.setUserAdminStatus(request.params.user_id, ticket_request.status);
        if (success)
        {
            response.json(true);
            socket_io.emit(sioMessages.ticketsUpdated);
            return;
        }
        else
        {
            response.sendStatus(404);
            return;
        }
    }
});

// Make a user a mentor (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/mentorstatus", async (request, response) => {
    const requestingUser = await db.getUser("7d90c244-951b-430d-8a6a-7eae0afefb48");
    const ticket_request = request.body;

    if (requestingUser && requestingUser.is_admin && ticket_request.status != null)
    {
        const success = await db.setUserMentorStatus(request.params.user_id, ticket_request.status);
        if (success)
        {
            response.json(true);
            socket_io.emit(sioMessages.ticketsUpdated);
            return;
        }
        else
        {
            response.sendStatus(404);
            return;
        }
    }
});

server.listen(port, () => {
    console.log("Listening on port " + port);
});
