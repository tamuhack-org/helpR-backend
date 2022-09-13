"use strict";

import * as db from "./database.js";
import axios from "axios";

export async function getOrMakeUser (request)
{
    if (request.headers && request.headers.authorization && request.headers.authorization.startsWith("Basic "))
    {
        const token = request.headers.authorization.split("Basic ")[1];
        const tokenCheckUrl = "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + token;
        
        let response
        try
        {
            response = await axios.get(tokenCheckUrl);
        }
        catch (error)
        {
            console.log("Axios request failed to GET " + tokenCheckUrl);
            // TODO this *should* be temporary just to figure out what the error is
            if (error.response)
            {
                console.log("Looks like an HTTP error code was sent");
                console.log("Data:");
                console.log(error.response.data);
                console.log("Status:");
                console.log(error.response.status);
                console.log("Headers:");
                console.log(error.response.headers);
            }
            else if (error.request)
            {
                console.log("Looks like no response was received");
                console.log("Request:");
                console.log(error.request);
            }
            return null;
        }

        if (response.data && response.data.email)
        {
            let user = await db.getUserByEmail(response.data.email);

            if (user == null)
            {
                user = await db.makeUser(response.data.email);
            }
            return user;
        }
    }
    return null;
}
