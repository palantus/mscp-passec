"use strict"

const fs = require("fs");
const path = require("path");
const sqlite = require("sqlite3").verbose();

class Handler{

  async initFirst(){
    this.global.setup = await new Promise((r) => fs.readFile(path.join(__dirname, "setup.json"), "utf-8", (err, file) => r(JSON.parse(file))))

    if(!this.global.setup.databasefile)
      console.log('databasefile not entered in setup.json. "data.sqlite3" will be used instead')

    let dbFile = path.resolve(this.global.setup.databasefile || "data.sqlite3")

    console.log("Trying to open database file: " + dbFile)

    this.global.db = new sqlite.Database(dbFile);

    this.global.db.serialize(() => {
      if(!fs.existsSync(dbFile)) {
        console.log("Creating tables in database...");
        this.global.db.run("\
            CREATE TABLE IF NOT EXISTS PassecBuckets(\
              Id INTEGER PRIMARY KEY AUTOINCREMENT,\
              ClientId nvarchar(150),\
              Title nvarchar(100),\
              UNIQUE (ClientId))")

        this.global.db.run("\
            CREATE TABLE PassecPasswords(\
              Id INTEGER PRIMARY KEY AUTOINCREMENT,\
              BucketId INTEGER,\
              Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\
              Content varchar(1000))")
      }
    });

  }

  async getBucket(bucketId){
    return await new Promise((resolve, reject) => this.global.db.all("SELECT Content FROM PassecPasswords AS P INNER JOIN PassecBuckets AS B ON P.BucketId = B.Id WHERE B.ClientId = ?", [bucketId], (err, res) => {
      var bucket = {id: bucketId, title: "", passwords: []};
      for(let i in res)
      	bucket.passwords.push(res[i].Content);

      resolve(bucket);
    }));

  }

  async syncChanges(bucketId, passwords){
    this.global.db.serialize(() => {
			this.global.db.run("INSERT OR IGNORE INTO PassecBuckets(ClientId) VALUES(?)", bucketId);

			for(var i = 0; i < passwords.length; i++){
        this.global.db.run("INSERT INTO PassecPasswords(BucketId, Content) VALUES((SELECT Id FROM PassecBuckets WHERE ClientId = ?), ?);", bucketId, passwords[i]);
			}
    });
  }
}

module.exports = Handler
