const { Client } = require( 'whatsapp-web.js' );
const QRCode = require('qrcode')
import * as http from 'http';
import * as WebSocket from 'ws';
import { messageType } from '../models/whatsapp.model';
import WAWebJS = require( 'whatsapp-web.js' );
import { firestore } from '../firebase'
import firebase from "firebase-admin";



export class WhatsappClient {
    
    client = new Client( {
        qrRefreshIntervalMs: 2000,
        qrTimeoutMs: 4500,
        restartOnAuthFail: false,
        takeoverTimeoutMs: 5000,
        takeoverOnConflict: true,
    } );
    constructor( ){}
    
    
    
    public contection(server:http.Server, path: string   ) {
        const wss = new WebSocket.Server({server, path}) 
        
        wss.on( 'connection', async ( ws: WebSocket, req ) => {
            const params = req.url ? req.url.split( '?' )[ 1 ] : null
            

            // Validate URL
            if ( !params ) { 
                console.log( 'Connection invalid' )
                ws.send('DISSCONECTED')
                ws.onclose = () =>{console.log('Connection closed')}
                ws.close()
            } else {
                
                const projectId = params.split( '=' )[ 1 ]
                console.log( 'Connecting: '+ projectId )
                const agentsQuery = await firestore
                    .collectionGroup( 'agentes' )
                    .where( 'projectId', '==', projectId )
                    .get()
                

                
                // Validate agent
                if ( agentsQuery.empty ) {
                    console.log( 'Agent not found' )
                    ws.send('DISSCONECTED')
                    ws.onclose = () =>{console.log('Connection closed')}
                    ws.close()
                } else {

                    const projectPath = agentsQuery.docs[ 0 ].ref.path
                    const whatsappRef = firestore.doc( `${projectPath}/integraciones/whatsapp` )
                    const whatsappDoc = await whatsappRef.get()
                    
                    
                    
                    // Validate session
                    const session = whatsappDoc.exists ? 
                        whatsappDoc.data()[ 'session' ] ? whatsappDoc.data()[ 'session' ] : null
                        : null
                    console.log( session )
                    const client = new Client( {
                        session: session,
                        qrTimeoutMs: 30000,
                        restartOnAuthFail: false,
                        takeoverTimeoutMs: 5000,
                        takeoverOnConflict: true,
                    } );
            
            
            
                    client.initialize();
                
                
                    let qrCant = 0
                    client.on( 'qr', ( qr: string ) => {
                        qrCant += 1, console.log( qrCant )
                        // Generate and scan this code with your phone

                        
                        if ( qrCant === 4 ) {
                            client.destroy()
                            ws.onclose = () => { console.error( 'max qr events emited' ) }
                            ws.close()
                            
                            
                        } else {
                            if ( qrCant === 1 && !whatsappDoc.exists ) whatsappRef.set( { status: 'DISSCONECTED' } ) 
                            
                            console.log( 'QR RECEIVED', qr );
                            QRCode.toString( qr, { type: 'terminal' },
                                ( err: any, url: string ) => { console.log( url ) }
                            )
                            whatsappRef.update( { qr } ) 
                            ws.send( qr )
                            
                        }
                    } );
                
                    client.on( 'authenticated', ( session: WAWebJS.ClientSession ) => {
                        console.log( 'AUTHENTICATED', session );
                        session = session;
                        whatsappRef.update( { session } )
                        
                    } );
                
                    client.on( 'auth_failure', ( msg: string ) => {
                        // Fired if session restore was unsuccessfull
                        whatsappRef.update( {
                            session: firebase.firestore.FieldValue.delete(),
                            status: 'DISSCONECTED'
                        })
                        client.destroy();
                        ws.send( 'DISSCONECTED' )
                        ws.onclose = () => { console.error( 'AUTHENTICATION FAILURE', msg ) }
                        ws.close()
                    } );
                
                    client.on( 'ready', () => {
                        console.log( 'Client is ready!' );
                        whatsappRef.update( {
                            status: 'CONNECTED',
                            qr: firebase.firestore.FieldValue.delete()
                        })
                        ws.send( 'CONNECTED' )
                    } );
                
                    client.on( 'disconnected', ( reason: WAWebJS.WAState ) => {
                        console.log( 'Client was logged out', reason );
                        whatsappRef.update( {
                            status: 'DISSCONECTED',
                            session: firebase.firestore.FieldValue.delete()
                        } )
                        ws.send( 'DISSCONECTED' )
                        client.destroy();
                        ws.onclose = () => { console.log( `${ projectId } logout` ) }
                        ws.close()
                    } );
                
                    client.on( 'message', async ( msg: messageType ) => {
                    
                        // const chat = await msg.getChat();
                        // simulates typing in the chat
                        // chat.sendStateTyping();
                    
                        console.log( 'tipo mensaje: ', msg.type )
                        console.log( 'author: ', msg.author )
                        console.log( 'from: ', msg.from)
                        console.log( projectId + ' recibe:', msg.body )
                        console.log('\n')
                    

                    
    
                        if ( msg.body === '!STATUS' ) {
                            client.sendMessage( msg.from, `
                                *Agente conectado*
                                projectId: _${projectId}_
                            ` )
                        }





                        // stops typing or recording in the chat
                        // chat.clearState();






                        // SEND MESSAGE CONTENT 
                        // msg.reply(`
                        //     *Media info*
                        //     MimeType: ${attachmentData.mimetype}
                        //     Filename: ${attachmentData.filename}
                        //     Data (length): ${attachmentData.data.length}
                        // `);


                        // SEND LOCATION
                        //  else if (msg.body === '!location') {
                        //      msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
                        //  });


                    
                    } )
            
                }
                
            }
        } )
        

        
    
    }
}
