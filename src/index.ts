import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";

const port = process.env.PORT || 8080; // Cloud Run injects PORT
const app = createApp();

app.listen(port, () => {
  console.log(`CPMS server running on http://localhost:${port}`);
});

