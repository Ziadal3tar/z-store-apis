import { roles } from '../../middleware/auth.js';
export const endPoints = { user: [roles.Admin, roles.User] };
