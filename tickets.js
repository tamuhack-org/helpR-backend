"use strict";

export function makeFromRequest(request, author)
{
    const ticket_request = request.body;

    if (ticket_request.description && typeof ticket_request.description === "string" && ticket_request.description.length <= 60 &&
        ticket_request.location && typeof ticket_request.location === "string" && ticket_request.location.length <= 60 &&
        ticket_request.contact && typeof ticket_request.contact === "string" && ticket_request.contact.length <= 60 &&
        author)
    {

        const ticket_object = {
            time_opened: () => "CURRENT_TIMESTAMP",
            time_claimed: null,
            time_resolved: null,
            description: ticket_request.description,
            location: ticket_request.location,
            contact: ticket_request.contact,
            review_description: null,
            review_stars: null,
            author: author,
            claimant: null
        }

        return ticket_object;
    }
    
    return null;
}
