"use strict";

import "reflect-metadata";
import { EntitySchema, DataSource, IsNull, Not } from "typeorm";

import { config as dotenv_config } from "dotenv";
dotenv_config();

import pg from "pg";
export const pgPool = new pg.Pool({  // Only use this when absolutely needed, use TypeORM otherwise
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Corny JavaScript won't let me import this from another module
const statusMessages = {
    doesNotExist: 404,
    unauthorized: 401,
    badRequest: 400,
    success: 200
};

// Database entities

const User = new EntitySchema ({
    name: "User",
    tableName: "users",
    columns: {
        user_id: { type: "uuid", primary: true, generated: "uuid" },
        email: { type: "text" },
        name: { type: "text" },
        is_admin: { type: "boolean", default: "false" },
        is_mentor: { type: "boolean", default: "false" },
        is_silenced: { type: "boolean", default: "false" },
        time_created: { type: "timestamp with time zone" },
        currently_opened_ticket_id: { type: "uuid", nullable: true },
        currently_claimed_ticket_id: { type: "uuid", nullable: true }
    },
    relations: {
        opened_tickets: {
            target: "Ticket",
            type: "one-to-many",
            inverseSide: "author"
        },
        claimed_tickets: {
            target: "Ticket",
            type: "one-to-many",
            inverseSide: "claimant"
        }
    }
});

const Ticket = new EntitySchema ({
    name: "Ticket",
    tableName: "tickets",
    columns: {
        ticket_id: { type: "uuid", primary: true, generated: "uuid" },
        time_opened: { type: "timestamp with time zone" },
        time_claimed: { type: "timestamp with time zone", nullable: true },
        time_resolved: { type: "timestamp with time zone", nullable: true },
        time_last_updated: { type: "timestamp with time zone" },
        description: { type: "text" },
        location: { type: "text" },
        contact: { type: "text" },
        review_description: { type: "text", nullable: true },
        review_stars: { type: "integer", nullable: true }
    },
    relations: {
        author: {
            target: "User",
            type: "many-to-one"
        },
        claimant: {
            target: "User",
            type: "many-to-one",
            nullable: true
        }
    }
});

// Database DataSource

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [User, Ticket],
    synchronize: true
});

export const userRepository = AppDataSource.getRepository(User);
export const ticketRepository = AppDataSource.getRepository(Ticket);

// Functions

export async function initializeDatabase ()
{
    await AppDataSource.initialize();
}

export async function putTicket (ticket, author)
{
    ticket = await ticketRepository.save(ticket);
    author.currently_opened_ticket_id = ticket.ticket_id;
    author.opened_tickets.push(ticket);
    await userRepository.save(author);
}

export async function getAllTickets ()
{
    const allTickets = await ticketRepository.find({
        relations: {
            author: true,
            claimant: true
        }
    });
    return allTickets;
}

