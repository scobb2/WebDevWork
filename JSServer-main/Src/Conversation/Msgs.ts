var Express = require('express');
import { Request, Response } from 'express'
import { Tags } from '../Validator';
import { Session } from "../Session";
import { queryCallback } from 'mysql';
import async from 'async';

var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Msgs';

interface Message {
   whenMade: Date,
   email: String,
   content: String,
   numLikes: number
}

interface Like {
   id: number,
   firstName: String,
   lastName: String
}

interface Result {
   insertId: Number
   aftdRows: Number
}

interface Person {
   id: number,
   firstName: string,
   lastName: string,
}

router.get('/:msgId', function (req: Request, res: Response) {
   var vld = req.validator;
   var msgId = req.params.msgId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry("SELECT m.whenMade, p.email, m.numLikes, m.content FROM " +
         "Message m INNER JOIN Person p ON m.prsId = p.Id WHERE m.id = ?"
            , [msgId], cb);
      },
      function (msgArr: Message[], fields: any, cb: Function) {
         if (vld.check(Boolean(msgArr.length), Tags.notFound, null, cb)) {
            (msgArr[0].whenMade as unknown as number) =
               msgArr[0].whenMade.getTime();
            res.json(msgArr[0]).end();
            cb();
         }
      }
   ],
   function (err: Error) {
      req.cnn.release();
   });
});

router.post('/:msgId/Likes', function (req: Request, res: Response) {
   var vld = req.validator;
   var msgId = req.params.msgId;
   var cnn = req.cnn;

   var ssnArray = Session.getSessionsById();
   var owner = ssnArray[ssnArray.length - 1];

   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry('SELECT * FROM Message WHERE id = ?', [msgId], cb);
      },
      function (sltdMsg: Message[], fields: any, cb: queryCallback) {
         if (vld.check(Boolean(sltdMsg.length), Tags.notFound, null, cb)) {
            cnn.chkQry("SELECT * FROM Likes WHERE msgId = ? && prsId = ?"
               , [msgId, owner.prsId], cb);
         }
      },
      function (sltdLike: Like[], field: any, cb: queryCallback) {
         if (vld.check(!sltdLike.length, null, null, cb)) {
            cnn.chkQry('INSERT INTO Likes SET prsId = ?, msgId = ?'
               , [owner.prsId, msgId], cb);
         }
      },
      function (result: Result, fields: any, cb: queryCallback) {
         cnn.chkQry('UPDATE Message SET numLikes = numLikes + 1 WHERE id = ?'
            , [msgId], cb);
         res.location(router.baseURL + '/' + result.insertId).end();
      }
   ],
   function (err: Error) {
      cnn.release();
   })
});


router.get('/:msgId/Likes', function (req: Request, res: Response) {
   var msgId = req.params.msgId;
   var cnn = req.cnn;
   var num = parseInt(req.query.num as string);
   var vld = req.validator;

   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry('SELECT * FROM Message WHERE id = ?', [msgId, num], cb);
      },
      function (sltdMsg: Message[], fields: any, cb: queryCallback) {
         if (vld.check(Boolean(sltdMsg.length), Tags.notFound, null, cb)) {
            if (num) {
               cnn.chkQry("(SELECT l.id, p.firstName, p.lastName AS lastName" +
               " FROM Likes l INNER JOIN Person p ON l.prsId = p.id WHERE " +
               "msgId = ? ORDER BY l.id DESC LIMIT ?) ORDER BY lastName"
                  , [msgId, num], cb);
            }
            else {
               cnn.chkQry("SELECT l.id, p.firstName, p.lastName FROM Likes l" +
               " INNER JOIN Person p ON l.prsId = p.id WHERE msgId = ? ORDER" +
               " BY p.lastName"
                  , [msgId, num], cb);
            };
         }
      },
      function (likeArr: Like[], fields: any, cb: Function) {
         res.json(likeArr).end();
         cb();
      }
   ],
   function (err: Error) {
      cnn.release();
   });
})

module.exports = router;