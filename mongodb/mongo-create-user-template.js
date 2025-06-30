/// JS script for adding user. Run it via exec or mount it as docker volume `./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro` ///

db = db.getSiblingDB("MONGODB_DATABASE_NAME");

db.createUser({
  user: "{{MONGODB_DATABASE_USER}}",
  pwd: "{{MONGODB_DATABASE_PASSWORD}}",
  roles: [
    {
      role: "readWrite",
      db: "mydatabase",
    },
  ],
});
