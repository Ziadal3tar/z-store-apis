import { roles } from "../../middleware/auth.js";



export const endPoints = {
    create:[roles.Admin,roles.User],
    remove:[roles.Admin,roles.User],
    search:[roles.Admin,roles.User]

}