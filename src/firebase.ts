import * as admin from "firebase-admin";
import serviceAccount from "./secret/main-agentesmart-589511385b0d.json";

export const ACCOUNT: any = serviceAccount;


export class Firebase {
    public auth: admin.app.App;
    
    constructor () {
        this.auth = admin.initializeApp({
            credential: admin.credential.cert(ACCOUNT),
			databaseURL: "https://main-agentesmart.firebaseio.com",
		});
    }
    
    
}


export const firestore = new Firebase().auth.firestore()