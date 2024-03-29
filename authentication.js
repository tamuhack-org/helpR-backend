"use strict";

import * as db from "./database.js";
import axios from "axios";
import { AnnounceNewUser } from "./site.js";

export async function getOrMakeUser (request)  // Returns null if not authenticated
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
            return null;
        }

        if (response.data && response.data.email)
        {
            let user = await db.getUserByEmail(response.data.email);

            if (user == null)
            {
                user = await db.makeUser(response.data.email);
                AnnounceNewUser();
            }
            return user;
        }
    }
    return null;
}
