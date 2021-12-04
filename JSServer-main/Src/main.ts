import express from 'express';
import { Response, Request } from 'express';
import path from 'path';
import async from 'async';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { Session } from "./Session";
import { Validator } from './Validator';
import { CnnPool } from './CnnPool';
import { queryCallback } from 'mysql';

var app = express();

// Static paths to be served like index.html and all client side js
app.use(express.static(path.join(__dirname, 'public')));

// Partially complete handler for CORS.
app.use(function (req: Request, res: Response, next: Function) {
   console.log("Handling " + req.path + '/' + req.method);
   // 3000 is the React server, code that comes from there 
   // is allowed--listed below
   res.header("Access-Control-Allow-Origin", "http://localhost:3000");
   res.header("Access-Control-Allow-Credentials", true as unknown as string);
   res.header("Access-Control-Allow-Headers", "Content-Type");
   // 2 or 3 other headers needed (ex. location)
   // errors appear as silent ommision
   res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
   res.header("Access-Control-Expose-Headers", "Content-Type, Location");
   next();
});

// No further processing needed for options calls.
app.options("/*", function (req: Request, res: Response) {
   res.status(200).end();
});

// Parse all request bodies using JSON, yielding a req.body property
app.use(bodyParser.json()); // .use(json())??

// No messing w/db ids
app.use(function (req: Request, res: Response, next: Function) { 
   delete req.body.id; next(); });

// Parse cookie header, and attach cookies to req as req.cookies.<cookieName>
app.use(cookieParser());

// Set up Session on req if available
app.use(Session.router);

// Check general login.  If OK, add Validator to |req| and continue processing,
// otherwise respond immediately with 401 and noLogin error tag.
app.use(function (req: Request, res: Response, next: Function) {
   console.log(req.path);
   if (req.session || (req.method === 'POST' &&
      (req.path === '/Prss' || req.path === '/Ssns'))) {
      req.validator = new Validator(req, res);
      next();
   }
   // if you try to do anything but POST w/o AU, you are unauthorized
   else
      res.status(401).end();
});

// Add DB connection, as req.cnn, with smart chkQry method, to |req|
app.use(CnnPool.router);

// Load all subroutes
app.use('/Prss', require('./Account/Prss.js'));
app.use('/Ssns', require('./Account/Ssns.js'));
app.use('/Cnvs', require('./Conversation/Cnvs.js'));
app.use('/Msgs', require('./Conversation/Msgs.js'));

// Special debugging route for /DB DELETE.  Clears all table contents,
//resets all auto_increment keys to start at 1, and reinserts one admin user.
app.delete('/DB', function (req: Request, res: Response) {
   if (req.validator.checkAdmin(null)) {
      // Callbacks to clear tables
      var cbs = ["Message", "Conversation", "Person", "Likes"].map(
         table => function (cb: queryCallback) {
            req.cnn.query("DELETE FROM " + table, cb);
         }
      );

      // Callbacks to reset increment bases
      cbs = cbs.concat(["Conversation", "Message", "Person", "Likes"].map(
         table => cb => {
            req.cnn.query("ALTER TABLE " + table + " auto_increment = 1", cb);
         }));

      // Callback to reinsert admin user
      cbs.push(cb => {
         req.cnn.query('INSERT INTO Person (firstName, lastName, email,' +
            ' password, whenRegistered, role) VALUES ' +
            '("Joe", "Admin", "adm@11.com","password", NOW(), 1);', cb);
      });

      // Callback to clear sessions, release connection and return result
      cbs.push((cb: Function) => {
         Session.getAllIds().forEach((id: string) => {
            Session.findById(id).logOut();
            //
            Session.resetAll();  // reset ssnsById tracker on nuke
         });
         // need?
         var test = Session.getSessionsById();
         test.length = 0;
         // end need?
         cb();
      });

      // being passed 9 total functions from above
      async.series(cbs, (err: Error) => {
         // this is mostly the anchor function
         req.cnn.release();
         if (err)
            res.status(400).json(err);
         else
            res.status(200).end();
      });

   } else
      req.cnn.release();
});

// Anchor handler for general 404 cases.
app.use(function (req: Request, res: Response) {
   res.status(404);

   // was...
   // res.status(404).end();
   // req.cnn.release();
});

// Handler of last resort.  Send a 500 response with stacktrace as the body.
// Throwing Exceptions
app.use(function (err: Error, req: Request, res: Response, next: Function) {
   console.log("Here is the error!");
   if(!res.headersSent) {
      console.log(err.stack);
      req.cnn && req.cnn.release();
   }
});

// add argument to select port to run on
if (process.argv.includes('-p')) {
   app.listen(process.argv[3], function () {
      console.log('App Listening on Port ' + process.argv[3]);
   });
} 
else {
   app.listen(3000, function () { // default port is 3000
      console.log('App Listening on Port 3000');
   })
}