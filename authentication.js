"use strict";

import passport from "passport";
import GoogleStrategy from "passport-google-oidc";

import { userRepository, credentialsRepository } from "./database.js";

passport.use(new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/oauth2/redirect/google",
        scope: [ "profile" ]
    },
    async function verify (issuer, profile, callback)
    {
        const existingCredentials = await credentialsRepository.findBy({ provider: issuer, subject: profile.id });
        if (existingCredentials.length == 0)  // If credentials do not exist
        {
            const newUser = {
                name: profile.displayName,
                is_admin: false,
                opened_tickets: [],
                resolved_tickets: []
            };
            const newUserEntry = await userRepository.save(newUser);

            const id = newUserEntry.user_id;
            const newCredentials = {
                user_id: id,
                provider: issuer,
                subject: profile.id
            };
            await credentialsRepository.save(newCredentials);

            const returnUser = {
                id: id,
                name: profile.displayName
            };
            return callback(null, returnUser);
        }
        else  // If credentials exist
        {
            const user = await userRepository.findBy({ user_id: existingCredentials[0].user_id });
            if (user.length == 0)  // If user does not exist
            {
                return callback(null, false);
            }
            // If user does exist
            return callback(null, user[0]);
        }
    }
))

passport.serializeUser((user, callback) => {
    process.nextTick(() => {
        callback(null, { id: user.id, username: user.username, name: user.name });
    });
});

passport.deserializeUser((user, callback) => {
    process.nextTick(() => {
        return callback(null, user);
    });
});
