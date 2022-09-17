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
    ticketsUpdated: "tickets updated",
    usersUpdated: "users updated"
};

// Corny JavaScript won't let me do this manually from another module
export function AnnounceNewUser ()
{
    socket_io.emit(sioMessages.usersUpdated);
}

import * as tickets from "./tickets.js";
import * as db from "./database.js";
import * as auth from "./authentication.js";

const uuid_regex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

app.use("/static", express.static("static"));  // Static files will be under static/
app.use(express.static("pages_testing"));  // Testing pages will be under root

app.use(cors());
app.use(express.json());

// Request handling

// Post a new ticket
app.post("/tickets", async (request, response) => {
    const author = await auth.getOrMakeUser(request);
    const ticket = tickets.makeFromRequest(request, author);
    if (ticket && author && author.currently_opened_ticket_id == null && !author.is_silenced)
    {
        await db.putTicket(ticket, author);
        socket_io.emit(sioMessages.ticketsUpdated);
        response.json({message: "Ticket submitted!"});
    }
    else
    {
        response.sendStatus(401);
    }
});

// Get all tickets
app.get("/tickets/all", async (request, response) => {
    const allTickets = await db.getAllTickets();
    response.json(allTickets);
});

// Get all unclaimed tickets
app.get("/tickets/unclaimed", async (request, response) => {
    const unclaimedTickets = await db.getUnclaimedTickets();
    response.json(unclaimedTickets);
});

// Get all claimed tickets
app.get("/tickets/claimed", async (request, response) => {
    const claimedTickets = await db.getClaimedTickets();
    response.json(claimedTickets);
});

// Get all claimed and unresolved tickets
app.get("/tickets/claimedunresolved", async (request, response) => {
    const claimedTickets = await db.getClaimedUnresolvedTickets();
    response.json(claimedTickets);
});

// Get all unresolved tickets (previously known as "active" tickets)
app.get("/tickets/unresolved", async (request, response) => {
    const unresolvedTickets = await db.getUnresolvedTickets();
    response.json(unresolvedTickets);
});

// Get all resolved tickets
app.get("/tickets/resolved", async (request, response) => {
    const resolvedTickets = await db.getResolvedTickets();
    response.json(resolvedTickets);
});

// Get a specific ticket
app.get("/tickets/:ticket_id(" + uuid_regex + ")", async (request, response) => {
    const ticket = await db.getTicket(request.params.ticket_id);
    response.json(ticket);
});

// Claim a ticket (mentors only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/claim", async (request, response) => {
    const claimant_user = await auth.getOrMakeUser(request);
    const success = await db.claimTicket(request.params.ticket_id, claimant_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        socket_io.emit(sioMessages.usersUpdated);
        return;
    }
    else
    {
        response.sendStatus(400);
        return;
    }
});

// Unclaim a ticket (mentor who is claimant only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/unclaim", async (request, response) => {
    const claimant_user = await auth.getOrMakeUser(request);
    const success = await db.unclaimTicket(request.params.ticket_id, claimant_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        socket_io.emit(sioMessages.usersUpdated);
        return;
    }
    else
    {
        response.sendStatus(400);
        return;
    }
});

// Resolve a ticket (mentor who is claimant OR ticket author)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/resolve", async (request, response) => {
    const resolving_user = await auth.getOrMakeUser(request);
    const success = await db.resolveTicket(request.params.ticket_id, resolving_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        socket_io.emit(sioMessages.usersUpdated);
        return;
    }
    else
    {
        response.sendStatus(400);
        return;
    }
});

// Unresolve a ticket (mentor who is claimant OR ticket author)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/unresolve", async (request, response) => {
    const unresolving_user = await auth.getOrMakeUser(request);
    const success = await db.unresolveTicket(request.params.ticket_id, unresolving_user);
    if (success)
    {
        response.json(true);
        socket_io.emit(sioMessages.ticketsUpdated);
        socket_io.emit(sioMessages.usersUpdated);
        return;
    }
    else
    {
        response.sendStatus(400);
        return;
    }
});

// Get all users
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

// Get all admins
app.get("/users/admins", async (request, response) => {
    const admins = await db.getAdmins();
    response.json(admins);
});

// Get the currently logged in user
app.get("/users/me", async (request, response) => {
    const user = await auth.getOrMakeUser(request);
    response.json(user);
});

// Get a specific user
app.get("/users/:user_id(" + uuid_regex + ")", async (request, response) => {
    const user = await db.getUser(request.params.user_id);
    response.json(user);
});

// Make a user an admin (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/adminstatus", async (request, response) => {
    const requestingUser = await auth.getOrMakeUser(request);
    const ticket_request = request.body;

    if (requestingUser && requestingUser.is_admin && ticket_request.status != null && requestingUser.user_id != request.params.user_id)  // One cannot change their own admin status
    {
        const success = await db.setUserAdminStatus(request.params.user_id, ticket_request.status);
        if (success)
        {
            response.json(true);
            socket_io.emit(sioMessages.usersUpdated);
            return;
        }
        else
        {
            response.sendStatus(400);
            return;
        }
    }
    else
    {
        response.sendStatus(401);
    }
});

// Make a user a mentor (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/mentorstatus", async (request, response) => {
    const requestingUser = await auth.getOrMakeUser(request);
    const ticket_request = request.body;

    if (requestingUser && requestingUser.is_admin && ticket_request.status != null)
    {
        const success = await db.setUserMentorStatus(request.params.user_id, ticket_request.status);
        if (success)
        {
            response.json(true);
            socket_io.emit(sioMessages.usersUpdated);
            return;
        }
        else
        {
            response.sendStatus(400);
            return;
        }
    }
});

server.listen(port, () => {
    console.log("Listening on port " + port);
});
