"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require('express');
const Validator_1 = require("../Validator");
const Session_1 = require("../Session");
const async_1 = __importDefault(require("async"));
var router = Express.Router({ caseSensitive: true });
router.baseURL = '/Cnvs';
router.get('/', function (req, res) {
    let owner = req.query.owner;
    if (owner) {
        req.cnn.chkQry('SELECT * FROM Conversation WHERE ownerId = ?', [owner], function (err, cnvs) {
            if (!err)
                res.json(cnvs);
            req.cnn.release();
        });
    }
    else {
        req.cnn.chkQry('SELECT * FROM Conversation', null, function (err, cnvs) {
            if (!err) {
                for (var idx = 0; idx < cnvs.length; idx++) {
                    cnvs[idx].lastMessage = Date.parse(cnvs[idx].lastMessage);
                }
                res.json(cnvs);
            }
            req.cnn.release();
        });
    }
});
router.post('/', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var cnn = req.cnn;
    var ssnArray = Session_1.Session.getSessionsById();
    var owner = ssnArray[ssnArray.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["title"], cb) &&
                vld.check((body.title !== "" && body.title.length <= 80), Validator_1.Tags.badValue, ["title"], cb)) {
                cnn.chkQry('SELECT * FROM Conversation WHERE title = ?', body.title, cb);
            }
        },
        function (sltdCnv, fields, cb) {
            if (vld.check(!sltdCnv.length, Validator_1.Tags.dupTitle, null, cb)) {
                cnn.chkQry('INSERT INTO Conversation SET title = ?, ownerId = ?', [body.title, owner.prsId], cb);
            }
        },
        function (insRes, fields, cb) {
            res.location(router.baseURL + '/' + insRes.insertId).end();
            cb();
        }
    ], function (err) {
        cnn.release();
    });
});
router.put('/:cnvId', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var cnn = req.cnn;
    var cnvId = req.params.cnvId;
    var ssnArray = Session_1.Session.getSessionsById();
    var owner = ssnArray[ssnArray.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["title"], cb) &&
                vld.check(body.title.length <= 80, Validator_1.Tags.badValue, ["title"], cb)) {
                cnn.chkQry('SELECT * FROM Conversation WHERE id = ?', [cnvId], cb);
            }
        },
        function (cnvs, fields, cb) {
            if (vld.checkPrsOK(cnvs[0] && cnvs[0].ownerId, cb) &&
                vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb))
                cnn.chkQry('SELECT * FROM Conversation WHERE title = ?', [body.title], cb);
        },
        function (dupTtl, fields, cb) {
            if (vld.check(!(dupTtl.length) || ((dupTtl[0].id === parseInt(cnvId))
                && (owner.prsId === dupTtl[0].ownerId)), Validator_1.Tags.dupTitle, null, cb)) {
                cnn.chkQry("UPDATE Conversation SET title = ? WHERE id = ?", [body.title, cnvId], cb);
                res.status(200).end();
            }
        }
    ], function (err) {
        cnn.release();
    });
});
router.delete('/:cnvId', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('SELECT * FROM Conversation WHERE id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb) &&
                vld.checkPrsOK(cnvs[0].ownerId, cb)) {
                cnn.chkQry('DELETE FROM Conversation WHERE id = ?', [cnvId], cb);
            }
            res.status(200).end();
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:cnvId', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('SELECT * FROM Conversation WHERE id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.check(cnvs.length > 0, Validator_1.Tags.notFound, null, null))
                res.json(cnvs[0]);
            cb(null);
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:cnvId/Msgs', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    var dateTime = parseInt(req.query.dateTime);
    var checkDate = new Date(dateTime);
    var num = req.query.num || null;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('SELECT * FROM Conversation WHERE id = ?', [cnvId], cb);
        },
        function (sltdCnv, fields, cb) {
            // Check to see if identified cnv exists
            if (vld.check(Boolean(sltdCnv.length), Validator_1.Tags.notFound, null, cb)) {
                if (num) {
                    cnn.chkQry('SELECT m.id, p.email, m.content, m.whenMade, ' +
                        'm.numLikes FROM Message m INNER JOIN Person p ON m.prsId' +
                        ' = p.id WHERE m.cnvId = ? ORDER BY m.id LIMIT ?', [cnvId, parseInt(num)], cb);
                }
                else if (dateTime) {
                    cnn.chkQry('SELECT m.id, p.email, m.content, m.whenMade, ' +
                        'm.numLikes FROM Message m INNER JOIN Person p ON m.prsId = ' +
                        'p.id WHERE whenMade >=  ? ORDER BY m.id', [checkDate], cb);
                }
                else {
                    cnn.chkQry('SELECT m.id, p.email, m.content, m.whenMade, ' +
                        'm.numLikes FROM Message m INNER JOIN Person p ON m.prsId = ' +
                        'p.id WHERE m.cnvId = ? ORDER BY m.id', [cnvId], cb);
                }
            }
        }
    ], function (err, result) {
        if (!err) {
            for (var idx = 0; idx < result.length; idx++)
                result[idx].whenMade = Date.parse(result[idx].whenMade);
            res.json(result);
        }
        cnn.release();
    });
});
router.post('/:cnvId/Msgs', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    var body = req.body;
    var ssnArray = Session_1.Session.getSessionsById();
    var owner = ssnArray[ssnArray.length - 1];
    var postTime = new Date();
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["content"], cb) &&
                vld.check(body.content.length <= 5000, Validator_1.Tags.badValue, ["content"], cb)) {
                cnn.chkQry('INSERT INTO Message SET cnvId = ?, prsId = ?, ' +
                    'whenMade = ? , content = ?, numLikes = 0', [cnvId, owner.prsId, postTime, body.content], cb);
            }
        },
        function (result, field, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
            cnn.chkQry('UPDATE Conversation SET lastMessage = ? WHERE id = ?', [postTime, cnvId], cb);
        }
    ], function (err) {
        cnn.release();
    });
});
module.exports = router;
