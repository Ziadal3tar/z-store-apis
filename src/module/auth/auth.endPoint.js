import { roles } from "../../middleware/auth.js";
export const endPoints = {
    updateRole:[roles.Admin],
    removeRole:[roles.Admin],
    addAdmin:[roles.Admin],
    user:[roles.User, roles.Admin],
    manageUsers:[roles.Admin],
}