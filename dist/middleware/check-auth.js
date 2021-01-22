"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (req, res, next) {
    if (!req.session.username) {
        return res.status(401).json({ error: "Unauthorize" });
    }
    console.log(req.session.username);
    next();
});
//# sourceMappingURL=check-auth.js.map