const admin = require("firebase-admin");

admin.initializeApp();

Object.assign(exports, require("./telegram"));
Object.assign(exports, require("./whatsapp"));
