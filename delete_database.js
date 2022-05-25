"use strict";

import { AppDataSource } from "./database.js";
await AppDataSource.initialize();
await AppDataSource.dropDatabase();
