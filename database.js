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
        user_id: { type: "integer", primary: true, generated: true },
        name: { type: "text" },
        is_admin: { type: "boolean" },
        opened_tickets: { type: "integer", array: true },
        resolved_tickets: { type: "integer", array: true }
    }
});

const Ticket = new EntitySchema ({
    name: "Ticket",
    tableName: "tickets",
    columns: {
        ticket_id: { type: "integer", primary: true, generated: true },
        user_id: { type: "integer" },  // TODO make this a relation to an actual User once authentication works
        time_opened: { type: "bigint" },
        time_claimed: { type: "bigint", nullable: true },
        time_resolved: { type: "bigint", nullable: true },
        description: { type: "text" },
        location: { type: "text" },
        contact: { type: "text" },
        claimant_user_id: { type: "integer", nullable: true },
        review_description: { type: "text", nullable: true },
        review_stars: { type: "integer", nullable: true }
    }
});

const Credentials = new EntitySchema ({
    name: "Credentials",
    tableName: "credentials",
    columns: {
        id: { type: "integer", primary: true, generated: true },
        user_id: { type: "integer" },
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
        expire: { type: "timestamp", precision: 6,  }
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

export async function putTicket (ticket)
{
    await ticketRepository.save(ticket);
}

export async function getActiveTickets ()
{
    const activeTickets = await ticketRepository.findBy({ time_claimed: null });
    return activeTickets;
}
