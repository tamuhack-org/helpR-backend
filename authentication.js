"use strict";

import * as db from "./database.js";
import axios from "axios";

export async function getOrMakeUser (request)
{
    if (request.headers && request.headers.authorization && request.headers.authorization.startsWith("Basic "))
    {
        const token = request.headers.authorization.split("Basic ")[1];
        const tokenCheckUrl = "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + token;
        
        const response = await axios.get(tokenCheckUrl);
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
