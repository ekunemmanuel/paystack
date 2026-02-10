import { defineApp } from "convex/server";
import paystack from "@emmanuelapabiekun/paystack/convex.config.js";

const app = defineApp();
app.use(paystack);

export default app;
