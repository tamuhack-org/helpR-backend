"use strict";

export function makeFromRequest(request)
{
    let ticket = request.body
    // TODO complain if there isn't a $description, $location, and $contact
    // TODO complain if description, location, or contact are too long (>50 characters)

    // TODO replace with actual functionality; this is for debugging purposes
    ticket.$userId = 12345

    ticket.$timeOpened = Date.now()


    // TODO this whole thing is redundant, remake this function once ORM is working

    const ticket_object = {
        user_id: ticket.$userId,
        time_opened: ticket.$timeOpened,
        time_claimed: null,
        time_resolved: null,
        description: ticket.$description,
        location: ticket.$location,
        contact: ticket.$contact,
        claimant_user_id: null,
        review_description: null,
        review_stars: null
    }

    return ticket_object
}
