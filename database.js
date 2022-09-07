"use strict";

import "reflect-metadata";
import { EntitySchema, DataSource } from "typeorm";

import { config as dotenv_config } from "dotenv";
dotenv_config();

import pg from "pg";
export const pgPool = new pg.Pool({  // Only use this when absolutely needed, use TypeORM otherwise
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Database entities

const User = new EntitySchema ({
    name: "User",
    tableName: "users",
    columns: {
        user_id: { type: "uuid", primary: true, generated: "uuid" },
        name: { type: "text" },
        is_admin: { type: "boolean", default: "false" },
        is_mentor: { type: "boolean", default: "false" },
        is_silenced: { type: "boolean", default: "false" },
        time_created: { type: "timestamp with time zone" }
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

const Credentials = new EntitySchema ({
    name: "Credentials",
    tableName: "credentials",
    columns: {
        id: { type: "uuid", primary: true, generated: "uuid" },
        user_id: { type: "uuid" },
        provider: { type: "text" },
        subject: { type: "text", unique: true  }
    }
});

const Session = new EntitySchema ({  // Based on table.sql from connect-pg-simple
    name: "Session",
    tableName: "session",
    columns: {
        sid: { type: "text", primary: true, collation: "default" },
        sess: { type: "json" },
        expire: { type: "timestamp", precision: 6 }
    }
});

// Database DataSource

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [User, Ticket, Credentials, Session],
    synchronize: true
});

export const userRepository = AppDataSource.getRepository(User);
export const ticketRepository = AppDataSource.getRepository(Ticket);
export const credentialsRepository = AppDataSource.getRepository(Credentials);

// Functions

export async function initializeDatabase ()
{
    await AppDataSource.initialize();
    await AppDataSource.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")');
}

export async function putTicket (ticket, author)
{
    author.opened_tickets.push(ticket);
    await userRepository.save(author);
    await ticketRepository.save(ticket);
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

export async function getActiveTickets ()
{
    const activeTickets = await ticketRepository.find({
        where: {
            time_claimed: null
        },
        relations: {
            author: true,
            claimant: true
        }
    });
    return activeTickets;
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
    const ticket = await getTicket(ticket_id);
    if (ticket == null)
    {
        return false;
    }
    else
    {
        ticket.claimant = claimant;
        ticket.time_claimed = () => "CURRENT_TIMESTAMP";
        await ticketRepository.save(ticket); 
        return true;
    }
}

export async function unclaimTicket (ticket_id, claimant)
{
    const ticket = await getTicket(ticket_id);
    if (ticket == null)
    {
        return false;
    }
    else
    {
        if (ticket.claimant.user_id == claimant.user_id)
        {
            ticket.claimant = null;
            ticket.time_claimed = null;
            await ticketRepository.save(ticket); 
            return true;
        }
        return false;
    }
}

export async function resolveTicket (ticket_id, claimant)
{
    const ticket = await getTicket(ticket_id);
    if (ticket == null)
    {
        return false;
    }
    else
    {
        if (ticket.claimant.user_id == claimant.user_id)
        {
            ticket.time_resolved = () => "CURRENT_TIMESTAMP";
            await ticketRepository.save(ticket); 
            return true;
        }
        return false;
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

export async function setUserAdminStatus (user_id, status)
{
    const user = await getUser(user_id);
    if (user == null)
    {
        return false;
    }
    else
    {
        user.is_admin = status;
        if (status == true)
        {
            user.is_mentor = true;
        }
        await userRepository.save(user); 
        return true;
    }
}

export async function setUserMentorStatus (user_id, status)
{
    const user = await getUser(user_id);
    if (user == null)
    {
        return false;
    }
    else
    {
        user.is_mentor = status;
        await userRepository.save(user); 
        return true;
    }
}
