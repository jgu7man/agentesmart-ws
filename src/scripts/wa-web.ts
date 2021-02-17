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
	constructor() {}

	public contection(server: http.Server, path: string) {
		const wss = new WebSocket.Server({ server, path });

		wss.on("connection", async (ws: WebSocket, req) => {
			
      try {
        // Validate URL
			  const params = await this.validateURL( req.url)
			
        // Validate project ID
				const projectId = params.split("=")[1];
				console.log("Connecting with: " + projectId);
        const agentsQuery = await this.validateProject(projectId)
        
					const projectPath = agentsQuery.docs[0].ref.path;

					// Validate payStatus
					const payStatusRef = firestore.doc(`${projectPath}/cuenta/estado`);
          const payStatusDoc = await payStatusRef.get();
          // NOTE Activar la existencia de documento para la validación de pago
					if (payStatusDoc.exists) {
						console.log("Client don't have billing permissions");
						ws.send(
							JSON.stringify({
								type: "error",
								message:
									"Tu cuenta es gratuita, por ello aún no puedes acceder a esta función, ve a la sección de cuenta para activar un plan supuerior.",
								status: "DISCONNECTED",
							})
						);
						ws.onclose = () => {
							console.log("Connection closed");
						};
						ws.close();
					} else {
						// Validate session
						const whatsappRef = firestore.doc(`${projectPath}/integraciones/whatsapp`);
						const whatsappDoc = await whatsappRef.get();
						const session = whatsappDoc.exists
							? whatsappDoc.data()["session"]
								? whatsappDoc.data()["session"]
								: null
							: null;
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
						});

						client.initialize();
						console.log(client.info ? `Connecting session to: ${client.info}` : "Waiting for QR scanning");

						let qrCant = 0;
						client.on("qr", (qr: string) => {
							qrCant += 1;
							// Generate and scan this code with your phone

							if (qrCant === 4) {
								whatsappRef.update({
                  session: firebase.firestore.FieldValue.delete(),
                  qr: firebase.firestore.FieldValue.delete(),
									status: "DISCONNECTED",
								});

                ws.send( JSON.stringify( {
                  type: 'error',
                  message: 'Se acabó el tiempo de espera de conección, vuleve a generar código', 
                  status: 'DISCONNECTED'
                }))
								client.destroy();
								ws.onclose = () => {
									console.error("max qr events emited");
								};
								ws.close();
							} else {
								if (qrCant === 1 && !whatsappDoc.exists) whatsappRef.set({ status: "DISCONNECTED" });

								console.log("QR RECEIVED", qr);
								whatsappRef.update({ qr });
								ws.send(
									JSON.stringify({
										type: "ok",
										message: "Instancia de watsapp creada, esperando conexxión",
										status: "DISCONNECTED",
									})
								);
							}
						});

						client.on("authenticated", (session: WAWebJS.ClientSession) => {
							console.log("AUTHENTICATED", session);
							session = session;
							whatsappRef.update({ session });
						});

						client.on("auth_failure", (msg: string) => {
							// Fired if session restore was unsuccessfull
							whatsappRef.update({
								session: firebase.firestore.FieldValue.delete(),
								status: "DISCONNECTED",
							});
							client.destroy();
							ws.send(JSON.stringify({
                type: "error",
                message: "No se pudo contectar con whatsapp, inténtalo de nuevo",
                status: "DISCONNECTED",
              }));
							ws.onclose = () => {
								console.error("AUTHENTICATION FAILURE", msg);
							};
							ws.close();
						});

						client.on("ready", () => {
							console.log("Client is ready!");
							whatsappRef.update({
								status: "CONNECTED",
								qr: firebase.firestore.FieldValue.delete(),
							});
							ws.send("CONNECTED");
						});

						client.on("disconnected", (reason: WAWebJS.WAState) => {
							console.log("Client was logged out", reason);
							whatsappRef.update({
								status: "DISCONNECTED",
								session: firebase.firestore.FieldValue.delete(),
							});
							ws.send(JSON.stringify({
                type: "ok",
                message: "El cliente se decidió desconectarse",
                status: "DISCONNECTED",
              }));
							client.destroy();
							ws.onclose = () => {
								console.log(`${projectId} logout`);
							};
							ws.close();
						});

						client.on("message", async (msg: messageType) => {
							// const chat = await msg.getChat();
							// simulates typing in the chat
							// chat.sendStateTyping();

							console.log("tipo mensaje: ", msg.type);
							console.log("author: ", msg.author);
							console.log("from: ", msg.from);
							console.log(projectId + " recibe:", msg.body);
							console.log("\n");

							if (msg.body === "!STATUS") {
								client.sendMessage(
									msg.from,
									`
                                    *Agente conectado*
                                    projectId: _${projectId}_
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
					}
      
      } catch ( error ) {
        console.log(error)
        ws.send(JSON.stringify({
          type: "error",
          message: error.message,
          status: "DISCONNECTED",
        }));
        ws.onclose = () => {
          console.log("Connection closed");
        };
        ws.close();
      }
      
      
			
		});
  }
  

  private async validateURL( url:string, ) {
    try {
      return url ? url.split("?")[1] : null;
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
      throw new (CustomException as any)("Agente no encontrado o no es válido" )
      } else {
        return agentsQuery
      }

  }


  
}

function CustomException(message:string) {
  const error = new Error(message);

  error.message = message;
  return error;
}

CustomException.prototype = Object.create(Error.prototype)