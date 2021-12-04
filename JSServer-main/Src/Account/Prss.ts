var Express = require('express');
import { Request, Response } from 'express'
import { queryCallback } from 'mysql';
import { Tags } from '../Validator';
import async from 'async'; //
import { Session } from "../Session";

var router = Express.Router({ caseSensitive: true }); // sub router

router.baseURL = '/Prss';


interface Person {
   id: number;
   firstName: String;
   lastName: String;
   password: String;
   role: number;
   termsAccepted: boolean;
}

interface Result {
   insertId: Number
   aftdRows: Number
}

router.get('/', function (req: Request, res: Response) {
   let email = req.query.email;

   var handler = function (err: Error, prsArr: Person[], fields: any) {
      // Removes password from the response
      for (let i = 0; i < prsArr.length; i++)
         delete prsArr[i].password;

      res.json(prsArr);
      // Assuming a connection is already there
      req.cnn.release();
   };

   if (email && req.session.isAdmin()) {
      // Using Handler as a Callback
      email += "%"; // For email prefix purposes
      req.cnn.chkQry('SELECT id, email FROM Person WHERE email LIKE ?'
         , [email], handler);
   }
   else if (req.session.isAdmin() && !email)
      req.cnn.chkQry('SELECT id, email FROM Person', null, handler);
   else if (!req.session.isAdmin() && (req.session.email.includes
      (email as string) || !email)) {
      req.cnn.chkQry('SELECT id, email FROM Person WHERE email = ?'
         , [req.session.email], handler);
   }
   else if (!req.session.isAdmin() &&
      !req.session.email.includes(email as string)) {
      req.cnn.chkQry('SELECT id, email FROM Person WHERE email = NULL'
         , null, handler);
   }
});

router.post('/', function (req: Request, res: Response) {
   var vld = req.validator;  // Shorthands
   var body = req.body; // Request Body
   var admin = req.session && req.session.isAdmin(); // Check for Admin
   var cnn = req.cnn; // Connection From Connection Pool

   // Blocking password, if admin had no password designated
   if (admin && !body.password)
      body.password = "*";
   if (!body.firstName)
      body.firstName = "";

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.hasFields(body, ["email", "password", "lastName", "role"], cb)
            && vld.rightFields(body, ["email", "firstName", "lastName",
               "password", "role", "termsAccepted"], cb) &&
            vld.chain(body.role === 0 || admin, Tags.forbiddenRole, null)
               .chain((body.termsAccepted && body.termsAccepted === true) ||
                  admin, Tags.noTerms, null)
               .chain(body.password || admin, Tags.missingField, ['password'])
               .chain(body.email, Tags.missingField, ['email'])
               .chain(body.firstName.length <= 30, Tags.badValue,
                  ['firstName'])
               .chain(body.email && body.email.length <= 150, Tags.badValue,
                  ['email'])
               .chain(body.lastName && body.lastName.length <= 50,
                  Tags.badValue, ['lastName'])
               .chain(body.password && body.password.length <= 50,
                  Tags.badValue, ['password'])
               .check(body.role >= 0 && body.role < 2, Tags.badValue, ["role"],
                  cb)) {
            cnn.chkQry('SELECT * FROM Person WHERE email = ?', body.email, cb)
         }
      },
      function (existingPrss: Person[], fields: any, cb: queryCallback) {
         if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
            body.whenRegistered = new Date();
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.chkQry('INSERT INTO Person SET ?', body, cb);
         }
      },
      function (result: Result, fields: any, cb: Function) {
         res.location(router.baseURL + '/' + result.insertId).end();
         cb();
      }
   ],
   function (err: Error) {
      cnn.release();
   });
});

// Prss/~pattern~ (usually id number), id is matched with that pattern
router.put('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var body = req.body;
   var admin = req.session.isAdmin();
   var cnn = req.cnn;

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(parseInt(req.params.id), cb) && //
            vld.chain(!("whenRegistered" in body), Tags.forbiddenField,
               ["whenRegistered"])
               .chain(!("termsAccepted" in body), Tags.forbiddenField,
                  ["termsAccepted"])
               .chain(!("email" in body), Tags.forbiddenField, ["email"])
               .chain(!("role" in body) || body.role === 0 || admin,
                  Tags.badValue, ["role"])
               // length call on null is not allowed, so check if it exists first
               .chain(!("password" in body) || (body.password !== null &&
                  body.password !== undefined &&
                  body.password !== "") && body.password.length <= 50,
                  Tags.badValue, ["password"])
               .chain(!("lastName" in body) || (body.lastName !== null &&
                  body.lastName !== undefined &&
                  body.lastName !== "") && body.lastName.length <= 50,
                  Tags.badValue, ["lastName"])
               .check(!("firstName" in body) || (body.firstName !== null &&
                  body.firstName !== undefined
                  && body.firstName !== "") && body.firstName.length <= 30,
                  Tags.badValue, ["firstName"], cb)) {
            cnn.chkQry('SELECT * FROM Person WHERE id = ?', [req.params.id],
               cb);
         }
      },
      (prss: Person[], fields: any, cb: queryCallback) => {
         if (vld.check(Boolean(prss.length), Tags.notFound, null, cb) &&
            vld.check((body.password && body.oldPassword) || !body.password ||
               admin, Tags.noOldPwd, null, cb) &&
            vld.check(admin || body.oldPassword === prss[0].password ||
               !body.password, Tags.oldPwdMismatch, ["pwdMismatch"], cb)) {
            delete body.id;
            delete body.oldPassword;
            // actually removes these fields so that they won't be part of 
            // the sql update, setting to null or undefined is insufficient
            if (Object.keys(body).length)
               cnn.chkQry('UPDATE Person SET ? WHERE id = ?',
                  [body, req.params.id], cb);
            else
               cb(null, null, null);
            // false err, null updateResult, null fields
         }
      },
      (updateResult: any, fields: any, cb: Function) => {
         res.status(200).end();
         cb();
      }
   ],
   function (err: Error) {
      cnn.release();
   });

});

router.get('/:id', function (req: Request, res: Response) {
   var vld = req.validator;

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(parseInt(req.params.id), cb) ||
            vld.checkAdmin(cb)) {
            req.cnn.chkQry('SELECT * FROM Person WHERE id = ?',
               [req.params.id], cb);
         }
      },
      function (prsArr: Person[], fields: any, cb: Function) {
         if (vld.check(Boolean(prsArr.length), Tags.notFound, null, cb)) {
            // Delete prsArr password so that it isn't displayed
            delete prsArr[0].password;
            res.json(prsArr);
            cb();
         }
      }
   ],
   (err: Error) => {
      req.cnn.release();
   });
});

router.delete('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var prsId = req.params.id;

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkAdmin(cb)) {
            // wraps up any sessions the to-be-deleted user is occupying
            Session.dltUser(prsId);
            req.cnn.chkQry('SELECT * FROM Person WHERE id = ?', [prsId], cb);
         }
      },
      function (result: any, fields: any, cb: queryCallback) {
         if (vld.check(result.length, Tags.notFound, null, cb)) {
            req.cnn.chkQry('UPDATE Message SET numLikes = numLikes - 1 WHERE' +
               ' id IN (SELECT msgId FROM Likes WHERE prsId = ?)'
               , [prsId], cb);
         }
      },
      function (result: any, fields: any, cb: queryCallback) {
         req.cnn.chkQry('DELETE FROM Person WHERE id = ?', [prsId], cb);
         res.end();
      }
   ],
      function (err: Error) {
         req.cnn.release();
      });
});

module.exports = router;