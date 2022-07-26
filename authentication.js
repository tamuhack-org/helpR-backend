"use strict";

import passport from "passport";
import GoogleStrategy from "passport-google-oidc";

import { userRepository, credentialsRepository } from "./database.js";

passport.use(new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/oauth2/redirect/google",
        scope: [ "profile" ],
        proxy: true
    },
    async function verify (issuer, profile, callback)
    {
        const existingCredentials = await credentialsRepository.findOneBy({ provider: issuer, subject: profile.id });
        if (!existingCredentials)  // If credentials do not exist
        {
            const newUser = {
                name: profile.displayName,
                is_admin: false,
                is_silenced: false,
                time_created: () => "CURRENT_TIMESTAMP"
            };
            const newUserEntry = await userRepository.save(newUser);

            const id = newUserEntry.user_id;
            const newCredentials = {
                user_id: id,
                provider: issuer,
                subject: profile.id
            };
            await credentialsRepository.save(newCredentials);

            return callback(null, id);
        }
        else  // If credentials exist
        {
            const user = await userRepository.findOneBy({ user_id: existingCredentials.user_id });
            if (!user)  // If user does not exist
            {
                return callback(null, false);
            }
            // If user does exist
            return callback(null, user.user_id);
        }
    }
))

passport.serializeUser((user_id, callback) => {
    process.nextTick(() => {
        callback(null, user_id);
    });
});

passport.deserializeUser((user_id, callback) => {
    process.nextTick(async () => {
        const user = await userRepository.findOneBy({ user_id: user_id });
        return callback(null, user);
    });
});
