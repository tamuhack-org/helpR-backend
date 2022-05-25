"use strict";

export function makeFromRequest(request)
{
    const ticket_request = request.body;

    if (ticket_request.description && typeof ticket_request.description === "string" && ticket_request.description.length <= 200 &&
        ticket_request.location && typeof ticket_request.location === "string" && ticket_request.location.length <= 200 &&
        ticket_request.contact && typeof ticket_request.contact === "string" && ticket_request.contact.length <= 200)
    {
        // TODO replace this with actual functionality once authentication works
        const temp_userId = 12345;

        const ticket_object = {
            user_id: temp_userId,
            time_opened: Date.now(),
            time_claimed: null,
            time_resolved: null,
            description: ticket_request.description,
            location: ticket_request.location,
            contact: ticket_request.contact,
            claimant_user_id: null,
            review_description: null,
            review_stars: null
        };

        return ticket_object;
    }
    
    return null;
}
