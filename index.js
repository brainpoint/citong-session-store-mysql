'use strict' ;

const co = require('co')
    , mysql = require('mysql')
    , citong = require('citong');

const FORTY_FIVE_MINUTES = 45 * 60 * 1000 ;

let getExpiresOn = function(session, ttl){
    let expiresOn = null ;
    ttl = ttl || FORTY_FIVE_MINUTES

    if(session && session.cookie && session.cookie.expires) {
        if (session.cookie.expires instanceof Date) {
            expiresOn = session.cookie.expires
        } else {
            expiresOn = new Date(session.cookie.expires)
        }
    } else {
        let now = new Date() ;
        expiresOn = new Date(now.getTime() + ttl) ;
    }
    return expiresOn
}

var MysqlStore = function (options) {
    let tablename = options.tablename || '_mysql_session_store';

    this.CREATE_STATEMENT = 'CREATE  TABLE IF NOT EXISTS `' + tablename + '` (`id` VARCHAR(255) NOT NULL, `expires` BIGINT NULL, `data` TEXT NULL, PRIMARY KEY (`id`));'
    this.GET_STATEMENT = 'SELECT * FROM `' + tablename + '` WHERE id  = ?'
    this.SET_STATEMENT ='INSERT INTO ' + tablename + '(id, expires, data) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE expires=?, data =?'
    this.DELETE_STATEMENT = 'DELETE FROM `' + tablename + '` WHERE id  = ?'
    this.CLEANUP_STATEMENT = 'DELETE FROM `' + tablename + '` WHERE expires  < ' ;
    
    let pool = null
    this.getConnection = function(){
        if(!pool) {
            pool = mysql.createPool(options) ;
        }
        return pool ;
    }

    var ctx = this;
    this.cleanup = function() {
        let now = (new Date()).valueOf();
        let connection = this.getConnection() ;
        let results = connection.query(ctx.CLEANUP_STATEMENT + now) ;
    };

    co(function*() {
        let connection = ctx.getConnection()

        for (let i = 0; i < 5; i++) {
            try {
                let result = yield citong.utils.denodeify(connection.query, connection)(ctx.CREATE_STATEMENT)
                break;
            } catch (e) {
            }
        }
        ctx.cleanup()
    }).then();

    setInterval( this.cleanup.bind(this), 15 * 60 * 1000 );
};

MysqlStore.prototype.get = function *(sid) {
    let connection = this.getConnection()
    let results = yield citong.utils.denodeify(connection.query, connection)(this.GET_STATEMENT, [sid])
    let session = null ;
    if(results && results[0] && results[0].data){
        session = JSON.parse(results[0].data);
    }
    return session
};

MysqlStore.prototype.set = function *(sid, session, ttl) {
    let expires = getExpiresOn(session, ttl).valueOf()
    let data = JSON.stringify(session);
    let connection = this.getConnection()
    let results = yield citong.utils.denodeify(connection.query, connection)(this.SET_STATEMENT, [sid, expires, data, expires, data])
    return results
};

MysqlStore.prototype.destroy = function *(sid) {
    let connection = this.getConnection()
    let results = yield citong.utils.denodeify(connection.query, connection)(this.DELETE_STATEMENT, [sid])
};

module.exports = MysqlStore;
