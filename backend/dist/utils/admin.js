"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminEmail = isAdminEmail;
exports.getEffectiveRole = getEffectiveRole;
exports.isAdminUser = isAdminUser;
function isAdminEmail(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    return adminEmails.includes(email.trim().toLowerCase());
}
function getEffectiveRole(user) {
    return user.role === 'ADMIN' || isAdminEmail(user.email) ? 'ADMIN' : user.role;
}
function isAdminUser(user) {
    return getEffectiveRole(user) === 'ADMIN';
}
