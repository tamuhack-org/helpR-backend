"use strict";

import "reflect-metadata"
import { EntitySchema, DataSource } from "typeorm";

// Database entities

const User = new EntitySchema ({
    name: "User",
    tableName: "users",
    columns: {
        user_id: { type: "int", primary: true, generated: true },
        email: { type: "text" },
        name: { type: "text" },
        is_admin: { type: "boolean" },
        resolved_tickets: { type: "text" }
    }
})

const Ticket = new EntitySchema ({
    name: "Ticket",
    tableName: "tickets",
    columns: {
        ticket_id: { type: "integer", primary: true, generated: true },
        user_id: { type: "integer" },  // TODO make this a relation to an actual User once authentication works
        time_opened: { type: "integer" },
        time_claimed: { type: "integer", nullable: true },
        time_resolved: { type: "integer", nullable: true },
        description: { type: "text" },
        location: { type: "text" },
        contact: { type: "text" },
        claimant_user_id: { type: "integer", nullable: true },
        review_description: { type: "text", nullable: true },
        review_stars: { type: "integer", nullable: true }
    }
})

// Database DataSource

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "helpr.db",
    entities: [User, Ticket],
    synchronize: true
})

const userRepository = AppDataSource.getRepository(User)
const ticketRepository = AppDataSource.getRepository(Ticket)

// Functions

export async function putTicket (ticket)
{
    await ticketRepository.save(ticket)
}

export async function getActiveTickets ()
{
    const activeTickets = await ticketRepository.findBy({ time_claimed: null })
    return activeTickets
}
