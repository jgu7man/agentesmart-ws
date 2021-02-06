'use-strict'

const express = require( 'express' );
const app  = express();
const { Server } = require( 'ws' );
const PORT = process.env.PORT || 3000;




const INDEX = '/index.html';

const server = express()
    .use( ( req, res ) => res.send( { 
        
    }) )
    .listen( PORT, () => console.log( `Listening on ${ PORT }` ) );

const wss = new Server( { app } );

wss.on( 'connection', ( ws ) => {
    console.log( 'Client connected' );
    ws.on( 'close', () => console.log( 'Client disconnected' ) );
} );

setInterval( () => {
    wss.clients.forEach( ( client ) => {
        client.send( new Date().toTimeString() );
    } );
}, 1000 );