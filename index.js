"use strict";

console.log("Hello, helpR!")

import { config as dotenv_config } from "dotenv"
dotenv_config()

import { AppDataSource } from "./database.js";
await AppDataSource.initialize()

import "./site.js"
