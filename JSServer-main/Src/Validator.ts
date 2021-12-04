import { Request, Response } from 'express'
import { Session } from './Session';
// Create a validator that draws its session from |req|, and reports

const CnnPool = require("./CnnPool");

type Error = {
   tag: string,
   params: string[]
}

export class Validator {
   // errors on |res|
   private errors: Error[]; // Array of error objects having tag and params
   private session: Session;
   private res: Response

   static Tags: {
      noLogin: string; // No active session/login
      noPermission: string; // Login lacks permission.
      missingField: string; // Field missing. Params[0] is field name
      badValue: string; // Bad field value.  Params[0] is field name
      notFound: string; // Entity not present in DB
      badLogin: string; // Email/password combination invalid
      dupEmail: string; // Email duplicates an existing email
      noTerms: string; // Acceptance of terms is required.
      forbiddenRole: string; // Cannot set to this role
      oldPwdMismatch: string; // Password change requires old password
      dupTitle: string; // Title duplicates an existing cnv title
      queryFailed: string; // Database query didn't go thru
      forbiddenField: string; // Tried to fill a field not accessible
      noOldPwd: string;  // Password change requires old password
   };

   constructor(req: Request, res: Response) {
      this.errors = [];   // Array of error objects having tag and params
      this.session = req.session;
      this.res = res;
   }
   // Check |test|.  If false, add an error with tag and possibly empty array
   // of qualifying parameters, e.g. name of missing field if tag is
   // Tags.missingField.
   //
   // Regardless, check if any errors have accumulated, and if so, close the
   // response with a 400 and a list of accumulated errors, and throw
   //  this validator as an error to |cb|, if present.  Thus,
   // |check| may be used as an "anchor test" after other tests have run w/o
   // immediately reacting to accumulated errors (e.g. checkFields and chain)
   // and it may be relied upon to close a response with an appropriate error
   // list and call an error handler (e.g. a waterfall default function),
   // leaving the caller to cover the "good" case only.
   check(test: Boolean, tag: string, params: string[], cb: Function) {
      if (!test)
         this.errors.push({ tag: tag, params: params });

      if (this.errors.length) {
         if (this.res) {
            if (this.errors[0].tag === Tags.noPermission) {
               this.res.status(403).end();
            }
            else
               this.res.status(400).json(this.errors);
            this.res = null;   // Preclude repeated closings   
         }
         if (cb)
            cb(this);
      }
      return !this.errors.length;
   };
   // Somewhat like |check|, but designed to allow several chained checks
   // in a row, finalized by a check call.
   chain(test: Boolean, tag: string, params: string[]) {
      if (!test) {
         this.errors.push({ tag: tag, params: params });
      }
      return this;
   };

   checkAdmin(cb: Function) {
      return this.check(this.session && this.session.isAdmin(),
         Tags.noPermission, null, cb);
   };
   // Validate that AU is the specified person or is an admin
   checkPrsOK(prsId: number, cb: Function) {
      let result = this.check(this.session &&
         (this.session.isAdmin() || this.session.prsId === prsId),
         Tags.noPermission, null, cb);
      return result;
   };
   // Check presence of truthy property in |obj| for all fields in fieldList
   hasFields(obj: any, fieldList: String[], cb: Function) {
      var self = this;

      fieldList.forEach(function (name: string) {
         self.chain(obj.hasOwnProperty(name) && obj[name] !== undefined
            && obj[name] !== null && obj[name] !== "", Tags.missingField,
            [name]);
      });
      return this.check(true, null, null, cb);
   };

   rightFields(obj: any, acceptedValues: String[], cb: Function) {
      var self = this;

      var body = Object.keys(obj);
      body.forEach(function (field) {
         self.chain(acceptedValues.includes(field), Tags.forbiddenField,
            [field])
      });
      return this.check(true, null, null, cb)
   }
}
// List of errors, and their corresponding resource string tags
export let Tags = {
   noLogin: "noLogin",              // No active session/login
   noPermission: "noPermission",    // Login lacks permission.
   missingField: "missingField",    // Field missing. Params[0] is field name
   badValue: "badValue",            // Bad field value.  Params[0] is field name
   notFound: "notFound",            // Entity not present in DB
   badLogin: "badLogin",            // Email/password combination invalid
   dupEmail: "dupEmail",            // Email duplicates an existing email
   noTerms: "noTerms",              // Acceptance of terms is required.
   forbiddenRole: "forbiddenRole",  // Cannot set to this role
   oldPwdMismatch: "oldPwdMismatch",// Password change requires old password
   dupTitle: "dupTitle",            // Title duplicates an existing cnv title
   queryFailed: "queryFailed",
   forbiddenField: "forbiddenField",
   noOldPwd: "noOldPwd"             // Password change requires old password
};