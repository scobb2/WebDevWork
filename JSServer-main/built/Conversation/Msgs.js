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
router.baseURL = '/Msgs';
router.get('/:msgId', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry("SELECT m.whenMade, p.email, m.numLikes, m.content FROM " +
                "Message m INNER JOIN Person p ON m.prsId = p.Id WHERE m.id = ?", [msgId], cb);
        },
        function (msgArr, fields, cb) {
            if (vld.check(Boolean(msgArr.length), Validator_1.Tags.notFound, null, cb)) {
                msgArr[0].whenMade =
                    msgArr[0].whenMade.getTime();
                res.json(msgArr[0]).end();
                cb();
            }
        }
    ], function (err) {
        req.cnn.release();
    });
});
router.post('/:msgId/Likes', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;
    var ssnArray = Session_1.Session.getSessionsById();
    var owner = ssnArray[ssnArray.length - 1];
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('SELECT * FROM Message WHERE id = ?', [msgId], cb);
        },
        function (sltdMsg, fields, cb) {
            if (vld.check(Boolean(sltdMsg.length), Validator_1.Tags.notFound, null, cb)) {
                cnn.chkQry("SELECT * FROM Likes WHERE msgId = ? && prsId = ?", [msgId, owner.prsId], cb);
            }
        },
        function (sltdLike, field, cb) {
            if (vld.check(!sltdLike.length, null, null, cb)) {
                cnn.chkQry('INSERT INTO Likes SET prsId = ?, msgId = ?', [owner.prsId, msgId], cb);
            }
        },
        function (result, fields, cb) {
            cnn.chkQry('UPDATE Message SET numLikes = numLikes + 1 WHERE id = ?', [msgId], cb);
            res.location(router.baseURL + '/' + result.insertId).end();
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:msgId/Likes', function (req, res) {
    var msgId = req.params.msgId;
    var cnn = req.cnn;
    var num = parseInt(req.query.num);
    var vld = req.validator;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('SELECT * FROM Message WHERE id = ?', [msgId, num], cb);
        },
        function (sltdMsg, fields, cb) {
            if (vld.check(Boolean(sltdMsg.length), Validator_1.Tags.notFound, null, cb)) {
                if (num) {
                    cnn.chkQry("(SELECT l.id, p.firstName, p.lastName AS lastName" +
                        " FROM Likes l INNER JOIN Person p ON l.prsId = p.id WHERE " +
                        "msgId = ? ORDER BY l.id DESC LIMIT ?) ORDER BY lastName", [msgId, num], cb);
                }
                else {
                    cnn.chkQry("SELECT l.id, p.firstName, p.lastName FROM Likes l" +
                        " INNER JOIN Person p ON l.prsId = p.id WHERE msgId = ? ORDER" +
                        " BY p.lastName", [msgId, num], cb);
                }
                ;
            }
        },
        function (likeArr, fields, cb) {
            res.json(likeArr).end();
            cb();
        }
    ], function (err) {
        cnn.release();
    });
});
module.exports = router;
