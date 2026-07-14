import { app } from "@/app/app";
import { registerRoutes } from "@/app/register-routes";

registerRoutes(app);

export default {
    fetch: app.fetch,
};
