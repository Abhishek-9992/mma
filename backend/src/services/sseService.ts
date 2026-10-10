import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEService {
  private clients: SSEClient[] = [];

  public addClient(id: string, res: Response): void {
    this.clients.push({ id, res });
    
    // Heartbeat every 20 seconds to keep connection alive
    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (err) {
        clearInterval(keepAlive);
        this.removeClient(id);
      }
    }, 20000);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.removeClient(id);
    });
  }

  public removeClient(id: string): void {
    this.clients = this.clients.filter(c => c.id !== id);
  }

  public broadcast(eventName: string, data: any): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Handled on close
      }
    }
  }

  public getClientCount(): number {
    return this.clients.length;
  }
}

export const sseService = new SSEService();
