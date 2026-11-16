export interface SignalPayload {
  to: string;
  from?: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
}

export interface JoinPayload {
  roomId: string;
  userName?: string;
}

export interface RoomPeer {
  socketId: string;
  userName?: string;
}
