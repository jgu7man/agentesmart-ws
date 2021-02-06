import { Router, Request, Response, Express } from "express";
import { WhatsappClient } from "./scripts/wa-web";
import * as http from 'http';


export class Routes {
    router: Router;
    constructor (
        ) {
            this.router = Router();
            this.routes()
        }
        
    public routes(): void {
    }
    
    
}
    
export class Connections {
    
    
    constructor ( private app: Express ) { }
    
    public WhatsServer() {
        const server = http.createServer(this.app);
        new WhatsappClient().contection(server, '/wa-connect')
        return server
    }

}