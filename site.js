"use strict";

import express from "express";
import session from "express-session";
import { createServer } from "http";
import cors from "cors";
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

const uuid_regex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

app.use("/static", express.static("static"));  // Static files will be under static/
app.use(express.static("pages_testing"));  // Testing pages will be under root

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
        pool: db.pgPool
    })
})

app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use(sessionMiddleware);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
socket_io.use(wrap(sessionMiddleware));
socket_io.use(wrap(passport.initialize()));
socket_io.use(wrap(passport.session()));

socket_io.use((socket, next) => {
    if (socket.request.user)
    {
        next();
    }
    else
    {
        next(new Error("Unauthorized"));
    }
});

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
app.get("/tickets/:ticket_id(" + uuid_regex + ")", async (request, response) => {
    const ticket = await db.getTicket(request.params.ticket_id);
    response.json(ticket);
});

// Claim a ticket (mentors only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/claim", async (request, response) => {
    if (request.session.passport)
    {
        const claimant_user = await db.getUser(request.session.passport.user);
        if (claimant_user && claimant_user.is_mentor)
        {
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
        }
    }
    response.sendStatus(403);
});

// Resolve a ticket (mentor who is claimant only)
app.post("/tickets/:ticket_id(" + uuid_regex + ")/resolve", async (request, response) => {
    if (request.session.passport)
    {
        const claimant_user = await db.getUser(request.session.passport.user);
        if (claimant_user && claimant_user.is_mentor)
        {
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
        }
    }
    response.sendStatus(403);
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

// Get all mentors
app.get("/users/mentors", async (request, response) => {
    const mentors = await db.getMentors();
    response.json(mentors);
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
app.get("/users/:user_id(" + uuid_regex + ")", async (request, response) => {
    const user = await db.getUser(request.params.user_id);
    response.json(user);
});

// Make a user an admin (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/adminstatus", async (request, response) => {
    if (request.session.passport)
    {
        const requestingUser = await db.getUser(request.session.passport.user);
        const ticket_request = request.body;

        if (requestingUser && requestingUser.is_admin && ticket_request.admin_status != null && ticket_request.admin_status)  // Someone's admin status cannot be revoked, send 403 Forbidden if someone tries to do that
        {
            const success = await db.setUserAdminStatus(request.params.user_id, true);
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
    }
    response.sendStatus(403);
});

// Make a user a mentor (admins only)
app.post("/users/:user_id(" + uuid_regex + ")/mentorstatus", async (request, response) => {
    if (request.session.passport)
    {
        const requestingUser = await db.getUser(request.session.passport.user);
        const ticket_request = request.body;

        if (requestingUser && requestingUser.is_admin && ticket_request.mentor_status != null)
        {
            const success = await db.setUserMentorStatus(request.params.user_id, ticket_request.mentor_status);
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
    }
    response.sendStatus(403);
});

// TODO hoy hoy doy doy helpR should track how many mentors are online but it's too hard for my small brain
// https://github.com/socketio/socket.io/blob/master/examples/passport-example/index.js
// https://socket.io/docs/v4/middlewares/#compatibility-with-express-middleware
socket_io.on("connection", async (socket) => {
    const session = socket.request.session;
    session.socketId = socket.id;
    session.save();

    socket.on("disconnect", async () => {
        if (socket.request.user && socket.request.user.is_mentor)
        {
            // This doesn't reliably update in the database for some reason
            // When mentors close all their tabs, the database might still say they have 2 active connections or something

            // const user = await db.getUser(socket.request.user.user_id);
            // user.mentors_active_connections--;
            // await db.userRepository.save(user);
        }
    });

    if (socket.request.user && socket.request.user.is_mentor)
    {
        // const user = await db.getUser(socket.request.user.user_id);
        // user.mentors_active_connections++;
        // await db.userRepository.save(user);
    }
});

server.listen(port, () => {
    console.log("Listening on port " + port);
});
