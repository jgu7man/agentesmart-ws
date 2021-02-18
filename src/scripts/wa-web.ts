const { Client } = require("whatsapp-web.js");
// const QRCode = require('qrcode')
import * as http from "http";
import * as WebSocket from "ws";
import { messageType } from "../models/whatsapp.model";
import WAWebJS = require("whatsapp-web.js");
import { firestore } from "../firebase";
import firebase from "firebase-admin";

export class WhatsappClient {
	client = new Client({
		qrRefreshIntervalMs: 2000,
		qrTimeoutMs: 4500,
		restartOnAuthFail: false,
		takeoverTimeoutMs: 5000,
		takeoverOnConflict: true,
	});
  constructor () { }
  
  private whatsappRef:FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
  private whatsappDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
  private projectId: string

	public contection(server: http.Server, path: string) {
		const wss = new WebSocket.Server({ server, path });

		wss.on("connection", async (ws: WebSocket, req) => {
			
      try {
        await this.validateURL( req.url)
        

        const agentsQuery = await this.validateProject(this.projectId)
				const projectPath = agentsQuery.docs[0].ref.path;
      
      
        // Validate payStatus
        await this.validatePayStatus( projectPath )
        

        // Validate session
        this.whatsappRef = firestore.doc(`${projectPath}/integraciones/whatsapp`);
        this.whatsappDoc = await this.whatsappRef.get();
        
        const session = this.whatsappDoc.exists
          ? this.whatsappDoc.data()["session"]
            ? this.whatsappDoc.data()["session"]
            : null
          : null;
       

        const client = await this.createClient(session)
              client.initialize();
        
        console.log(client.info ? `Connecting session to: ${client.info}` : "Waiting for QR scanning");


						client.on("qr", (qr: string) => {
							this.qrEvents(ws, client, qr)
						});

						client.on("authenticated", (session: WAWebJS.ClientSession) => {
							console.log("AUTHENTICATED", session);
							session = session;
							this.whatsappRef.update({ session });
						});

						client.on("auth_failure", (msg: string) => {
							// Fired if session restore was unsuccessfull
							this.whatsappRef.update({
								session: firebase.firestore.FieldValue.delete(),
								status: "DISCONNECTED",
							});
              client.destroy();
              throw new (CustomException("No se pudo contectar con whatsapp, inténtalo de nuevo", 'DISCONNECT') as any)
						
						});

						client.on("ready", () => {
							console.log("Client is ready!");
							this.whatsappRef.update({
								status: "CONNECTED",
								qr: firebase.firestore.FieldValue.delete(),
							});
							ws.send("CONNECTED");
						});

						client.on("disconnected", (reason: WAWebJS.WAState) => {
							console.log("Client was logged out", reason);
							this.whatsappRef.update({
								status: "DISCONNECTED",
								session: firebase.firestore.FieldValue.delete(),
							});
              client.destroy();
							throw new (CustomException("El cliente se decidió desconectarse", 'DISCONNECT') as any)
						});

						client.on("message", async (msg: messageType) => {
							// const chat = await msg.getChat();
							// simulates typing in the chat
							// chat.sendStateTyping();

							console.log("tipo mensaje: ", msg.type);
							console.log("author: ", msg.author);
							console.log("from: ", msg.from);
							console.log(this.projectId + " recibe:", msg.body);
							console.log("\n");

							if (msg.body === "!STATUS") {
								client.sendMessage(
									msg.from,
									`
                  *Agente conectado*
                   projectId: _${this.projectId}_
                  `
								);
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
						});
					
      
      } catch ( error ) {
        console.log(error)
        this.closeSession(ws, error.message)
      }
      
      
			
		});
  }
  

  private closeSession( ws: WebSocket, message: string) {
    ws.send(JSON.stringify({
      type: "error",
      message: message,
      status: "DISCONNECTED",
    }));
    ws.onclose = () => {
      console.log("Connection closed");
    };
    ws.close();
  }

  private async validateURL( url: string, ) {
    // Validate project ID
    try {
      const params = url ? url.split( "?" )[ 1 ] : null;
      this.projectId = params.split("=")[1];
      console.log("Connecting with: " + this.projectId);
      return this.projectId
    } catch ( error ) {
      throw new Error("Conexión invalida, la ruta no contiene parámetros");      
    }
  }

  private async validateProject( projectId: string ):
    Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>> {
      // Validate project ID
     
      const agentsQuery = await firestore
        .collectionGroup("agentes")
        .where("projectId", "==", projectId)
        .get();

      // Validate agent
    if ( agentsQuery.empty ) { 
      
      let error = new Error( "Agente no encontrado o no es válido" );
      error.message = "Agente no encontrado o no es válido" 
      throw new (CustomException("Agente no encontrado o no es válido", 'UNCONNECTED' ) as any)
      } else {
        return agentsQuery
      }

  }

	
  private async validatePayStatus(projectPath: string) {
    const payStatusRef = firestore.doc(`${projectPath}/cuenta/estado`);
    const payStatusDoc = await payStatusRef.get();
    // NOTE Activar la existencia de documento para la validación de pago
    if ( payStatusDoc.exists ) {
      throw new (CustomException(
        "Tu cuenta es gratuita, por ello aún no puedes acceder a esta función, ve a la sección de cuenta para activar un plan supuerior.", 'UNCONNECTED'
      )as any)
      
    } else {
      return true
    }
  }

  private async createClient( session: any,  ) {
    try {
      
      console.log("Running session:", session ? session : "New");
      const client = new Client({
        session: session,
        qrTimeoutMs: 30000,
        restartOnAuthFail: false,
        takeoverTimeoutMs: 5000,
        takeoverOnConflict: true,
        puppeteer: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      } );
      return client
    } catch ( error ) {
      throw new (CustomException( "No se pudo crear el cliente de whatsappweb", 'UNCONNECTED' )as any)
    }
  }


  private async qrEvents(ws: WebSocket, client:WAWebJS.Client, qr:string ) {
    let qrCant = 0;
    qrCant += 1;
    // Generate and scan this code with your phone

    if (qrCant === 4) {
      this.whatsappRef.update({
        session: firebase.firestore.FieldValue.delete(),
        qr: firebase.firestore.FieldValue.delete(),
        status: "DISCONNECTED",
      });

      client.destroy();
      throw new (CustomException('Se acabó el tiempo de espera de conección, vuleve a generar código', 'DISCONNECT') as any )
      
    } else {
      if (qrCant === 1 && !this.whatsappDoc.exists) this.whatsappRef.set({ status: "DISCONNECTED" });

      console.log("QR RECEIVED", qr);
      this.whatsappRef.update({ qr });
      ws.send(
        JSON.stringify({
          type: "ok",
          message: "Instancia de watsapp creada, esperando conexxión",
          status: "DISCONNECTED",
        })
      );
    }
  }
}

function CustomException(message:string, code: ErrorCode) {
  const error = new Error(message);

	error.message = message;
	error.stack = code
  return error;
}

type ErrorCode = 'DISCONNECT' | 'UNCONNECTED' 

CustomException.prototype = Object.create(Error.prototype)