export async function getUnclaimedTickets ()
{
    const unclaimedTickets = await ticketRepository.find({
        where: {
            time_claimed: IsNull()
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return unclaimedTickets;
}

export async function getClaimedTickets ()
{
    const claimedtickets = await ticketRepository.find({
        where: {
            time_claimed: Not(IsNull())
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return claimedtickets;
}

export async function getClaimedUnresolvedTickets ()
{
    const claimedUnresolvedtickets = await ticketRepository.find({
        where: {
            time_claimed: Not(IsNull()),
            time_resolved: IsNull()
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return claimedUnresolvedtickets;
}

export async function getUnresolvedTickets ()
{
    const unresolvedTickets = await ticketRepository.find({
        where: {
            time_resolved: IsNull()
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return unresolvedTickets;
}

export async function getResolvedTickets ()  // Previously known as "active" tickets
{
    const resolvedTickets = await ticketRepository.find({
        where: {
            time_resolved: Not(IsNull())
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return resolvedTickets;
}


export async function getTicket (ticket_id)
{
    const ticket = await ticketRepository.findOne({
        where: {
            ticket_id: ticket_id
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return ticket;
}

export async function claimTicket (ticket_id, claimant)
{
    let ticket = await getTicket(ticket_id);
    if (ticket == null)
    {
        return statusMessages.doesNotExist;
    }
    else if (claimant == null || claimant.is_mentor == false)
    {
        return statusMessages.unauthorized;
    }
    else if (claimant.currently_claimed_ticket_id != null || ticket.time_claimed != null)
    {
        return statusMessages.badRequest;
    }
    else
    {
        ticket.claimant = claimant;
        ticket.time_claimed = () => "CURRENT_TIMESTAMP";
        ticket.time_last_updated = () => "CURRENT_TIMESTAMP";
        ticket = await ticketRepository.save(ticket); 
        
        let updatedClaimant = await getUser(claimant.user_id);
        updatedClaimant.currently_claimed_ticket_id = ticket_id;
        await userRepository.save(updatedClaimant);

        return statusMessages.success;
    }
}

export async function unclaimTicket (ticket_id, claimant)
{
    let ticket = await getTicket(ticket_id);
    if (ticket == null)  // Users can still unclaim a ticket if they are no longer a mentor, I guess
    {
        return statusMessages.doesNotExist;
    }
    else if (claimant == null)
    {
        return statusMessages.unauthorized;
    }
    else if (ticket.time_claimed == null)
    {
        return statusMessages.badRequest;
    }
    else if (ticket.claimant.user_id == claimant.user_id)
    {
        ticket.claimant = null;
        ticket.time_claimed = null;
        ticket.time_last_updated = () => "CURRENT_TIMESTAMP";
        claimant.claimed_tickets.splice(claimant.claimed_tickets.indexOf(ticket), 1);  // Remove the ticket from the claimant's list of claimed tickets
        claimant.currently_claimed_ticket_id = null;
        ticket = await ticketRepository.save(ticket);

        let updatedClaimant = await getUser(claimant.user_id);
        updatedClaimant.currently_claimed_ticket_id = null;
        await userRepository.save(updatedClaimant);

        return statusMessages.success;
    }
    else
    {
        return statusMessages.badRequest;
    }
}

export async function resolveTicket (ticket_id, resolving_user)
{
    let ticket = await getTicket(ticket_id);
    if (ticket == null)  
    {
        return statusMessages.doesNotExist;
    }
    else if (resolving_user == null)  // Users can still resolve a claimed ticket if they are no longer a mentor, I guess
    {
        return statusMessages.unauthorized;
    }
    else if (ticket.time_resolved != null)
    {
        return statusMessages.badRequest;
    }
    else if ((ticket.claimant && ticket.claimant.user_id == resolving_user.user_id) || ticket.author.user_id == resolving_user.user_id)
    {
        ticket.time_resolved = () => "CURRENT_TIMESTAMP";
        ticket.time_last_updated = () => "CURRENT_TIMESTAMP";
        ticket = await ticketRepository.save(ticket); 

        let author = await getUser(ticket.author.user_id); 
        author.currently_opened_ticket_id = null;
        await userRepository.save(author);
        if (ticket.claimant)
        {
            let claimant = await getUser(ticket.claimant.user_id);
            claimant.currently_claimed_ticket_id = null;
            await userRepository.save(claimant);
        }

        return statusMessages.success;
    }
    else
    {
        return statusMessages.badRequest;
    }
}

export async function unresolveTicket (ticket_id, unresolving_user)
{
    let ticket = await getTicket(ticket_id);
    if (ticket == null)
    {
        return statusMessages.doesNotExist;
    }
    else if (unresolving_user == null)
    {
        return statusMessages.unauthorized;
    }
    else if (ticket.time_resolved == null)
    {
        return statusMessages.badRequest;
    }
    else if (ticket.claimant.user_id == unresolving_user.user_id || ticket.author.user_id == unresolving_user.user_id)
    {
        if (ticket.author.currently_opened_ticket_id)
        {
            console.log("This is a very niche circumstance so I'll say what happened here: A mentor tried to unresolve a resolved ticket but the original author already has an currently opened ticket so the ticket cannot be unresolved.");
            return statusMessages.badRequest
        }
        if (ticket.claimant.currently_claimed_ticket_id)
        {
            return statusMessages.badRequest
        }
        ticket.time_resolved = null;
        ticket.time_last_updated = () => "CURRENT_TIMESTAMP";
        ticket = await ticketRepository.save(ticket); 

        let author = await getUser(ticket.author.user_id);
        author.currently_opened_ticket_id = ticket.ticket_id;
        await userRepository.save(author);
        if (ticket.claimant)
        {
            let claimant = await getUser(ticket.claimant.user_id);
            claimant.currently_claimed_ticket_id = ticket.ticket_id;
            await userRepository.save(claimant);
        }

        return statusMessages.success;
    }
    else
    {
        return statusMessages.badRequest;
    }
}

export async function getAllUsers ()
{
    const allUsers = await userRepository.find({
        relations: {
            opened_tickets: true,
            claimed_tickets: true
        }
    });
    return allUsers;
}

export async function getMentors ()
{
    const mentors = await userRepository.find({
        where: {
            is_mentor: true
        },
        relations: {
            opened_tickets: true,
            claimed_tickets: true
        }
    });
    return mentors;
}

export async function getAdmins ()
{
    const mentors = await userRepository.find({
        where: {
            is_admin: true
        },
        relations: {
            opened_tickets: true,
            claimed_tickets: true
        }
    });
    return mentors;
}

export async function getUser (user_id)
{
    const user = await userRepository.findOne({
        where: {
            user_id: user_id
        },
        relations: {
            opened_tickets: true,
            claimed_tickets: true
        }
    });
    return user;
}

export async function getUserByEmail (email)
{
    const user = await userRepository.findOne({
        where: {
            email: email
        },
        relations: {
            opened_tickets: true,
            claimed_tickets: true
        }
    });
    return user;
}

export async function setUserAdminStatus (requestingUser, targetUser, adminStatus)
{
    if (requestingUser == null || targetUser == null)
    {
        return statusMessages.doesNotExist;
    }
    else if (requestingUser.is_admin == false)
    {
        return statusMessages.unauthorized;
    }
    else if (adminStatus == null || requestingUser.user_id == targetUser.user_id)  // One cannot change their own admin status
    {
        return statusMessages.badRequest;
    }
    else
    {
        targetUser.is_admin = adminStatus;
        if (adminStatus == true)
        {
            targetUser.is_mentor = true;
        }
        await userRepository.save(targetUser); 
        return statusMessages.success;
    }
}

export async function setUserMentorStatus (requestingUser, targetUser, mentorStatus)
{
    if (requestingUser == null || targetUser == null)
    {
        return statusMessages.doesNotExist;
    }
    else if (requestingUser.is_admin == false)
    {
        return statusMessages.unauthorized;
    }
    else if (mentorStatus == null || requestingUser.user_id == targetUser.user_id)  // One cannot change their own mentor status
    {
        return statusMessages.badRequest;
    }
    else
    {
        targetUser.is_mentor = mentorStatus;
        await userRepository.save(targetUser); 
        return statusMessages.success;
    }
}

// This should only be called with a successfully authenticated email address from the Google API call
export async function makeUser (email)
{
    const newUser = {
        email: email,
        name: email,  // TODO is there a way I can get the name associated with the email through a Google API call?
        is_admin: false,
        is_mentor: false,
        is_silenced: false,
        time_created: () => "CURRENT_TIMESTAMP",
        currently_opened_ticket_id: null,
        currently_claimed_ticket_id: null
    }
    await userRepository.save(newUser);
    return newUser;
}
