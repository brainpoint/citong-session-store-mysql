citong session-store-mysql库用于存储session,适配 koa-generic-session


# define table.
***
```js
app.use(session({
    store: new mysqlStore({
      host              : '',
      port              : ,
      user              : '',
      password          : '',
      database          : '',
      tablename         : '',  // store session tablename, default is '_mysql_session_store'
    }),
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 24*1000,
      rewrite: true,
      signed: true
    }
    //reconnectTimeout: 10*1000
  }));
```
