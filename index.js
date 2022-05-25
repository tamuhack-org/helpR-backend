"use strict";

console.log("Hello, helpR!");

import { config as dotenv_config } from "dotenv";
dotenv_config();

import { initializeDatabase } from "./database.js";;
await initializeDatabase();

import "./site.js";
